import { parsePaginationOption, SumOption } from '../../library/search';
import Student from '../../../models/student';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../library/new-search';
import { validateInputString } from '../../../utils/validate-utils';
import StoreLevel from '../../../models/store_level';
import Agency from '../../../models/agency';
import {saveImageAndGetHash, saveImageAndGetHashList} from '../../../utils/image-utils';
import UserAction from '../user/user.service';
import LandLot from "../../../models/land_lot";
import {compareWithBlockchain} from "../../../services/blockchain/hashProcess";
import Planting from "../../../models/planting";
import Seeding from "../../../models/seeding";

const _ = require('lodash');

// eslint-disable-next-line no-unused-vars
const CODE_NOT_FOUND = 'STUDENT.ERROR.CODE_NOT_FOUND';

export const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';
  const searchModel = {
    fullName: 'string',
    code: 'string',
    birthDay: 'date-time',
    school: { _id: 'objectId' },
  };
  const poppulateObj = {
    school: { __from: 'schools' },
  };
  const validSearchOption = getSearchOption(args, searchModel);
  mergeSearchObjToPopulate(validSearchOption, poppulateObj, searchModel, args);
  const paginationOption = parsePaginationOption(args);
  // eslint-disable-next-line no-nested-ternary
  const sortOption = { [args.sortBy ? args.sortBy === '' ? defaultSortField : args.sortBy : defaultSortField]: args.sortType === 'asc' ? 1 : -1 };
  const { page, limit } = paginationOption;
  const skipOptions = limit * (page - 1);

  const [pop] = poppulate(poppulateObj);
  const query = await Student
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
    .collation({
      locale: 'vi',
      numericOrdering: true,
    });
  const total = await Student.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};

export const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      fullName,
      email,
      gender,
      school,
      // eslint-disable-next-line no-unused-vars
      birthDay,
      // eslint-disable-next-line no-unused-vars
      code,
    } = arg;

    if (validateInputString(fullName) || fullName > 80) throw new Error('CREATE.ERROR.AGENCY.NAME_INVALID');
    if (validateInputString(email)) throw new Error('CREATE.ERROR.AGENCY.EMAIL_INVALID');
    if (validateInputString(gender)) throw new Error('CREATE.ERROR.AGENCY.GENDER_INVALID');
    return {
      ...args,
    };
  };

  const {
    fullName,
      school,
    email,
    gender,
    birthDay,
    code,
    image,
  } = await validateArgs(args);
  let savedImage = {};
  if (image) {
    savedImage = await saveImageAndGetHash(image);
  }

  try {
    const newData = new Student({
      fullName,
      school,
      email,
      gender,
      birthDay,
      code,
      image: savedImage,
    });

    const data = await newData.save();
    return data;
  } catch (e) {
    throw new Error(e.message);
  }
};

export const update = async (args = {}) => {
  const data = await Student.findOne({ _id: args.studentId });
  if (!data) throw new Error('STUDENT.ERROR.NOT_FOUND');


  const listFiled = [
    'fullName',
    'school',
    'email',
    'gender',
    'birthDay',
    'code',
  ];

  listFiled.forEach((fieldName) => {
    data[fieldName] = args[fieldName] ?? data[fieldName];
  });

  if (args.image) {
    data.image = await saveImageAndGetHash(args.image);
  }

  try {
    const newData = await data.save();
    return newData;
  } catch (e) {
    throw new Error(e.message);
  }
};

export const getById = async (args = {}) => {
    const { studentId } = args;
    try {
      const result = await Student.findOne({ _id: studentId }).populate(['school']);
      return result;
    } catch (e) {
      throw new Error(e.message);
    }
};

export const removeById = async (args = {}) => {
  const data = await Student.findOne({ _id: args.studentId });
  if (!data) throw new Error('STUDENT.ERROR.NOT_FOUND');
  try {
    if (data) return await Student.findOneAndDelete({ _id: data._id });
    else throw new Error('DELETE.ERROR.CANT_DELETE_STORE_LEVEL');
  } catch (err) {
    throw new Error(err.message);
  }
};

export const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {

    if (!Array.isArray(arg) && arg.length === 0) throw new Error('DELETE.ERROR.STUDENT.STUDENT_INVALID');

    return arg;
  };

  const listRemoveData = validateArgs(args.data);

  try {
    let result = await Promise.all(listRemoveData.map(async (dataId) => {

      if (!await Student.findOneAndDelete({
        _id: dataId,
      })) return { message: 'DELETE.ERROR.STUDENT.CANNOT_DELETE', additional: dataId };
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
