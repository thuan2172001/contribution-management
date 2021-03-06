import { SumOption } from '../../library/search';
import { searchFunction } from '../../library/new-search';
import ExportOrder from '../../../models/export_order';

const getAll = async (args = {}, user) => {
  const defaultSortField = 'createdAt';

  const searchModel = {
    buyer: { name: 'string', phone: 'string' },
    exportedBy: { _id: 'objectId' },
    createdBy: { _id: 'objectId' },
    exportAgency: { _id: 'objectId' },
    importAgency: { _id: 'objectId' },
    createdAt: 'date-time',
    exportedAt: 'date-time',
    exportType: 'string',
    status: 'string',
    _id: 'objectId-contain',
  };
  const poppulateObj = {
    exportAgency: { __from: 'agencies', __select: ['name', 'address', 'phone', 'code'] },
    importAgency: { __from: 'agencies', __select: ['name', 'address', 'phone', 'code'] },
    createdBy: { __from: 'users', __select: ['username', 'fullName', 'phone', 'code'] },
    exportedBy: { __from: 'users', __select: ['username', 'fullName', 'phone', 'code'] },
  };

  const vArgs = {
    ...args,
    'createdBy._id': user,
  };
  const {
    pop, sortOption, skipOptions, page, limit,
  } = searchFunction(vArgs, defaultSortField, searchModel, poppulateObj);

  console.log(pop);
  const query = await ExportOrder
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }]);
  const total = await ExportOrder.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};

const getById = async (args = {}, user) => {
  const validateArgs = (arg = {}) => {
    const { orderId } = arg;
    if (!orderId) throw new Error('FIND.ERROR.EXPORT_ORDER.MISSING_ORDER_ID');
    return orderId;
  };
  const vOrderId = validateArgs(args);
  try {
    const exportOrderInfo = await ExportOrder.findOne({ _id: vOrderId, createdBy: user }).populate([
      {
        path: 'exportAgency',
        select: 'name phone address shippingAddress',
      },
      {
        path: 'importAgency',
        select: 'name phone address shippingAddress',
      },
      {
        path: 'createdBy',
        select: 'fullName',
      },
      {
        path: 'shipping.shipper',
        select: 'fullName phone agency code',
      },
      {
        path: 'exportedBy',
        select: 'fullName',
      },
      {
        path: 'products',
        populate: ['species', 'packing'],
      },
    ]);
    if (exportOrderInfo) {
      return exportOrderInfo;
    }
    throw new Error('FIND.ERROR.EXPORT_ORDER.EXPORT_ORDER_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  getAll,
  getById,
};
