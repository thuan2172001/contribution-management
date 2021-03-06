import Qrcode from '../../../models/qrcode';
import User from '../../../models/user';
import Role from '../../../models/role';
import ProductPlanConfig from '../product-plan/product-plan.config.json';
import ProductPlanByID from '../product-plan/product-plan.service/getById';
import { parsePaginationOption, SumOption } from '../../library/search';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../library/new-search';
import {
  CONCURRENT, NUMBER_QR_PER_PAGE, TOTAL_QR, URL_PRODUCTION,
} from '../../../environment';
import ProductPlan from '../../../models/product_plan';
import ProductPlanPacking from '../../../models/product_plan_packing';
import RoleAction from '../role/role.service';
import { removeElementInArray } from '../../../utils/removeElementInArray-ultils';

const QRPaper = require('qr-paper');
const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');

const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';
  const searchModel = {
    createdBy: { fullName: 'string' },
    activeBy: { fullName: 'string' },
    createdAt: 'date-time',
    activeAt: 'date-time',
    distributedStatus: 'string',
    distributedAt: 'date-time',
    usedAt: 'date-time',
    distributedLocation: 'string',
    type: 'string',
    _id: 'objectId-contain',
  };
  const poppulateObj = {
    createdBy: { __from: 'users' },
    activeBy: { __from: 'users' },
    productPlan: {
      __from: 'productplans',
      cleaning: { __from: 'productplancleanings' },
      seeding: {
        __from: 'seedings',
        species: { __from: 'species' },
        manager: { __from: 'users' },
        worker: { __from: 'users', __isArray: true },
        leader: { __from: 'users', __isArray: true },
      },
    },
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
  const query = await Qrcode
    .aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
    .collation({
      locale: 'vi',
      numericOrdering: true,
    });
  const total = await Qrcode.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};
