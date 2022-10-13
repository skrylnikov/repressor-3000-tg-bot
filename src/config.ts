const showError = (msg: string) => {
  throw new Error(msg)
};
  
  
export const token = process.env.TOKEN || showError('token not found in .env');
export const godId = process.env.GOD_ID || 0;
