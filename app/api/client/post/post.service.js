import { parsePaginationOption, SumOption } from '../../library/search';
import Post from '../../../models/post';
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
import {saveFileAndGetHash, saveFileAndGetHashList} from "../../../utils/upload-file-utils";

const _ = require('lodash');

// eslint-disable-next-line no-unused-vars
const CODE_NOT_FOUND = 'POST.ERROR.CODE_NOT_FOUND';

export const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';
  const searchModel = {
    faculty: 'string',
    title: 'string',
    code: 'string',
    date_upload: 'date-time',
    status: 'date-time',
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
  const query = await Post
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
    .collation({
      locale: 'vi',
      numericOrdering: true,
    });
  const total = await Post.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};

export const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      faculty,
      title,
      name,
      date_upload,
      code,
      categories,
      status,
      file,
    } = arg;

    if (validateInputString(faculty)) throw new Error('CREATE.ERROR.AGENCY.NAME_INVALID');
    if (validateInputString(title)) throw new Error('CREATE.ERROR.AGENCY.EMAIL_INVALID');
    if (validateInputString(name)) throw new Error('CREATE.ERROR.AGENCY.GENDER_INVALID');
    return {
      ...args,
    };
  };

  const {
    faculty,
    title,
    name,
    date_upload,
    code,
    categories,
    status,
    file,
  } = await validateArgs(args);
  // let savedImage = null;
  // if (image) {
  //   savedImage = await saveImageAndGetHash(image);
  // }

  let saveFile = null;
  if (file) {
    saveFile = await saveFileAndGetHash(file);
  }

  try {
    const newData = new Post({
      faculty,
      title,
      name,
      date_upload,
      code,
      categories,
      status,
      file: saveFile,
    });

    const data = await newData.save();
    return data;
  } catch (e) {
    throw new Error(e.message);
  }
};

export const update = async (args = {}) => {
  const data = await Post.findOne({ _id: args.postId });
  if (!data) throw new Error('POST.ERROR.NOT_FOUND');


  const listFiled = [
    'faculty',
    'title',
    'name',
    'date_upload',
    'code',
    'categories',
    'status',
    'file',
  ];

  listFiled.forEach((fieldName) => {
    data[fieldName] = args[fieldName] ?? data[fieldName];
  });

  // if (args.image) {
  //   data.image = await saveImageAndGetHash(args.image);
  // }

  if (args.file) {
    data.file = await saveFileAndGetHashList(args.file);
  }

  try {
    const newData = await data.save();
    return newData;
  } catch (e) {
    throw new Error(e.message);
  }
};
 
export const getById = async (args = {}) => {
    const { postId } = args;
    try {
      const result = await Post.findOne({ _id: postId });
      return result;
    } catch (e) {
      throw new Error(e.message);
    }
};

export const removeById = async (args = {}) => {
  const data = await Post.findOne({ _id: args.postId });
  if (!data) throw new Error('POST.ERROR.NOT_FOUND');
  try {
    if (data) return await Post.findOneAndDelete({ _id: data._id });
    else throw new Error('DELETE.ERROR.CANT_DELETE_STORE_LEVEL');
  } catch (err) {
    throw new Error(err.message);
  }
};

export const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {

    if (!Array.isArray(arg) && arg.length === 0) throw new Error('DELETE.ERROR.POST.POST');

    return arg;
  };

  const listRemoveData = validateArgs(args.data);

  try {
    let result = await Promise.all(listRemoveData.map(async (dataId) => {

      if (!await Post.findOneAndDelete({
        _id: dataId,
      })) return { message: 'DELETE.ERROR.POST.CANNOT_DELETE', additional: dataId };
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
