const parseOnlineApplyDate = (str) => {
  if (str === "" || !str) {
    return null;
  }
  const startDate = str.split("~")[0];
  const endDate = str.split("~")[1];

  return { startDate, endDate };
};

export default parseOnlineApplyDate;
