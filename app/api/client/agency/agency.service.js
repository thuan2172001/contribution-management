import { SumOption, ValidateSearchArgs } from '../../library/search';
import Agency from '../../../models/agency';
import UserAction from '../user/user.service';
import StoreLevel from '../../../models/store_level';
import Role from '../../../models/role';
import User from '../../../models/user';
import { saveImageAndGetHashList } from '../../../utils/image-utils';
import CheckMongoId from '../../library/checkMongoId';
import ManagementUnit from '../../../models/management_unit';

const { ObjectId } = require('mongoose').Types;
const _ = require('lodash');

const Promise = require('bluebird');

const validateAddress = (args = {}) => {
  const {
    address, city, district, state,
  } = args;

  if (!address) throw new Error('FIND.ERROR.AGENCY.ADDRESS_INVALID');
  if (!city) throw new Error('FIND.ERROR.AGENCY.CITY_INVALID');
  if (!district) throw new Error('FIND.ERROR.AGENCY.DISTRICT_INVALID');
  if (!state) throw new Error('FIND.ERROR.AGENCY.STATE_INVALID');
  return args;
};

const validateUserField = async (args = {}) => {
  const {
    username, fullName, phone, email, gender, birthDay, address, role,
    managementUnit,
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

  validateAddress(address);
  try {
    if (!managementUnit || (managementUnit && !managementUnit._id)) {
      throw new Error('FIND.ERROR.AGENCY.MANAGEMENT_UNIT_INVALID');
    }
    const checkManagementUnit = await ManagementUnit.findOne({ _id: managementUnit._id });
    if (!checkManagementUnit) throw new Error('FIND.ERROR.AGENCY.MANAGEMENT_UNIT_NOT_FOUND');

    if (!role || (role && !role._id)) {
      throw new Error('FIND.ERROR.AGENCY.ROLE_IN_VALID');
    }
    const roleExist = await Role.findOne({
      _id: role._id,
    });
    if (!roleExist) throw new Error('FIND.ERROR.AGENCY.ROLE_NOT_FOUND');
    if (managementUnit) {
      if (roleExist.managementUnit.toString() !== managementUnit._id) throw new Error('CREATE.ERROR.USER.ROLE_INVALID');
    }

    return args;
  } catch (e) {
    throw new Error(e.message);
  }
};

const checkIllegalCharacter = (text) => {
  const illegalCharacter = /[|&;$%@"<>()+,]/g;

  return illegalCharacter.test(text);
};

const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';

  const validFields = ['name', 'code', 'phone', 'taxId', 'storeLevel', 'address', 'status'];
  const validFilter = ['name', 'code', 'phone', 'taxId', 'storeLevel._id', 'address', 'status'];

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

  const customFilter = [];

  customFilter.push({
    $lookup: {
      from: 'storelevels',
      localField: 'storeLevel',
      foreignField: '_id',
      as: 'storeLevel',
    },
  });
  try {
    Object.keys(args).forEach((key) => {
      if (!['page', 'limit', 'sortType', 'sortBy'].includes(key)) {
        const mongoId = CheckMongoId(args[key]);
        const illegalCharacter = checkIllegalCharacter(args[key]);

        if (mongoId) {
          customFilter.push({ $match: { [key]: new ObjectId(args[key]) } });
        } else if (key === 'storeLevel.level') {
          customFilter.push({ $match: { [key]: parseInt(args[key], 10) } });
        } else if (illegalCharacter) {
          customFilter.push({ $match: { [key]: args[key] } });
        } else {
          customFilter.push({ $match: { [key]: { $regex: new RegExp(args[key], 'gmi') } } });
        }
      }
    });
    const query = await Agency.aggregate([...customFilter, { $unwind: { path: '$storeLevel', preserveNullAndEmptyArrays: true } }, { $sort: sortOption },
      { $skip: skipOptions }, { $limit: limit }]);

    const total = await Agency.aggregate([...customFilter, SumOption]);

    const agencies = await Agency.populate(query, [
      { path: 'owner' },
    ]);

    return {
      data: agencies,
      paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
    };
  } catch (e) {
    throw new Error(e.message);
  }
};

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { agencyId } = arg;

    if (!agencyId) throw new Error('FIND.ERROR.AGENCY.AGENCY_ID_NOT_FOUND');

    return agencyId;
  };

  const vAgencyId = validateArgs(args);
  const agency = await Agency.findOne({ _id: vAgencyId })
    .populate({ path: 'storeLevel' })
    .populate([{
      path: 'owner',
      populate: {
        path: 'role',
      },
    }, {
      path: 'owner',
      populate: {
        path: 'managementUnit',
      },
    }, {
      path: 'owner',
      populate: {
        path: 'agency',
      },
    }]);
  return agency;
};

