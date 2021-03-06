import { parsePaginationOption, SumOption } from '../../library/search';
import ValidateAddress from '../../library/validateAddress';
import RoleAction from '../role/role.service';
import Role from '../../../models/role';
import Agency from '../../../models/agency'
import ManagementUnit from '../../../models/management_unit';
import { getSearchOption, mergeSearchObjToPopulate, poppulate } from '../../library/new-search';
import { removeElementInArray } from '../../../utils/removeElementInArray-ultils.js';
import {saveImageAndGetHash, saveImageAndGetHashList} from '../../../utils/image-utils';

const Promise = require('bluebird');
const _ = require('lodash');

const mongoose = require('mongoose');
const RoleScope = require('../../../const/role_scope.json');

const User = mongoose.model('User');

const getUserByUserName = async (args = {}) => {
  const validate = (arg = {}) => {
    const { username } = arg;

    if (!username) throw new Error('FIND.ERROR.USER.USER_NAME_MUST_BE_NOT_EMPTY');

    return username;
  };

  const vUserName = validate(args);

  return User.findOne({ username: vUserName });
};

const getUserByPhone = async (args = {}) => {
  const validate = (arg = {}) => {
    const { phone } = arg;

    if (!phone) throw new Error('Phone must be not empty');

    return phone;
  };

  const vPhone = validate(args);

  return User.findOne({ phone: vPhone }).populate(['role']);
};

const getUserByEmail = async (args = {}) => {
  const validate = (arg = {}) => {
    const { email } = arg;

    if (!email) throw new Error('Email must be not empty');

    return email;
  };

  const vEmail = validate(args);

  return User.findOne({ email: vEmail });
};

const removeScope = (originScope, disableScope) => {
  for (let scope of disableScope) {
    originScope = removeElementInArray(originScope, scope)
  }

  return originScope
}
const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { userId } = arg;

    if (!userId) throw new Error('GET.ERROR.USER.USER_ID_NOT_FOUND');

    return userId;
  };

  const vUserId = validateArgs(args);

  try {
    let user = await User.findOne({ _id: vUserId }).
    populate([
      { path: 'agency' },
      { path: 'managementUnit' },
      { path: 'role' },
    ]).lean();

    const scopesRole = await RoleAction.getScopesOfRole(user.role)

    const {enable, disable} = user.addedScope

    let scopesAfterRemove = removeScope(scopesRole, disable)

    user.scopes = scopesAfterRemove.concat(enable)

    return user
  } catch (e) {
    throw new Error(e.message);
  }
};

