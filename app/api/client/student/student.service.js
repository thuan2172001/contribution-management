import { parsePaginationOption, SumOption } from '../../library/search';
import Student from '../../../models/student';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../library/new-search';
import { validateInputString } from '../../../utils/validate-utils';
import StoreLevel from '../../../models/store_level';
import Agency from '../../../models/agency';
import { saveImageAndGetHashList } from '../../../utils/image-utils';
import UserAction from '../user/user.service';

const _ = require('lodash');

// eslint-disable-next-line no-unused-vars
const CODE_NOT_FOUND = 'STUDENT.ERROR.CODE_NOT_FOUND';

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
    email,
    gender,
    birthDay,
    code,
  } = await validateArgs(args);

  try {
    const newData = new Student({
      fullName,
      email,
      gender,
      birthDay,
      code,
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
    'email',
    'gender',
    'birthDay',
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