const getByCode = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { agencyCode } = arg;

    if (!agencyCode) throw new Error('FIND.ERROR.AGENCY.AGENCY_CODE_NOT_FOUND');

    return agencyCode;
  };

  const vAgencyCode = validateArgs(args);
  const agency = await Agency.findOne({ code: vAgencyCode });
  return agency;
};

const removeById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { agencyId } = arg;
    if (!agencyId) throw new Error('DELETE.ERROR.AGENCY.AGENCY_ID_NOT_FOUND');
    return agencyId;
  };
  const vAgencyId = validateArgs(args);
  try {
    const agency = await Agency.findOne({
      _id: vAgencyId,
    });

    if (agency) {
      await User.findOneAndDelete({
        _id: agency.owner,
      });

      return Agency.findOneAndDelete({
        _id: vAgencyId,
      });
    }
    throw new Error('DELETE.ERROR.AGENCY.DELETE_AGENCY_ERROR');
  } catch (e) {
    throw new Error(e.message);
  }
};

const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { listAgencies } = arg;

    if (!Array.isArray(listAgencies) && listAgencies.length === 0) throw new Error('DELETE.ERROR.AGENCY.LIST_AGENCY_INVALID');

    return listAgencies;
  };

  const vAgencies = validateArgs(args);

  try {
    let result = await Promise.map(vAgencies, async (agencyId) => {
      const agency = await Agency.findOne({
        _id: agencyId,
      });

      if (agency) {
        await User.findOneAndDelete({
          _id: agency.owner,
        });

        return Agency.findOneAndDelete({
          _id: agencyId,
        });
      }

      return false;
    });

    result = result.filter(Boolean);

    if (result && result.length > 0) {
      return result;
    }

    throw new Error('DELETE.ERROR.AGENCY.DELETE_AGENCY_ERROR');
  } catch (e) {
    throw new Error(e.message);
  }
};

