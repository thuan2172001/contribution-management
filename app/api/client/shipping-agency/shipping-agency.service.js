import { ValidateSearchArgs } from '../../library/search';
import ValidateAddress from '../../library/validateAddress';
import UserAction from '../user/user.service';
import Role from '../../../models/role';
import User from '../../../models/user';
import ShippingAgency from '../../../models/shipping_agency';
import { saveImageAndGetHash, saveImageAndGetHashList } from '../../../utils/image-utils';

const Promise = require('bluebird');
const _ = require('lodash');

const validateAddress = (args = {}) => {
  const {
    address, city, district, state,
  } = args;

  if (!address) throw new Error('FIND.ERROR.SHIPPING_AGENCY.ADDRESS_INVALID');
  if (!city) throw new Error('FIND.ERROR.SHIPPING_AGENCY.CITY_INVALID');
  if (!district) throw new Error('FIND.ERROR.SHIPPING_AGENCY.DISTRICT_INVALID');
  if (!state) throw new Error('FIND.ERROR.SHIPPING_AGENCY.STATE_INVALID');
  return args;
};

const validateUserField = async (args = {}) => {
  const {
    username, fullName, phone, email, gender, birthDay, role,
  } = args;

  if (typeof username !== 'string' || username.length === 0) throw new Error('FIND.ERROR.AGENCY.USERNAME_INVALID');
  const user = await User.findOne({
    username,
  });

  if (user) throw new Error('FIND.ERROR.AGENCY.USERNAME_IN_USE');

  if (typeof fullName !== 'string' || fullName.length === 0) throw new Error('FIND.ERROR.AGENCY.FULLNAME_INVALID');
  if (typeof phone !== 'string' || phone.length === 0) throw new Error('FIND.ERROR.AGENCY.PHONE_INVALID');
  const userPhone = await User.findOne({
    phone,
  });

  if (userPhone) throw new Error('FIND.ERROR.AGENCY.PHONE_IN_USE');
  if (typeof email !== 'string' || email.length === 0) throw new Error('FIND.ERROR.AGENCY.EMAIL_INVALID');
  const userEmail = await User.findOne({
    email,
  });

  if (userEmail) throw new Error('FIND.ERROR.AGENCY.EMAIL_IN_USE');
  if (typeof gender !== 'string' || gender.length === 0) throw new Error('FIND.ERROR.AGENCY.GENDER_INVALID');
  if (!birthDay) throw new Error('FIND.ERROR.AGENCY.BIRTHDAY_INVALID');

  try {
    const roleExist = await Role.findOne({
      _id: role._id,
    });
    if (!roleExist) throw new Error('FIND.ERROR.AGENCY.ROLE_NOT_FOUND');

    return { ...args, role: roleExist };
  } catch (e) {
    throw new Error(e.message);
  }
};

const getAll = async (args = {}) => {
  const defaultSortField = 'createdAt';

  const validFields = ['name', 'code', 'phone', 'status'];

  const {
    paginationOption,
    sortOption,
    filterOption,
  } = ValidateSearchArgs(
    args,
    validFields,
    defaultSortField,
  );

  const { page, limit } = paginationOption;
  const skipOptions = limit * (page - 1);

  const result = await ShippingAgency.find(filterOption)
    .sort(sortOption)
    .populate(['owner'])
    .skip(skipOptions)
    .limit(limit);

  const total = await ShippingAgency
    .find(filterOption)
    .sort(sortOption)
    .count({});

  return {
    data: result,
    paging: { page, limit, total },
  };
};

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { shippingAgencyId } = arg;

    if (!shippingAgencyId) throw new Error('FIND.ERROR.SHIPPING_AGENCY.SHIPPING_AGENCY_ID_NOT_FOUND');

    return shippingAgencyId;
  };

  const vShippingAgencyId = validateArgs(args);

  return ShippingAgency.findOne({ _id: vShippingAgencyId })
    .populate({
      path: 'owner',
      populate: {
        path: 'role',
      },
      populate: {
        path: 'managementUnit'
      }
    });
};

