import 'dotenv/config';

import { Bot } from "grammy";
import { Level } from 'level';
import { uniq } from 'remeda';

import { token, godId } from './config';

const bot = new Bot(token);

interface IConfig {
  chatId: number;
  bannedChanel: number[];
  bannedWord: string[];
  whiteList: number[];
}

const db = new Level('./db', {valueEncoding: 'json'});

db.open();

const configDb = db.sublevel<number, IConfig>('config', {valueEncoding: 'json'});

bot.command('start', (ctx) => ctx.reply('Hello World!'));

bot.on(':new_chat_members:me', async (ctx) => {
  const chatId = ctx.message?.chat.id;
  if(!chatId){
    return;
  }

  await configDb.put(chatId, {chatId, bannedChanel: [], bannedWord: [], whiteList: []});
});

bot
  .command('ban_channel')
  .filter(async (ctx) => {
    if(ctx.message?.chat.id === godId) {
      return true;
    }

    const chatAdministrators = await ctx.getChatAdministrators();

    return chatAdministrators.some((admin) => admin.user.id === ctx.message?.from?.id && (admin.status === 'creator' || admin.can_delete_messages));
  })
  .use(async (ctx) => {
    const chatId = ctx.message?.chat.id;
    if(!chatId) {
      return;
    }

    const replyId = ctx.message?.reply_to_message?.forward_from_chat?.id;

    if(!replyId){
      ctx.reply('Эту комманду нужно отправлять в ответ на пересланное сообщение');
      return;
    }

    const config = await configDb.get(chatId);

    
    config.bannedChanel = uniq([...config.bannedChanel, replyId]);
    
    console.log(config);

    await configDb.put(chatId, config);

    await ctx.reply('Готово');

  });

bot
  .on('message')
  .filter((ctx) => typeof ctx.message?.forward_from_chat?.id === 'number')
  .use(async(ctx) => {
    const forwardId = ctx.message?.forward_from_chat?.id;
    const chatId = ctx.message?.chat.id;

    if(!forwardId){
      return;
    }

    console.log(forwardId);
    

    const config = await configDb.get(chatId);

    console.log(config);
    

    if(!config.bannedChanel.includes(forwardId)){
      return;
    }

    try {
      await ctx.deleteMessage();
      
      ctx.reply(`${ctx.from.username ? '@' + ctx.from.username : ctx.from.first_name || ctx.from.last_name} дурачёк!`);
    } catch (error) {
      console.error(error);
      ctx.reply('Где мои права?');
    }

  });


bot.catch((err) => console.error(err));

bot.start();

bot.api.setMyCommands([
  { command: "ban_channel", description: "Ban channel" },
]);


console.log("Bot started");

process.on('SIGINT', () => db.close());
