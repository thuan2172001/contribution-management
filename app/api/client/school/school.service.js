import { parsePaginationOption, SumOption } from '../../library/search';
import School from '../../../models/school';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../library/new-search';
import { validateInputString } from '../../../utils/validate-utils';
import StoreLevel from '../../../models/store_level';
import Agency from '../../../models/agency';
import { saveImageAndGetHashList } from '../../../utils/image-utils';
import UserAction from '../user/user.service';
import LandLot from "../../../models/land_lot";
import {compareWithBlockchain} from "../../../services/blockchain/hashProcess";
import Planting from "../../../models/planting";
import Seeding from "../../../models/seeding";

const _ = require('lodash');

// eslint-disable-next-line no-unused-vars
const CODE_NOT_FOUND = 'SCHOOL.ERROR.CODE_NOT_FOUND';

export const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';
  const searchModel = {
    fullName: 'string',
  };
  const poppulateObj = {
  };
  const validSearchOption = getSearchOption(args, searchModel);
  mergeSearchObjToPopulate(validSearchOption, poppulateObj, searchModel, args);
  const paginationOption = parsePaginationOption(args);
  // eslint-disable-next-line no-nested-ternary
  const sortOption = { [args.sortBy ? args.sortBy === '' ? defaultSortField : args.sortBy : defaultSortField]: args.sortType === 'asc' ? 1 : -1 };
  const { page, limit } = paginationOption;
  const skipOptions = limit * (page - 1);

  const [pop] = poppulate(poppulateObj);
  const query = await School
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
    .collation({
      locale: 'vi',
      numericOrdering: true,
    });
  const total = await School.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};

export const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      schoolName,
      email,
      location,
        code,
    } = arg;

    if (validateInputString(schoolName) || schoolName > 80) throw new Error('CREATE.ERROR.AGENCY.NAME_INVALID');
    if (validateInputString(email)) throw new Error('CREATE.ERROR.AGENCY.EMAIL_INVALID');
    if (validateInputString(location)) throw new Error('CREATE.ERROR.AGENCY.GENDER_INVALID');
    return {
      ...args,
    };
  };

  const {
    schoolName,
    email,
    location,
    code,
  } = await validateArgs(args);

  try {
    const newData = new School({
      schoolName,
      email,
      location,
      code,
    });

    const data = await newData.save();
    return data;
  } catch (e) {
    throw new Error(e.message);
  }
};

export const update = async (args = {}) => {
  const data = await School.findOne({ _id: args.schoolId });
  if (!data) throw new Error('SCHOOL.ERROR.NOT_FOUND');

  const listFiled = [
    'schoolName',
    'email',
    'location',
    'code',
  ];

  listFiled.forEach((fieldName) => {
    data[fieldName] = args[fieldName] ?? data[fieldName];
  });

  try {
    const newData = await data.save();
    return newData;
  } catch (e) {
    throw new Error(e.message);
  }
};

export const getById = async (args = {}) => {
    const { schoolId } = args;
    try {
      const result = await School.findOne({ _id: schoolId });
      return result;
    } catch (e) {
      throw new Error(e.message);
    }
};

export const removeById = async (args = {}) => {
  const data = await School.findOne({ _id: args.schoolId });
  if (!data) throw new Error('SCHOOL.ERROR.NOT_FOUND');
  try {
    if (data) return await School.findOneAndDelete({ _id: data._id });
    else throw new Error('DELETE.ERROR.CANT_DELETE_STORE_LEVEL');
  } catch (err) {
    throw new Error(err.message);
  }
};

export const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {

    if (!Array.isArray(arg) && arg.length === 0) throw new Error('DELETE.ERROR.SCHOOL.SCHOOL_INVALID');

    return arg;
  };

  const listRemoveData = validateArgs(args.data);

  try {
    let result = await Promise.all(listRemoveData.map(async (dataId) => {

      if (!await School.findOneAndDelete({
        _id: dataId,
      })) return { message: 'DELETE.ERROR.SCHOOL.CANNOT_DELETE', additional: dataId };
      return null;
    }));
    result = result.filter((r) => r != null);
    if (result.length > 0) {
      throw new Error(`${JSON.stringify(result)}`);
    }
    return listRemoveData;
  } catch (err) {
    throw new Error(err.message);
  }
};
