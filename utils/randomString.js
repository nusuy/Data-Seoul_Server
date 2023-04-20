const randomString = (length) => {
  const chars = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`;
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const random = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(random, random + 1);
  }

  return randomString;
};

export default randomString;