const removeScope = (originScope, disableScope) => {
  for (const scope of disableScope) {
    originScope = removeElementInArray(originScope, scope);
  }

  return originScope;
};
const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { qrcodeId } = arg;

    if (!qrcodeId) throw new Error('FIND.ERROR.QRCODE.QRCODE_ID_NOT_FOUND');

    return qrcodeId;
  };

  const vQrcodeId = validateArgs(args);

  try {
    const qrcode = await Qrcode.findOne({ _id: vQrcodeId })
      .populate([
        { path: 'createdBy', select: 'fullName' },
        { path: 'activeBy', select: 'fullName' },
        { path: 'scanBy', select: 'fullName' },
        { path: 'packing' },
        {
          path: 'children',
          populate: [
            { path: 'createdBy', select: 'fullName' },
            { path: 'activeBy', select: 'fullName' },
            { path: 'scanBy', select: 'fullName' },
            { path: 'packing' },
            { path: 'species' },
          ],
        },
        {
          path: 'retailInfo.soldAt',
          select: 'name',
        },
        {
          path: 'retailInfo.soldBy',
          select: 'fullName',
        },
        {
          path: 'retailInfo.buyer',
          select: 'fullName phone',
        },
        {
          path: 'species',
        },
        {
          path: 'children',
        },
        {
          path: 'shippingHistory',
          populate: [
            {
              path: 'from.agency',
              select: ['name', 'address'],
            },
            {
              path: 'to.agency',
              select: ['name', 'address'],
            },
          ],
        },
        {
          path: 'productPlan',
          populate: [
            ProductPlanConfig.seeding,
            ProductPlanConfig.planting,
            ProductPlanConfig.harvesting,
            ProductPlanConfig.preliminaryTreatment,
            ProductPlanConfig.cleaning,
            ProductPlanConfig.packing,
            ProductPlanConfig.preservation,
            ProductPlanConfig.comment,
            ProductPlanConfig.createdBy,
          ],
        },
      ]).lean();
    if (qrcode) {
      const distributionHistory = [];
      if (qrcode && qrcode.shippingHistory && qrcode.shippingHistory.length > 0) {
        distributionHistory.push(qrcode.shippingHistory[0].from);
        for (let i = 1; i < qrcode.shippingHistory.length; i++) {
          if (qrcode.shippingHistory[0].to.time) {
            distributionHistory.push(qrcode.shippingHistory[0].to);
          }
        }
      }
      qrcode.distributionHistory = distributionHistory;
      if (qrcode && qrcode.productPlan) {
        qrcode.productPlan = await ProductPlanByID.getById({ planId: qrcode.productPlan._id });
      }

      const { userInfo } = args;

      if (userInfo === undefined) {
        const customerRole = await Role.findOne({
          name: 'Khách hàng',
        });
        const scopesRole = await RoleAction.getScopesOfRole(customerRole._id);

        return _.pick(qrcode, [...scopesRole, 'type', 'isActive', 'quantity', '_id']);
      }

      const scopesRole = await RoleAction.getScopesOfRole(userInfo.role);
      const { enable, disable } = userInfo.addedScope;

      const scopesAfterRemove = removeScope(scopesRole, disable);

      const userScopes = scopesAfterRemove.concat(enable);

      // return _.pick(qrcode, [...userScopes, 'productPlan.productplanpackings.products', 'type', 'isActive', 'quantity', 'isPacked', 'createdAt', 'updatedAt', 'scanAt', 'activeAt', 'createdBy', 'activeBy', 'activeAt', 'children']);
      return _.pick(qrcode, [...userScopes, 'productPlan', 'type', 'isActive', 'quantity', 'isPacked', 'createdAt', 'updatedAt', 'scanAt', 'activeAt', 'createdBy', 'activeBy', 'activeAt', 'children', '_id']);
    }
    throw new Error('FIND.ERROR.QRCODE.QRCODE_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};
const activeById = async (args = {}, body, user) => {
  const validateErrorPre = 'VALIDATE.ERROR.ACTIVE_QR';
  const validateArgs = (arg = {}) => {
    const { qrcodeId } = arg;
    if (!qrcodeId) throw new Error('VALIDATE.ERROR.ACTIVE_QR.QRCODE_ID_NOT_FOUND');
    return qrcodeId;
  };
  const validateBody = (body) => {
    if (!body) throw new Error(`${validateErrorPre}.MISSING_BODY`);
    if (!body.location) throw new Error(`${validateErrorPre}.MISSING_LOCATION`);
    if (!body.location.type) throw new Error(`${validateErrorPre}.MISSING_LOCATION_TYPE`);
    if (!body.location.coordinates) throw new Error(`${validateErrorPre}.MISSING_COORDINATES`);
    if (body.location.coordinates.length !== 2) throw new Error(`${validateErrorPre}.INVALID_LOCATION`);
    return body;
  };
  const vQrcodeId = validateArgs(args);
  const { location } = await validateBody(body);

  try {
    const qrcode = await Qrcode.findOne({ _id: vQrcodeId });
    if (qrcode) {
      if (qrcode.productPlan) {
        if (!qrcode.isActive) {
          qrcode.isActive = true;
          qrcode.activeAt = new Date();
          qrcode.activeBy = user;

          // Update active location cho product plan packing
          const productPlan = await ProductPlan.findOne({ _id: qrcode.productPlan }).populate('packing');
          if (!productPlan.packing.activeLocation) {
            await ProductPlanPacking.updateOne(
              { _id: productPlan.packing._id },
              { $set: { activeLocation: location } },
            );
          }
          return await qrcode.save();
        }
        throw new Error('ACTIVE.ERROR.QRCODE_IS_ACTIVATED');
      }
      throw new Error('ACTIVE.ERROR.QRCODE_IS_NOT_ASSIGNED');
    } else {
      throw new Error('ACTIVE.ERROR.QRCODE_NOT_FOUND');
    }
  } catch (e) {
    throw new Error(e.message);
  }
};

const create = async (args = {}, createdBy) => {
  const validateArgs = (arg = {}) => {
    const {
      type,
      total,
    } = arg;

    Object.keys(arg).forEach((key) => {
      if (_.isNull(arg[key]) || arg[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    if (typeof type !== 'string' || (type.length === 0 || type > 80)) throw new Error('CREATE.ERROR.QRCODE.TYPE_INVALID');
    // if (typeof total !== 'string' || typeof total !== 'number' || total <= 0) throw new Error('CREATE.ERROR.QRCODE.TOTAL_INVALID');

    return { ...arg, total: parseInt(total) };
  };

  const { type, total } = validateArgs(args);

  try {
    const userInfo = await User.findOne({
      _id: createdBy,
    });

    const content = {
      creator: `Người tạo mã: ${userInfo.fullName}`,
      creatorAt: `Ngày tạo mã: ${new Date().getUTCDate()}/${new Date().getUTCMonth() + 1}/${new Date().getUTCFullYear()}`,
      type: `Loại mã: ${type === '1' || type === '3' ? 'Sản phẩm' : 'Đóng gói'}`,
    };

    const out = path.join(__dirname, 'output');
    const createQRCode = (_type) => (new Qrcode({
      createdBy,
      type: _type === '3' ? '1' : _type,
      isActive: _type === '2',
      status: 'new',
      isPacked: false,
      enterprise: {
        name: 'UniFarm',
        taxId: '0123456789',
        address: '123 Trung Kính, Cầu Giấy',
        phone: '0961782317',
        presentedBy: 'Nguyễn Văn A',
        gln: '123456',
      },
    }));
    const createListQRCode = (number) => {
      const listQRCode = [];
      for (let i = 0; i < number; i++) {
        const newQRCode = createQRCode(type);

        listQRCode.push(newQRCode);
      }

      return listQRCode;
    };

    const _total = type === '3' ? (TOTAL_QR ? parseInt(TOTAL_QR, 10) : 10000) : total;
    const numberQRPerPage = NUMBER_QR_PER_PAGE ? parseInt(NUMBER_QR_PER_PAGE, 10) : 20;
    const totalPage = parseInt(_total / numberQRPerPage, 10) + 1;
    const numberConcurrent = CONCURRENT ? parseInt(CONCURRENT, 10) : 3;
    const qRInLastPage = _total % numberQRPerPage;

    const qrLo = new Qrcode({
      createdBy,
      type: '3',
      isActive: false,
      status: 'new',
      isPacked: false,
      distributedStatus: '1',
      enterprise: {
        name: 'UniFarm',
        taxId: '0123456789',
        address: '123 Trung Kính, Cầu Giấy',
        phone: '0961782317',
        presentedBy: 'Nguyễn Văn A',
        gln: '123456',
      },
    });

    let children = [];

    const buffers = await Promise.map(Array(totalPage), async (_empty, index) => {
      const results = await Promise
        .map(
          createListQRCode(index + 1 === totalPage ? qRInLastPage : numberQRPerPage),
          async (qrCode) => ({
            _id: (await qrCode.save())._id,
          }),
        );

      children = children.concat(results);
      return (QRPaper.print(results.filter(Boolean), {
        pathFile: out,
        info: content,
        url: URL_PRODUCTION,
      }));
    }, { concurrency: numberConcurrent });

    if (type === '3') {
      qrLo.children = children;
      await qrLo.save();
    }
    return ({
      buffers: buffers.reduce((pre, cur) => {
        pre.push(...cur);
        return pre;
      }, []).map((buffer) => Buffer.from(buffer).toString('base64')),
    });
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message);
  }
};

const updateStatus = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const {
      distributedStatus,
      distributedLocation,
    } = arg;

    Object.keys(args).forEach((key) => {
      if (_.isNull(args[key]) || args[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    if (typeof distributedStatus !== 'string' || (distributedStatus.length === 0 || distributedStatus > 80)) throw new Error('UPDATE.ERROR.QRCODE.DISTRIBUTED_STATUS_INVALID');
    if (typeof distributedLocation !== 'string' || (distributedLocation.length === 0 || distributedLocation > 80)) throw new Error('UPDATE.ERROR.QRCODE.DISTRIBUTED_LOCATION_INVALID');

    return arg;
  };

  const { qrcodeId } = args;

  const vArgs = await validateArgs(args);

  if (!qrcodeId) throw new Error('UPDATE.ERROR.QRCODE.QRCODE_ID_INVALID');

  try {
    let qrcode = await Qrcode.findOne({ _id: qrcodeId, type: '3' });
    if (!qrcode) throw new Error('UPDATE.ERROR.QRCODE.QRCODE_ID_FOUND');

    const updateStatusQR = (_qrcode, _vArgs) => {
      _qrcode.distributedStatus = _vArgs.distributedStatus || _vArgs.distributedStatus;

      if (_vArgs.distributedStatus && _vArgs.distributedStatus === '2') {
        _qrcode.distributedLocation = _vArgs.distributedLocation || _vArgs.distributedLocation;
        _qrcode.distributedAt = new Date();
      }

      if (_vArgs.distributedStatus && _vArgs.distributedStatus === '3') {
        _qrcode.usedAt = new Date();
      }

      return _qrcode;
    };
    qrcode = updateStatusQR(qrcode, vArgs);
    const { children } = qrcode;
    await Promise.map(children, async (child) => {
      let qrcodeChild = await Qrcode.findOne({ _id: child });

      qrcodeChild = updateStatusQR(qrcodeChild, vArgs);

      return qrcodeChild.save();
    });
    return await qrcode.save();
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  updateStatus,
  activeById,
};
