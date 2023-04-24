import models from "../../models/index.js";

const Dept = models.Dept;

const checkDuplicate = async (data) => {
  const res = await Dept.findOne({
    where: {
      name: data["name"],
    },
  }).then((res) => {
    return res;
  });

  return res ? true : false;
};

export default checkDuplicate;