const update = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      status,
      firstName,
      lastName,
      fullName,
      address,
      agency,
      gender,
      role,
      managementUnit,
      scopes,
      image
    } = arg;

    if (status && (typeof status !== 'string' || (status !== '0' && status !== '1'))) throw new Error('UPDATE.ERROR.USER.STATUS_INVALID');

    if (firstName && (typeof firstName !== 'string' || (firstName.length === 0 || firstName.length > 254))) throw new Error('UPDATE.ERROR.USER.FIRST_NAME_INVALID');

    if (lastName && (typeof lastName !== 'string' || (lastName.length === 0 || lastName.length > 254))) throw new Error('UPDATE.ERROR.USER.LAST_NAME_INVALID');

    if (fullName && (typeof fullName !== 'string' || (fullName.length === 0 || fullName.length > 254))) throw new Error('UPDATE.ERROR.USER.FULL_NAME_INVALID');

    if (agency && (_.isEmpty(agency) || !agency._id)) throw new Error('UPDATE.ERROR.USER.AGENCY_INVALID');

    if (agency) {
      if (!agency._id) {
        throw new Error('CREATE.ERROR.USER.AGENCY_NOT_FOUND');
      }
      const checkWorkLocation = await Agency.findOne({
        _id: agency._id
      })
      if (!checkWorkLocation) throw new Error('CREATE.ERROR.USER.AGENCY_NOT_FOUND');
    }

    if (gender && (typeof gender !== 'string' || (gender !== '0' && gender !== '1'))) throw new Error('CREATE.ERROR.USER.GENDER_INVALID');

    if (address) {
      ValidateAddress(address);
    }

    if (managementUnit) {
      if (!managementUnit._id) {
        throw new Error('CREATE.ERROR.USER.MANAGEMENT_UNIT_INVALID');
      }
      const checkManagementUnit = await ManagementUnit.findOne({ _id: managementUnit._id });
      if (!checkManagementUnit) throw new Error('CREATE.ERROR.USER.MANAGEMENT_UNIT_NOT_FOUND');
    }

    if (role) {
      try {
        if (!role._id) {
          throw new Error('CREATE.ERROR.USER.ROLE_IN_VALID');
        }
        const roleExist = await Role.findOne({
          _id: role._id,
        });
        if (!roleExist) throw new Error('FIND.ERROR.USER.ROLE_NOT_FOUND');
        if (managementUnit) {
          if (roleExist.managementUnit.toString() !== managementUnit._id) throw new Error('CREATE.ERROR.USER.ROLE_INVALID');
        }
      } catch (e) {
        throw new Error(e.message);
      }
    }

    ValidateAddress(address);

    if (scopes) {
      scopes.forEach((scope) => {
        if (!RoleScope.includes(scope)) {
          throw new Error('CREATE.ERROR.USER.SCOPE_INVALID');
        }
      });
    }

    return arg;
  };

  const { userId } = args;

  const vArgs = await validateArgs(args);

  // Check username of user
  if (vArgs.username) {
    if (typeof vArgs.username !== 'string' || (vArgs.username.length === 0 || vArgs.username.length > 80)) throw new Error('UPDATE.ERROR.USER.USER_NAME_INVALID');
    const checkUserName = await getUserByUserName({ username: vArgs.username });

    if (checkUserName && checkUserName._id.toString() !== userId) throw new Error('UPDATE.ERROR.USER.USER_NAME_IN_USE');
  }

  // Check email of user
  if (vArgs.email) {
    if (typeof vArgs.email !== 'string' || (vArgs.email.length === 0 || vArgs.email.length > 80)) throw new Error('UPDATE.ERROR.USER.EMAIL_INVALID');
    const checkEmail = await getUserByEmail({ email: vArgs.email });

    if (checkEmail && checkEmail._id.toString() !== userId) throw new Error('UPDATE.ERROR.USER.EMAIL_IN_USE');
  }

  // Check phone of user
  if (vArgs.phone) {
    if (typeof vArgs.phone !== 'string' || (vArgs.phone.length === 0 || vArgs.phone.length > 80)) throw new Error('UPDATE.ERROR.USER.PHONE_INVALID');
    const checkPhone = await getUserByPhone({ phone: vArgs.phone });

    if (checkPhone && checkPhone._id.toString() !== userId) throw new Error('UPDATE.ERROR.USER.PHONE_IN_USE');
  }

  if (!userId) throw new Error('UPDATE.ERROR.USER.USER_ID_INVALID');

  const user = await User.findOne({ _id: userId });

  if (!user) throw new Error('UPDATE.ERROR.USER.USER_NOT_FOUND');

  let savedImage = {};
  if (vArgs.image) {
    user.image = await saveImageAndGetHash(vArgs.image);
  }

  const listFiled = [
    'username',
    'status',
    'firstName',
    'lastName',
    'fullName',
    'email',
    'phone',
    'gender',
    'birthDay',
    'address',
    'role',
    'agency',
    'gender',
    'managementUnit',
  ];

  let scopesRole = await RoleAction.getScopesOfRole(vArgs.role)

  const enable = _.difference(vArgs.scopes, scopesRole);

  const disable = _.difference(scopesRole, vArgs.scopes);


  listFiled.forEach((fieldName) => {
    user[fieldName] = vArgs[fieldName] ?? user[fieldName];
  });


  // user.image = savedImage || user.image
  user.addedScope = {
    enable, disable,
  };

  return user.save();
};

const removeById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { userId, actionType, realMethod } = arg;

    if (!userId) throw new Error('User ID must not be empty');

    if (typeof actionType !== 'string' || actionType.length === 0) {
      throw new Error('Action Type is required.');
    }
    if (actionType.trim().toLowerCase() !== realMethod.toLowerCase()) {
      throw new Error('Action Type is invalid.');
    }

    return userId;
  };

  const vUserId = validateArgs(args);

  return User.deleteOne({ _id: vUserId });
};

const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';
  const searchModel = {
    managementUnit: { _id: 'objectId' },
    role: { _id: 'objectId', name: 'string', code: 'string' },
    agency: { _id: 'objectId' },
    phone: 'string',
    email: 'string',
    fullName: 'string',
    code: 'string',
    username: 'string',
  };
  const poppulateObj = {
    managementUnit: { __from: 'managementunits' },
    role: { __from: 'roles' },
    agency: { __from: 'agencies' },
  };
  const validSearchOption = getSearchOption(args, searchModel);
  mergeSearchObjToPopulate(validSearchOption, poppulateObj, searchModel, args);
  const paginationOption = parsePaginationOption(args);
  const sortOption = { [args.sortBy ? args.sortBy === '' ? defaultSortField : args.sortBy : defaultSortField]: args.sortType === 'asc' ? 1 : -1 };
  const { page, limit } = paginationOption;
  const skipOptions = limit * (page - 1);

  const [pop] = poppulate(poppulateObj);
  const query = await User.aggregate([...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }]).collation({
    locale: 'vi',
    numericOrdering: true,
  });
  const total = await User.aggregate([...pop, SumOption]);
  return {
    data: query,
    paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
  };
};