const getByCode = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { shippingAgencyCode } = arg;

    if (!shippingAgencyCode) throw new Error('FIND.ERROR.SHIPPING_AGENCY.SHIPPING_AGENCY_CODE_NOT_FOUND');

    return shippingAgencyCode;
  };

  const vShippingAgencyCode = validateArgs(args);

  return ShippingAgency.findOne({ code: vShippingAgencyCode });
};

const removeById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { shippingAgencyId } = arg;

    if (!shippingAgencyId) throw new Error('DELETE.ERROR.SHIPPING_AGENCY.SHIPPING_AGENCY_ID_NOT_FOUND');

    return shippingAgencyId;
  };

  const vShippingAgencyId = validateArgs(args);

  try {
    const shippingAgency = await ShippingAgency.findOne({ _id: vShippingAgencyId });

    if (shippingAgency) {
      await User.findOneAndDelete({
        _id: shippingAgency.owner,
      });

      return ShippingAgency.findOneAndDelete({
        _id: vShippingAgencyId,
      });
    }

    throw new Error('DELETE.ERROR.SHIPPING_AGENCY.DELETE_SHIPPING_AGENCY_ERROR');
  } catch (e) {
    throw new Error(e.message);
  }
};

const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { listShippingAgencies } = arg;

    if (!Array.isArray(listShippingAgencies) && listShippingAgencies.length === 0) throw new Error('DELETE.ERROR.SHIPPING_AGENCY.LIST_SHIPPING_AGENCY_INVALID');

    return listShippingAgencies;
  };

  const vShippingAgencies = validateArgs(args);

  console.log({ vShippingAgencies });

  try {
    let result = await Promise.map(vShippingAgencies, async (shippingAgencyId) => {
      const shippingAgency = await ShippingAgency.findOne({
        _id: shippingAgencyId,
      });

      if (shippingAgency) {
        await User.findOneAndDelete({
          _id: shippingAgency.owner,
        });

        return ShippingAgency.findOneAndDelete({
          _id: shippingAgencyId,
        });
      }

      return false;
    });

    result = result.filter(Boolean);

    if (result && result.length > 0) {
      return result;
    }

    throw new Error('DELETE.ERROR.SHIPPING_AGENCY.DELETE_SHIPPING_AGENCY_ERROR');
  } catch (e) {
    throw new Error(e.message);
  }
};

const update = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      address,
    } = arg;

    let vAgencyAddress = address;

    if (typeof address !== 'object' && !address) throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.ADDRESS_INVALID');

    vAgencyAddress = ValidateAddress(address);

    return {
      ...args, vAgencyAddress,
    };
  };

  const { shippingAgencyId } = args;

  const vArgs = await validateArgs(args);

  if (!shippingAgencyId) throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.SHIPPING_AGENCY_ID_INVALID');

  try {
    const shippingAgency = await ShippingAgency.findOne({ _id: shippingAgencyId });

    if (!shippingAgency) throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.SHIPPING_AGENCY_ID_NOTE_FOUND');

    if (vArgs.taxId) {
      if (typeof vArgs.taxId !== 'string' || (vArgs.taxId.length === 0 || vArgs.taxId.length > 80)) throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.TAX_ID_INVALID');
      const checkTaxId = await ShippingAgency.findOne({ taxId: vArgs.taxId });

      if (checkTaxId && checkTaxId._id.toString() !== shippingAgencyId) throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.TAX_ID_INVALID');
    }

    const listFiled = [
      'name',
      'phone',
      'status',
      'taxId',
    ];

    let savedImage = [];
    if (vArgs.images && vArgs.images.length > 0) {
      savedImage = await saveImageAndGetHashList(vArgs.images);
    }

    if (shippingAgency.owner._id.toString() !== vArgs.owner._id) throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.OWNER_ID_INVALID');

    let savedImageInfoUser = {};
    if (vArgs.owner.image) {
      savedImageInfoUser = await saveImageAndGetHash(vArgs.owner.image);
      vArgs.owner.image = savedImageInfoUser;
    }

    await UserAction.update({
      userId: vArgs.owner._id,
      status: '0',
      ...vArgs.owner,
    });

    listFiled.forEach((fieldName) => {
      shippingAgency[fieldName] = vArgs[fieldName] || shippingAgency[fieldName];
    });

    shippingAgency.images = savedImage || shippingAgency.images;
    shippingAgency.address = vArgs.vAgencyAddress || shippingAgency.address;

    console.log({ shippingAgency });
    const newAgency = await shippingAgency.save();
    await newAgency.populate('owner').execPopulate();

    return newAgency;
  } catch (e) {
    if (e.message.indexOf('Cast to ObjectId failed') !== -1) {
      throw new Error('UPDATE.ERROR.SHIPPING_AGENCY.UPDATE_SHIPPING_AGENCY_ERROR');
    }
    throw new Error(e.message);
  }
};