const update = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      storeLevel,
      address,
      shippingAddress,
    } = arg;

    let vShippingAddress = shippingAddress;

    let vAgencyAddress = address;

    if (storeLevel) {
      // Check Owner
      const findStoreLevel = await StoreLevel.findOne({
        _id: storeLevel,
      });

      if (!findStoreLevel) throw new Error('UPDATE.ERROR.AGENCY.STORE_LEVEL_INVALID');
    }

    if (shippingAddress) {
      if (Array.isArray(shippingAddress)) {
        // Check Shipping Address
        if (!Array.isArray(shippingAddress) || shippingAddress.length === 0) {
          throw new Error('UPDATE.ERROR.AGENCY.SHIPPING_ADDRESS_INVALID');
        }

        vShippingAddress = shippingAddress.map((addr) => validateAddress(addr));

        const shippingDefault = vShippingAddress.filter((addr) => addr.isDefault);

        if (shippingDefault.length === 0) {
          throw new Error('UPDATE.ERROR.AGENCY.SHIPPING_ADDRESS_DEFAULT_INVALID');
        }

        if (shippingDefault.length > 1) {
          throw new Error('UPDATE.ERROR.AGENCY.SHIPPING_ADDRESS_DEFAULT_MUST_ONLY');
        }
      } else {
        throw new Error('UPDATE.ERROR.AGENCY.SHIPPING_ADDRESS_INVALID');
      }
    }

    if (typeof address !== 'object' && !address) throw new Error('UPDATE.ERROR.AGENCY.ADDRESS_INVALID');

    vAgencyAddress = validateAddress(address);

    return {
      ...args, vShippingAddress, vAgencyAddress,
    };
  };

  const { agencyId } = args;

  const vArgs = await validateArgs(args);

  if (!agencyId) throw new Error('UPDATE.ERROR.AGENCY.AGENCY_ID_INVALID');

  try {
    const agency = await Agency.findOne({ _id: agencyId });
    if (!agency) throw new Error('UPDATE.ERROR.AGENCY.AGENCY_ID_NOTE_FOUND');

    if (vArgs.taxId) {
      if (typeof vArgs.taxId !== 'string' || (vArgs.taxId.length === 0 || vArgs.taxId.length > 80)) throw new Error('UPDATE.ERROR.AGENCY.TAX_ID_INVALID');
      const checkTaxId = await Agency.findOne({ taxId: vArgs.taxId });

      if (checkTaxId && checkTaxId._id.toString() !== agencyId) throw new Error('UPDATE.ERROR.AGENCY.TAX_ID_INVALID');
    }

    let savedImage = [];
    if (vArgs.images && vArgs.images.length > 0) {
      savedImage = await saveImageAndGetHashList(vArgs.images);
    }

    const listFiled = [
      'name',
      'phone',
      'type',
      'status',
      'taxId',
      'image',
      'storeLevel',
      'images',
    ];

    if (agency.owner._id.toString() !== vArgs.owner._id) throw new Error('UPDATE.ERROR.AGENCY.OWNER_ID_INVALID');

    let savedImageInfoUser = {};
    if (vArgs.owner.images && vArgs.owner.images.length > 0) {
      savedImageInfoUser = await saveImageAndGetHashList(vArgs.owner.images);
      vArgs.owner.image = savedImageInfoUser[0];
    }
    await UserAction.update({
      userId: vArgs.owner._id,
      ...vArgs.owner,
    });

    listFiled.forEach((fieldName) => {
      agency[fieldName] = vArgs[fieldName] || agency[fieldName];
    });

    agency.images = savedImage || agency.images;
    agency.address = vArgs.vAgencyAddress || agency.address;
    agency.shippingAddress = vArgs.vShippingAddress || agency.shippingAddress;

    const newAgency = await agency.save();
    await newAgency.populate('owner').execPopulate();
    return newAgency;
  } catch (e) {
    if (e.message.indexOf('Cast to ObjectId failed') !== -1) {
      throw new Error('UPDATE.ERROR.AGENCY.UPDATE_AGENCY_ERROR');
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
      storeLevel,
      address,
      type,
      status,
      shippingAddress,
      owner,
      images,
    } = arg;
    Object.keys(args).forEach((key) => {
      if (_.isNull(args[key]) || args[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    if (typeof name !== 'string' || (name.length === 0 || name > 80)) throw new Error('CREATE.ERROR.AGENCY.NAME_INVALID');
    if (typeof phone !== 'string' || name.length === 0) throw new Error('CREATE.ERROR.AGENCY.PHONE_INVALID');
    if (typeof taxId !== 'string' || taxId.length === 0) throw new Error('CREATE.ERROR.AGENCY.TAXID_INVALID');
    if (typeof status !== 'string' || status.length === 0) throw new Error('CREATE.ERROR.AGENCY.STATUS_INVALID');
    if (typeof type !== 'string' || type.length === 0 || (type !== '0' && type !== '1')) throw new Error('CREATE.ERROR.AGENCY.TYPE_INVALID');

    // Check TaxId
    const findAgency = await Agency.findOne({
      taxId,
    });

    if (findAgency) throw new Error('CREATE.ERROR.AGENCY.TAX_ID_INVALID');

    if (storeLevel) {
      // Check Agency Type
      const findStoreLevel = await StoreLevel.findOne({
        _id: storeLevel,
      });

      if (!findStoreLevel) throw new Error('CREATE.ERROR.AGENCY.STORE_LEVEL_INVALID');
    }

    let vShippingAddress = shippingAddress || [{ ...address, isDefault: true }];

    if (type === '0') {
      // Check Shipping Address

      if (shippingAddress && !Array.isArray(shippingAddress)) {
        throw new Error('CREATE.ERROR.AGENCY.SHIPPING_ADDRESS_INVALID');
      }

      if (shippingAddress && shippingAddress.length > 0) {
        const vShippingAddressTMP = shippingAddress.map((addr) => validateAddress(addr));

        const shippingDefault = vShippingAddressTMP.filter((addr) => addr.isDefault);

        if (shippingDefault.length === 0) {
          throw new Error('CREATE.ERROR.AGENCY.SHIPPING_ADDRESS_DEFAULT_INVALID');
        }

        if (shippingDefault.length > 1) {
          throw new Error('CREATE.ERROR.AGENCY.SHIPPING_ADDRESS_DEFAULT_MUST_ONLY');
        }
      }

      if (shippingAddress && shippingAddress.length === 0) {
        vShippingAddress = [{ ...address, isDefault: true }];
      }
    }

    // Check Images

    if (images) {
      if (!Array.isArray(images) || images.length === 0) {
        throw new Error('CREATE.ERROR.AGENCY.IMAGES_INVALID');
      }
    }

    const vAgencyAddress = validateAddress(address);
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
      ...args, vShippingAddress, vAgencyAddress, vUser,
    };
  };

  const {
    name,
    storeLevel,
    type,
    vAgencyAddress,
    status,
    phone,
    taxId,
    vShippingAddress,
    vUser,
    images,
  } = await validateArgs(args);

  let savedImageInfo = [];
  if (images) {
    if (images.length > 0) {
      savedImageInfo = await saveImageAndGetHashList(images);
    }
  }

  /**
   * Create new User
   */

  let savedImageInfoUser = {};
  if (vUser.images) {
    if (vUser.images.length > 0) {
      savedImageInfoUser = await saveImageAndGetHashList(vUser.images);
    }
  }
  const newUser = new User({ ...vUser, image: savedImageInfoUser[0] });
  await newUser.save();

  try {
    const newAgency = new Agency({
      name,
      phone,
      status,
      type,
      taxId,
      storeLevel,
      address: vAgencyAddress,
      shippingAddress: vShippingAddress,
      owner: newUser,
      images: savedImageInfo,
    });

    const agencyTMP = await newAgency.save();
    await newUser.update({ agency: agencyTMP });
    return agencyTMP;
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
