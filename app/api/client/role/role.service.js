import { SumOption } from '../../library/search';
import Role from '../../../models/role';
import ManagementUnit from '../../../models/management_unit';
import User from '../../../models/user';
import { searchFunction } from '../../library/new-search';

const _ = require('lodash');
const Promise = require('bluebird');
const slugify = require('slugify');
const RoleScope = require('../../../const/role_scope.json');

const getScopesOfRole = async (role) => {
  let scopesRole = [];

  const r = await Role.findOne({ _id: role });

  scopesRole = _.concat(scopesRole, r.scopes);

  return scopesRole;
};
const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';

  const searchModel = {
    name: 'string',
    code: 'string',
    agency: { _id: 'objectId', name: 'string' },
    level: 'number',
    status: 'string',
    managementUnit: { _id: 'objectId' },
    createdAt: 'date-time',
    _id: 'objectId-contain',
  };
  const poppulateObj = {
    agency: { __from: 'agencies' },
    managementUnit: { __from: 'managementunits' },
  };
  const customerTabQuery = (!args.code || args.code === '') ? [{ $match: { code: { $ne: 'Khach-hang' } } }] : [];
  const {
    pop, sortOption, skipOptions, page, limit,
  } = searchFunction(args, defaultSortField, searchModel, poppulateObj);
  try {
    const query = await Role
      .aggregate([...customerTabQuery, ...pop, { $sort: sortOption }, { $skip: skipOptions }, { $limit: limit }])
      .collation({
        locale: 'vi',
        numericOrdering: true,
      });
    const total = await Role.aggregate([...pop, SumOption])
      .collation({
        locale: 'vi',
        numericOrdering: true,
      });
    return {
      data: query,
      paging: { page, limit, total: total.length === 0 ? 0 : total[0].n },
    };
  } catch (e) {
    throw new Error(e.message);
  }
};

const removeById = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const { roleId } = arg;

    if (!roleId) throw new Error('DELETE.ERROR.ROLE.ROLE_ID_NOT_FOUND');

    const user = await User.findOne({
      role: roleId,
    });

    if (user) throw new Error('DELETE.ERROR.ROLE.ROLE_IN_USE');
    return roleId;
  };

  const vRoleId = await validateArgs(args);

  try {
    const result = await Role.findOneAndDelete({ _id: vRoleId });
    if (result) {
      return result;
    }

    throw new Error('DELETE.ERROR.ROLE.DELETE_ROLE_ERROR');
  } catch (e) {
    throw new Error(e.message);
  }
};

const remove = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const { listRole } = arg;

    if (!Array.isArray(listRole) && listRole.length === 0) throw new Error('DELETE.ERROR.ROLE.LIST_ROLE_INVALID');

    return listRole;
  };

  const vListRole = validateArgs(args);

  try {
    let result = await Promise.map(vListRole, async (roleId) => {
      const user = await User.findOne({
        role: roleId,
      });

      if (user) return { message: 'DELETE.ERROR.ROLE.ROLE_IN_USE', additional: roleId };

      if (!await Role.findOneAndDelete({
        _id: roleId,
      })) return { message: 'DELETE.ERROR.ROLE.DELETE_ROLE_ERROR', additional: roleId };
      return null;
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

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { roleId } = arg;

    if (!roleId) throw new Error('FIND.ERROR.ROLE.ROLE_ID_NOT_FOUND');

    return roleId;
  };

  const vRoleId = validateArgs(args);

  try {
    return await Role.findOne({ _id: vRoleId })
      .populate([
        { path: 'managementUnit' },
      ])
      .lean();
  } catch (e) {
    throw new Error(e.message);
  }
};

const create = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      managementUnit,
      name,
      status,
      scopes,
    } = arg;

    Object.keys(args).forEach((key) => {
      if (_.isNull(args[key]) || args[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    if (typeof name !== 'string' || (name.length === 0 || name.length > 80)) throw new Error('CREATE.ERROR.ROLE.NAME_INVALID');
    if (typeof status !== 'string' || (status !== '0' && status !== '1')) throw new Error('CREATE.ERROR.ROLE.STATUS_INVALID');

    // Check management unit
    if (!managementUnit || _.isEmpty(managementUnit) || !managementUnit._id) throw new Error('CREATE.ERROR.ROLE.MANAGEMENT_UNIT_INVALID');
    const checkManagementUnit = await ManagementUnit.findOne({ _id: managementUnit._id });
    if (!checkManagementUnit) throw new Error('CREATE.ERROR.ROLE.MANAGEMENT_UNIT_NOT_FOUND');
    const checkRoleName = await Role.findOne({ name });
    if (checkRoleName) throw new Error('CREATE.ERROR.ROLE.NAME_EXISTS');
    scopes.forEach((scope) => {
      if (!RoleScope.includes(scope)) {
        throw new Error('CREATE.ERROR.ROLE.SCOPE_INVALID');
      }
    });

    return arg;
  };

  const {
    name, status, managementUnit, scopes,
  } = await validateArgs(args);

  try {
    const newRole = new Role({
      name,
      code: slugify(name),
      status,
      managementUnit,
      scopes,
    });

    return newRole.save();
  } catch (e) {
    throw new Error(e.message);
  }
};

const update = async (args = {}) => {
  const validateArgs = async (arg = {}) => {
    const {
      managementUnit,
      name,
      status,
      scopes,
    } = arg;

    Object.keys(args).forEach((key) => {
      if (_.isNull(args[key]) || args[key] === '') {
        throw new Error(`Property "${key}" empty/null`);
      }
    });

    if (name && (typeof name !== 'string' || (name.length === 0 || name > 80))) throw new Error('CREATE.ERROR.ROLE.NAME_INVALID');
    if (status && (typeof status !== 'string' || (status !== '0' && status !== '1'))) throw new Error('CREATE.ERROR.ROLE.STATUS_INVALID');

    if (managementUnit) {
      if (!managementUnit._id) throw new Error('CREATE.ERROR.ROLE.MANAGEMENT_UNIT_INVALID');
      const checkManagementUnit = await ManagementUnit.findOne({ _id: managementUnit._id });
      if (!checkManagementUnit) throw new Error('CREATE.ERROR.ROLE.MANAGEMENT_UNIT_NOT_FOUND');
    }
    const checkRoleName = await Role.findOne({ name });
    if (checkRoleName && checkRoleName._id.toString() !== arg.roleId) throw new Error('CREATE.ERROR.USER.NAME_EXISTS');
    if (scopes) {
      scopes.forEach((scope) => {
        if (!RoleScope.includes(scope)) {
          throw new Error('CREATE.ERROR.ROLE.SCOPE_INVALID');
        }
      });
    }

    return arg;
  };

  const { roleId } = args;

  if (!roleId) throw new Error('UPDATE.ERROR.ROLE.ROLE_ID_NOTE_FOUND');

  const vArgs = await validateArgs(args);

  try {
    const role = await Role.findOne({
      _id: roleId,
    });

    if (!role) throw new Error('UPDATE.ERROR.ROLE.ROLE_ID_NOTE_FOUND');

    const listField = [
      'name',
      'status',
      'managementUnit',
      'scopes',
    ];

    listField.forEach((fieldName) => {
      role[fieldName] = vArgs[fieldName] || role[fieldName];
    });

    return role.save();
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  removeById,
  remove,
  getScopesOfRole,
};