const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      name,
      phone,
      taxId,
      status,
      address,
      owner,
      images,
    } = arg;

    Object.keys(args).forEach((key) => {
      if (_.isNull(args[key]) || args[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    if (typeof name !== 'string' || (name.length === 0 || name > 80)) throw new Error('CREATE.ERROR.SHIPPING_SHIPPING_AGENCY.NAME_INVALID');
    if (typeof phone !== 'string' || name.length === 0) throw new Error('CREATE.ERROR.SHIPPING_SHIPPING_AGENCY.PHONE_INVALID');
    if (typeof taxId !== 'string' || taxId.length === 0) throw new Error('CREATE.ERROR.SHIPPING_SHIPPING_AGENCY.TAX_ID_INVALID');
    if (typeof status !== 'string' || status.length === 0) throw new Error('CREATE.ERROR.SHIPPING_SHIPPING_AGENCY.STATUS_INVALID');

    // Check TaxId
    const findShippingAgency = await ShippingAgency.findOne({
      taxId,
    });

    if (findShippingAgency) throw new Error('CREATE.ERROR.SHIPPING_AGENCY.TAX_ID_INVALID');

    const vAgencyAddress = validateAddress(address);
    console.log('validated address');
    // Check Images

    if (images) {
      if (!Array.isArray(images) || images.length === 0) {
        throw new Error('CREATE.ERROR.SHIPPING_AGENCY.IMAGES_INVALID');
      }
    }

    let vUser = await validateUserField(owner);

    vUser = {
      ...vUser,
      status: '1',
      publicKey: 'ApKXOV4ilsHdFCDISoN4so/zXQxDWtt3AiAZg5bx2oNM',
      encryptedPrivateKey: 'U2FsdGVkX1849aMg8O6GLRVrFSLd2aQI4cRaS4Ql2nZr8p+smv5O9koFn+J6EkcwaZF6u8dGb3tJEXg35q0raA==',
      issuerSignature: 'Admin System',
      issuedPublicKey: 'ApKXOV4ilsHdFCDISoN4so/zXQxDWtt3AiAZg5bx2oNM',
    };

    return {
      ...args, vAgencyAddress, vUser,
    };
  };

  const {
    name,
    vAgencyAddress,
    status,
    phone,
    taxId,
    vUser,
    images,
  } = await validateArgs(args);

  let savedImageInfo = [];
  if (images) {
    if (images.length > 0) {
      savedImageInfo = await saveImageAndGetHashList(images);

      console.log({ savedImageInfo });
    }
  }

  /**
   * Create new User
   */

  console.log('start create user');

  let savedImageInfoUser = {};
  if (vUser.images) {
    if (vUser.images.length > 0) {
      savedImageInfoUser = await saveImageAndGetHashList(vUser.images);
    }
  }

  console.log({ savedImageInfoUser });

  const newUser = new User({ ...vUser, image: savedImageInfoUser[0] });

  await newUser.save();

  try {
    const newShippingAgency = new ShippingAgency({
      name,
      phone,
      status,
      taxId,
      address: vAgencyAddress,
      owner: newUser,
      images: savedImageInfo,
    });

    return newShippingAgency.save();
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  getAll,
  getById,
  getByCode,
  create,
  update,
  remove,
  removeById,
};
