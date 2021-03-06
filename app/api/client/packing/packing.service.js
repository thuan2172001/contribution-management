import { parsePaginationOption, SumOption } from '../../library/search';
import Packing from '../../../models/packing';
import Species from '../../../models/species';
import ProductPlanPacking from '../../../models/product_plan_packing';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../library/new-search';

const Promise = require('bluebird');

const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';

  const searchModel = {
    species: { name: 'string', _id: 'objectId' },
    createdAt: 'date-time',
    code: 'string',
    weight: 'string',
    _id: 'objectId-contain',
  };

  const poppulateObj = {
    species: { __from: 'species' },
  };

  const validSearchOption = getSearchOption(args, searchModel);
  console.log(args, '\n', validSearchOption);
  mergeSearchObjToPopulate(validSearchOption, poppulateObj, searchModel, args);
  console.log('\n', JSON.stringify(poppulateObj));
  const paginationOption = parsePaginationOption(args);
  const { page, limit } = paginationOption;
  const skipOptions = limit * (page - 1);

  const sortOption = { [args.sortBy ? args.sortBy === '' ? defaultSortField : args.sortBy : defaultSortField]: args.sortType === 'asc' ? 1 : -1 };
  const [pop] = poppulate(poppulateObj);
  const query = await Packing
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
    .collation({
      locale: 'vi',
      numericOrdering: true,
    });
  const total = await Packing.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { packingId } = arg;
    if (!packingId) throw new Error('FIND.ERROR.PACKING.PACKING_ID_NOT_FOUND');
    return packingId;
  };
  const vPackingId = validateArgs(args);
  try {
    const result = await Packing.findOne({ _id: vPackingId }).populate(['species']);

    if (!result) {
      throw new Error('FIND.ERROR.PACKING.PACKING_ID_NOT_FOUND');
    }

    return result;
  } catch (e) {
    throw new Error(e.message);
  }
};

const removeById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { packingId } = arg;
    if (!packingId) throw new Error('FIND.ERROR.PACKING.PACKING_ID_NOT_FOUND');

    return packingId;
  };

  const vPackingId = validateArgs(args);
  try {
    const packing = await Packing.findOne({
      _id: vPackingId,
    });

    if (packing) {
      const productPlanPacking = await ProductPlanPacking.findOne({
        packing: vPackingId,
      });

      if (productPlanPacking) {
        throw new Error('DELETE.ERROR.PACKING.PACKING_IN_USE');
      }

      return Packing.findOneAndDelete({
        _id: vPackingId,
      });
    }

    throw new Error('DELETE.ERROR.PACKING.PACKING_ID_INVALID');
  } catch (e) {
    throw new Error(e.message);
  }
};

const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { listPacking } = arg;

    if (!Array.isArray(listPacking) && listPacking.length === 0) throw new Error('REMOVE.ERROR.PACKING.INVALID_LIST_PACKING');

    return listPacking;
  };

  const vPacking = validateArgs(args);

  console.log({ vPacking });
  try {
    let result = await Promise.map(vPacking, async (packingId) => {
      const packing = await Packing.findOne({
        _id: packingId,
      });

      if (packing) {
        const productPlanPacking = await ProductPlanPacking.findOne({
          packing: packingId,
        });

        if (productPlanPacking) {
          return false;
        }

        return Packing.findOneAndDelete({
          _id: packingId,
        });
      }

      return false;
    });

    result = result.filter(Boolean);

    if (result && result.length > 0) {
      return result;
    }

    throw new Error('DELETE.ERROR.PACKING.DELETE_PACKING_ERROR');
  } catch (err) {
    throw new Error(err.message);
  }
};

const update = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      species,
      weight,
      packingId,
    } = arg;
    if (typeof weight !== 'string' || weight <= 0) throw new Error('VALIDATE.ERROR.PACKING.WEIGHT_INVALID');
    const duplicateResult = await getAll({ weight, species });
    if (duplicateResult.paging.total > 0) {
      if (duplicateResult.data.some((t) => t._id.toString() !== packingId)) throw new Error('VALIDATE.ERROR.PACKING.PACKING_HAS_BEEN_USED');
      // throw new Error('VALIDATE.ERROR.PACKING.PACKING_HAS_BEEN_USED');
    }
    if (weight <= 0) {
      throw new Error('VALIDATE.ERROR.PACKING.INVALID_WEIGHT');
    }
    /// Check species exists
    if (species) {
      try {
        const specie = await Species.findOne({
          _id: species,
        });
        if (!specie) throw new Error('VALIDATE.ERROR.PACKING.SPECIES_NOT_FOUND');
      } catch (e) {
        throw new Error(e.message);
      }
    }
    return { ...args };
  };

  const { packingId } = args;

  const vArgs = await validateArgs(args);

  if (!packingId) throw new Error('VALIDATE.ERROR.PACKING.PACKING_ID_NOT_FOUND');

  try {
    const packing = await Packing.findOne({ _id: packingId });
    if (packing && packing._id) {
      const listFiled = [
        'species',
        'weight',
      ];

      listFiled.forEach((fieldName) => {
        packing[fieldName] = vArgs[fieldName] || packing[fieldName];
      });
      const savedPacking = await packing.save();
      return savedPacking;
    }
    throw new Error('FIND.ERROR.PACKING.PACKING_ID_NOT_FOUND');
  } catch (e) {
    throw new Error('SAVE.ERROR.PACKING.BAD_REQUEST');
  }
};

const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      species,
      weight,
    } = arg;
    for (const key in args) {
      if (key !== 'code' && (!args[key] || args[key] === '')) {
        throw new Error('VALIDATE.ERROR.PACKING.BAD_REQUEST');
      }
    }

    if (typeof weight !== 'string' || weight <= 0) throw new Error('VALIDATE.ERROR.PACKING.WEIGHT_INVALID');
    const duplicateResult = await getAll({ weight, species });

    if (duplicateResult.paging.total > 0) throw new Error('VALIDATE.ERROR.PACKING.PACKING_HAS_BEEN_USED');
    // Check species exists
    try {
      const specie = await Species.findOne({
        _id: species,
      });
      if (!specie) throw new Error('VALIDATE.ERROR.PACKING.SPECIES_NOT_FOUND');
    } catch (e) {
      throw new Error(e.message);
    }
    return args;
  };
  const {
    species,
    weight,
  } = await validateArgs(args);

  const newPacking = new Packing({
    species,
    weight,
  });
  try {
    console.log(newPacking);
    return await newPacking.save();
  } catch (e) {
    console.log(e);
    throw new Error('SAVE.ERROR.PACKING.BAD_REQUEST');
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  removeById,
  remove,
};
