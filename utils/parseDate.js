const parseDate = (str, isStr) => {
  if (str === "" || !str) {
    return null;
  }

  if (str === "상시") {
    return "always";
  }

  const str2 = str.includes("E") ? Number(str).toString() : str;

  try {
    let year, month, day;

    if (str2.includes(".")) {
      year = Number(str2.split(".")[0]);
      month = Number(str2.split(".")[1]) - 1;
      day = Number(str2.split(".")[2]);
    } else if (str2.includes("-")) {
      year = Number(str2.split("-")[0]);
      month = Number(str2.split("-")[1]) - 1;
      day = Number(str2.split("-")[2]);
    } else {
      year = Number(str2.substring(0, 4));
      month = Number(str2.substring(4, 6)) - 1;
      day = Number(str2.substring(6, 8));
    }

    year = year === NaN ? 0 : year;
    month = month === NaN ? 0 : month;
    day = day === NaN ? 1 : day;

    const result = new Date(year, month, day);

    return isStr ? result.toISOString().substring(0, 10) : result;
  } catch (err) {
    console.error(err);
    console.log(str);
  }
};

export default parseDate;
