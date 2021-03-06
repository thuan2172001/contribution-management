const mongoose = require("mongoose");
const BasicUnit = mongoose.model("BasicUnit");
BasicUnit.createIndexes({ "$**": "text" });

const getAllBasicUnit = async (args = {}) => {
  const initArgs = (args = {}) => {
    const { page, limit, orderBy, sortBy } = args;
    const _limit = limit ? parseInt(limit) : 5;
    const _page = page ? parseInt(page) : 1;

    let sortOptions = {};
    if ((!sortBy && !orderBy) || (!sortBy && orderBy)) {
      sortOptions = {
        name: orderBy ? orderBy : 1,
      };
    } else {
      const validFields = ["name", "code", "status", "quantity"];
      const orderByTypes = orderBy ? orderBy.split(",") : [];
      const sortByFields = sortBy.split(",");
      sortByFields.map((field, index) => {
        if (field && validFields.indexOf(field) !== -1) {
          sortOptions[`${field}`] = orderByTypes[index]
            ? orderByTypes[index]
            : 1;
        } else throw new Error("Results must be sorted by valid field.");
      });
    }

    return { page: _page, limit: _limit, sortOptions };
  };

  const { page, limit, sortOptions } = initArgs(args);

  const skip = (page - 1) * limit;

  const result = await BasicUnit.find({})
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
  const total = await BasicUnit.find({}).countDocuments({});
  const total_page = parseInt(Math.ceil(total / limit));

  return { page, limit, result, total, total_page };
};

const createBasicUnit = async (args = {}) => {
  const _validateArgs = (args = {}) => {
    const { code, name, status, quantity } = args;

    if (!code) throw new Error("BASIC_UNIT.ERROR.CODE.EMPTY");
    if (!name) throw new Error("BASIC_UNIT.ERROR.NAME.EMPTY");
    if (!quantity) throw new Error("BASIC_UNIT.ERROR.QUANTITY.EMPTY");
    if (typeof status !== "number")
      throw new Error("BASIC_UNIT.ERROR.STATUS.TYPE");
    if (!status) throw new Error("BASIC_UNIT.ERROR.STATUS.EMPTY");

    return args;
  };

  const passedValue = _validateArgs(args);

  const basicUnit = new BasicUnit(passedValue);
  return await basicUnit.save();
};

const getBasicUnit = async (args = {}) => {
  const _validateArgs = (args = {}) => {
    const { code } = args;

    if (!code) throw new Error("BASIC_UNIT.ERROR.CODE.EMPTY");

    return code;
  };

  const basicUnitCode = _validateArgs(args);

  return await BasicUnit.findOne({ code: basicUnitCode });
};

const updateBasicUnit = async (args = {}) => {
  const { code } = args;
  const _validateArgs = (args = {}) => {
    const { name, status, quantity } = args;

    if (!code) throw new Error("BASIC_UNIT.ERROR.CODE.EMPTY");
    if (!name) throw new Error("BASIC_UNIT.ERROR.NAME.EMPTY");
    if (!quantity) throw new Error("BASIC_UNIT.ERROR.QUANTITY.EMPTY");
    if (typeof status !== "number")
      throw new Error("BASIC_UNIT.ERROR.STATUS.TYPE");

    return { name, status, quantity };
  };

  const passedValue = _validateArgs(args);

  return await BasicUnit.findOneAndUpdate({ code: code }, passedValue, {
    useFindAndModify: false,
  });
};

const deleteBasicUnit = async (args = {}) => {
  const _validateArgs = (args = {}) => {
    const { code } = args;

    if (!code) throw new Error("BASIC_UNIT.ERROR.CODE.EMPTY");

    return code;
  };

  const basicUnitCode = _validateArgs(args);

  return await BasicUnit.findOneAndDelete({ code: basicUnitCode });
};

const deleteManyBasicUnit = async (args = {}) => {
  const _validateArgs = (args = {}) => {
    const { arrayCode } = args;

    if (!arrayCode || arrayCode.length === 0)
      throw new Error("BASIC_UNIT.ERROR.CODE.EMPTY");

    return arrayCode;
  };

  const arrayCode = _validateArgs(args);

  arrayCode.forEach((unit) => {
    BasicUnit.findOneAndDelete({ code: unit }, (err) => {
      if (err) throw err;
    });
  });

  return {};
};

const searchBasicUnit = async (args = {}) => {
  const initArgs = (args = {}) => {
    const { page, limit, orderBy, sortBy } = args;
    const _limit = limit ? parseInt(limit) : 5;
    const _page = page ? parseInt(page) : 1;

    let sortOptions = {};

    if ((!sortBy && !orderBy) || (!sortBy && orderBy)) {
      sortOptions = {
        name: orderBy ? orderBy : 1,
      };
    } else {
      const validFields = ["name", "code", "status", "quantity"];
      const orderByTypes = orderBy ? orderBy.split(",") : [];
      const sortByFields = sortBy.split(",");
      sortByFields.map((field, index) => {
        if (field && validFields.indexOf(field) !== -1) {
          sortOptions[`${field}`] = orderByTypes[index]
            ? orderByTypes[index]
            : 1;
        } else throw new Error("Results must be sorted by valid field.");
      });
    }

    return { page: _page, limit: _limit, sortOptions };
  };

  const { page, limit } = initArgs(args);
  const searchText = args.name;
  const searchCode = args.code;
  const searchName = args.name;
  const option = args.option == 1 ? "full-text" : "normal";
  const skip = (page - 1) * limit;
  let total, result;

  if (option === "full-text") {
    total = await BasicUnit.find({
      $text: { $search: searchText },
    }).countDocuments({});
    result = await BasicUnit.find({ $text: { $search: searchText } }, null, {
      skip: skip,
      limit: limit,
    });
  } else {
    total = await BasicUnit.find({
      $and: [
        { code: { $regex: searchCode, $options: "i" } },
        { name: { $regex: searchName, $options: "i" } },
      ],
    }).countDocuments({});
    result = await BasicUnit.find(
      {
        $and: [
          { code: { $regex: searchCode, $options: "i" } },
          { name: { $regex: searchName, $options: "i" } },
        ],
      },
      null,
      {
        skip: skip,
        limit: limit,
      }
    );
  }

  const total_page = parseInt(Math.ceil(total / limit));

  return { page, limit, result, total, total_page };
};

module.exports = {
  createBasicUnit,
  getAllBasicUnit,
  getBasicUnit,
  updateBasicUnit,
  deleteBasicUnit,
  searchBasicUnit,
  deleteManyBasicUnit,
};