const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      username,
      status,
      fullName,
      address,
      phone,
      email,
      birthDay,
      agency,
      gender,
      role,
      managementUnit,
      scopes,
    } = arg;

    Object.keys(args).forEach((key) => {
      if (_.isNull(args[key]) || args[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    // Check username of user
    if (typeof username !== 'string' || (username.length === 0 || username.length > 80)) throw new Error('CREATE.ERROR.USER.USERNAME_INVALID');
    const checkUserName = await getUserByUserName({ username });
    if (checkUserName) throw new Error('CREATE.ERROR.USER.USERNAME_IN_USE');

    if (typeof status !== 'string' || (status !== '0' && status !== '1')) throw new Error('CREATE.ERROR.USER.STATUS_INVALID');
    if (typeof gender !== 'string' || (gender !== '0' && gender !== '1')) throw new Error('CREATE.ERROR.USER.GENDER_INVALID');

    if (typeof fullName !== 'string' || (fullName.length === 0 || fullName.length > 254)) throw new Error('CREATE.ERROR.USER.FULL_NAME_INVALID');
    if (!birthDay) throw new Error('CREATE.ERROR.USER.BIRTH_DAY_INVALID');

    if (!agency || _.isEmpty(agency) || !agency._id) throw new Error('CREATE.ERROR.USER.AGENCY_INVALID');
    const checkWorkLocation = await Agency.findOne({
      _id: agency._id
    })
    if (!checkWorkLocation) throw new Error('CREATE.ERROR.USER.AGENCY_NOT_FOUND');

    // Check Phone of user
    if (typeof phone !== 'string' || (phone.length === 0 || phone.length > 13)) throw new Error('CREATE.ERROR.USER.PHONE_INVALID');
    const checkPhone = await getUserByPhone({ phone });
    if (checkPhone) throw new Error('CREATE.ERROR.USER.PHONE_IN_USE');

    // Check Email of User
    if (typeof email !== 'string' || (email.length === 0 || email.length > 254)) throw new Error('CREATE.ERROR.USER.EMAIL_INVALID');
    const checkEmail = await getUserByEmail({ email });
    if (checkEmail) throw new Error('CREATE.ERROR.USER.EMAIL_IN_USE');

    // Check management unit
    if (! managementUnit || _.isEmpty(managementUnit) || !managementUnit._id) throw new Error('CREATE.ERROR.USER.MANAGEMENT_UNIT_INVALID');
    const checkManagementUnit = await ManagementUnit.findOne({ _id: managementUnit._id });
    if (!checkManagementUnit) throw new Error('CREATE.ERROR.USER.MANAGEMENT_UNIT_INVALID');

    // Check role
    if (_.isEmpty(role) || !role._id) {
      throw new Error('CREATE.ERROR.USER.ROLE_IN_VALID');
    }
    const checkRole = await Role.findOne({ _id: role._id });
    if (!checkRole) throw new Error('CREATE.ERROR.USER.ROLE_NOT_FOUND');
    // Check Role in Management Unit
    if (checkRole.managementUnit.toString() !== managementUnit._id) throw new Error('CREATE.ERROR.USER.ROLE_INVALID');

    ValidateAddress(address);

    scopes.forEach((scope) => {
      if (!RoleScope.includes(scope)) {
        throw new Error('CREATE.ERROR.USER.SCOPE_INVALID');
      }
    });

    return arg;
  };

  const {
    username,
    status,
    publicKey,
    encryptedPrivateKey,
    issuerSignature,
    issuedPublicKey,
    tempPassword,
    fullName,
    agency,
    birthDay,
    gender,
    address,
    phone,
    email,
    role,
    managementUnit,
    scopes,
    image
  } = await validateArgs(args);
  let savedImage = {};
  if (image) {
    savedImage = await saveImageAndGetHash(image);
  }

  let scopesRole = await RoleAction.getScopesOfRole(role)

  // const userRole = await Role.findOne({ _id: role });
  // const scopesRole = userRole.scopes;
  const enable = _.difference(scopes, scopesRole);
  const disable = _.difference(scopesRole, scopes);

  const newUser = new User({
    username,
    status: status || 0,
    publicKey: publicKey || 'ApKXOV4ilsHdFCDISoN4so/zXQxDWtt3AiAZg5bx2oNM',
    encryptedPrivateKey: encryptedPrivateKey || 'U2FsdGVkX1849aMg8O6GLRVrFSLd2aQI4cRaS4Ql2nZr8p+smv5O9koFn+J6EkcwaZF6u8dGb3tJEXg35q0raA==',
    issuerSignature: issuerSignature || 'Admin System',
    issuedPublicKey: issuedPublicKey || 'ApKXOV4ilsHdFCDISoN4so/zXQxDWtt3AiAZg5bx2oNM',
    tempPassword,
    fullName,
    address,
    phone,
    agency,
    birthDay,
    gender,
    email,
    role,
    image : savedImage,
    managementUnit,
    addedScope: {
      enable,
      disable,
    },
  });

  return newUser.save();
};

module.exports = {
  getById,
  update,
  removeById,
  getAll,
  create,
};
