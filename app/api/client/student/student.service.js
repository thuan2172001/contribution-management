import {parsePaginationOption, SumOption, ValidateSearchArgs} from '../../library/search';
import Student from '../../../models/student';
import {getSearchOption, mergeSearchObjToPopulate, poppulate} from "../../library/new-search";

const _ = require('lodash');

const Promise = require('bluebird');

const CODE_NOT_FOUND = 'STUDENT.ERROR.CODE_NOT_FOUND';
//
// const getByCode = async (args = {}) => {
//   const validate = (arg = {}) => {
//     const { landLotCode } = arg;
//
//     if (!landLotCode) throw new Error('FIND.ERROR.LAND_LOT.LAND_LOT_CODE_NOT_FOUND');
//
//     return landLotCode;
//   };
//
//   const vLandLotCode = validate(args);
//
//   try {
//     return LandLot.findOne({ code: vLandLotCode.toUpperCase() });
//   } catch (e) {
//     throw new Error('FIND.ERROR.LAND_LOT.LAND_LOT_CODE_NOT_FOUND');
//   }
// };

export const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';
  const searchModel = {
    fullName: 'string',
  };
  const poppulateObj = {
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
//
// const getById = async (args = {}) => {
//   const validateArgs = (arg = {}) => {
//     const { landLotId } = arg;
//
//     if (!landLotId) throw new Error(LAND_LOT_ID_NOT_FOUND);
//
//     return landLotId;
//   };
//
//   const vlandLotId = validateArgs(args);
//
//   try {
//     const result = await LandLot.findOne({ _id: vlandLotId });
//     await compareWithBlockchain(result);
//     return result;
//   } catch (e) {
//     throw new Error(e.message);
//   }
// };
//
// const removeById = async (args = {}) => {
//   const validateArgs = async (arg = {}) => {
//     const { landLotId } = arg;
//
//     if (!landLotId) throw new Error(LAND_LOT_ID_NOT_FOUND);
//
//     const planting = await Planting.findOne({
//       landLot: landLotId,
//     });
//
//     if (planting) throw new Error('DELETE.ERROR.LAND_LOT.LAND_LOT_IN_USE');
//
//     const seeding = await Seeding.findOne({
//       landLot: landLotId,
//     });
//
//     if (seeding) throw new Error('DELETE.ERROR.LAND_LOT.LAND_LOT_IN_USE');
//
//     return landLotId;
//   };
//
//   const vlandLotId = await validateArgs(args);
//
//   try {
//     const result = await LandLot.findOneAndDelete({ _id: vlandLotId });
//
//     if (result) {
//       return result;
//     }
//   } catch (err) {
//     throw new Error(err.message);
//   }
// };
//
// const remove = async (args = {}) => {
//   const validateArgs = (arg = {}) => {
//     const { listLandLot } = arg;
//
//     if (!Array.isArray(listLandLot) && listLandLot.length === 0) throw new Error('DELETE.ERROR.LAND_LOT.LAND_LOT_INVALID');
//
//     return listLandLot;
//   };
//
//   const vListLandLot = validateArgs(args);
//
//   try {
//     let result = await Promise.all(vListLandLot.map(async (landLotId) => {
//       const planting = await Planting.findOne({
//         landLot: landLotId,
//       });
//       const landLot = await getById({ landLotId });
//       if (planting) return { message: 'DELETE.ERROR.LAND_LOT.LAND_LOT_IN_USE', additional: landLot.code };
//
//       const seeding = await Seeding.findOne({
//         landLot: landLotId,
//       });
//
//       if (seeding) return { message: 'DELETE.ERROR.LAND_LOT.LAND_LOT_IN_USE', additional: landLot.code };
//
//       if (!await LandLot.findOneAndDelete({
//         _id: landLotId,
//       })) return { message: 'DELETE.ERROR.LAND_LOT.CANNOT_DELETE', additional: landLot.code };
//       return null;
//     }));
//     result = result.filter((r) => r != null);
//     if (result.length > 0) {
//       throw new Error(`${JSON.stringify(result)}`);
//     }
//     return vListLandLot;
//   } catch (err) {
//     throw new Error(err.message);
//   }
// };
//
// const update = async (args = {}) => {
//   const { landLotId } = args;
//
//   const validateArg = (arg = {}) => {
//     const {
//       lot,
//       subLot,
//     } = arg;
//
//     Object.keys(args).forEach((key) => {
//       if (_.isNull(args[key]) || args[key] === '') {
//         throw new Error(`Property "${key}" empty/null`);
//       }
//     });
//
//     if (lot && typeof lot !== 'string') throw new Error('UPDATE.ERROR.LAND_LOT.LOT_INVALID');
//     if (subLot && typeof subLot !== 'string') throw new Error('UPDATE.ERROR.LAND_LOT.SUB_LOT_INVALID');
//
//     return args;
//   };
//
//   const vArgs = await validateArg(args);
//
//   if (!landLotId) throw new Error(LAND_LOT_ID_NOT_FOUND);
//
//   try {
//     const landLot = await LandLot.findOne({ _id: landLotId });
//
//     if (!landLot) throw new Error(LAND_LOT_ID_NOT_FOUND);
//
//     let code = '';
//     if (vArgs.lot || vArgs.subLot) {
//       const lot = vArgs.lot || landLot.lot;
//       const subLot = vArgs.subLot || landLot.subLot;
//       code = lot + subLot;
//
//       const landLotTMP = await getByCode({
//         landLotCode: code,
//       });
//
//       if (landLotTMP) {
//         throw new Error('UPDATE.ERROR.LAND_LOT.LAND_LOT_IN_USE');
//       }
//     }
//     const listFiled = [
//       'lot',
//       'subLot',
//     ];
//
//     listFiled.forEach((fieldName) => {
//       landLot[fieldName] = vArgs[fieldName] || landLot[fieldName];
//     });
//
//     landLot.code = code || landLot.code;
//
//     const saved = await landLot.save();
//     await updateToBlockchain(saved);
//     return saved;
//   } catch (e) {
//     throw new Error(e.message);
//   }
// };
//
// const create = async (args = {}) => {
//   const validateArg = async (arg = {}) => {
//     const {
//       lot,
//       subLot,
//     } = arg;
//
//     Object.keys(args).forEach((key) => {
//       if (_.isNull(args[key]) || args[key] === '') {
//         throw new Error(`Property "${key}" empty/null`);
//       }
//     });
//
//     if (typeof lot !== 'string' || lot.length === 0) throw new Error('CREATE.ERROR.LAND_LOT.LOT_INVALID');
//     if (typeof subLot !== 'string' || subLot.length === 0) throw new Error('CREATE.ERROR.LAND_LOT.SUB_LOT_INVALID');
//
//     const landLotCode = lot.toUpperCase() + subLot;
//
//     const landLot = await getByCode({
//       landLotCode,
//     });
//
//     if (landLot) {
//       throw new Error('CREATE.ERROR.LAND_LOT.LAND_LOT_IN_USE');
//     }
//
//     if (lot === subLot) throw new Error('CREATE.ERROR.LAND_LOT.SUB_LOT_AND_LOT_INVALID');
//     return args;
//   };
//   let {
//     lot,
//     subLot,
//   } = await validateArg(args);
//
//   lot = lot.toUpperCase();
//   subLot = subLot.toUpperCase();
//   const code = lot + subLot;
//
//   try {
//     const newLandLot = new LandLot({
//       lot,
//       subLot,
//       code,
//     });
//
//     const saved = await newLandLot.save();
//     console.log(saved, newLandLot);
//     await updateToBlockchain(saved);
//     return saved;
//   } catch (e) {
//     throw new Error(e.message);
//   }
// };

