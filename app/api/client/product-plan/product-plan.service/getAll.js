import ProductPlan from '../../../../models/product_plan';
import {
  parsePaginationOption,
  SumOption,
} from '../../../library/search';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../../library/new-search';

export const getAll = async (args) => {
  const defaultSortField = 'createdAt';
  const validStep = ['0', '1'];
  const validateArgs = (arg = {}) => {
    const { step } = arg;
    if (step && !validStep.includes(step)) {
      throw new Error('FIND.ERROR.INVALID_STEP');
    }
    return arg;
  };

  validateArgs(args);
  const searchModel = {
    seeding: { _id: 'objectId', code: 'string', species: { _id: 'objectId', code: 'string', barcode: 'string' } },
    planting: { code: 'string', landLot: { code: 'string' }, estimatedHarvestTime: 'date-time' },
    isMaster: 'boolean',
    step: 'number',
    process: 'string-array',
    code: 'string',
    confirmationStatus: 'string-array',
    harvesting: { code: 'string', startTime: 'date-time', endTime: 'date-time' },
  };
  const poppulateObj = {
    seeding: { __from: 'seedings', species: { __from: 'species' } },
    planting: { __from: 'plantings', species: { __from: 'species' }, landLot: { __from: 'landlots' } },
    harvesting: { __from: 'productplanharvestings' },
    preliminaryTreatment: { __from: 'productplanpreliminarytreatments' },
    cleaning: { __from: 'productplancleanings' },
    packing: { __from: 'productplanpackings', packing: { __from: 'packings' } },
    preservation: { __from: 'productplanpreserves' },
    createdBy: { __from: 'users' },
    // 'comments.createdBy': { __from: 'users' },
  };
  const validSearchOption = getSearchOption(args, searchModel);
  // console.log(args, '\n', validSearchOption);
  mergeSearchObjToPopulate(validSearchOption, poppulateObj, searchModel, args);
  // console.log('\n', JSON.stringify(poppulateObj));
  const paginationOption = parsePaginationOption(args);
  const sortOption = { [args.sortBy ? args.sortBy === '' ? defaultSortField : args.sortBy : defaultSortField]: args.sortType === 'asc' ? 1 : -1 };
  // sortOption.sortBy = args.sortBy??'_id';
  const { page, limit } = paginationOption;
  const skipOptions = limit * (page - 1);

  const [pop] = poppulate(poppulateObj);
  const query = await ProductPlan
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
    .collation({
      locale: 'vi',
      numericOrdering: true,
    });
  const total = await ProductPlan.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};
