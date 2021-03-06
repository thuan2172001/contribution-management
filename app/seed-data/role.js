import Role from '../models/role';
import { cleanField, getContentCSVFiles, getCSVFiles } from './scanDataFile';
import { findManagementUnit } from './findData';

const Promise = require('bluebird');
const slugify = require('slugify');

export const generateRole = async () => {
  try {
    const generateNumber = await Role.count();

    if (generateNumber > 0) return;

    const roleFile = await getCSVFiles('roles');

    const { header, content } = await getContentCSVFiles(roleFile[0]);

    const managementFile = await getCSVFiles('managementunits');

    const {
      header: headerManagement,
      content: contentManagement,
    } = await getContentCSVFiles(managementFile[0]);

    await Promise.each(content, async (line) => {
      const field = cleanField(line.split(','));

      const managementUnitId = field[header.indexOf('managementUnit')];

      const management = await findManagementUnit(managementUnitId,
        contentManagement,
        headerManagement);

      const checkRoleExits = await Role.findOne({
        name: field[header.indexOf('name')],
        managementUnit: management[0],
      });
      if (!checkRoleExits) {
        const role = new Role({
          name: field[header.indexOf('name')],
          code: slugify(field[header.indexOf('name')]),
          status: '1',
          managementUnit: management[0],
        });
        await role.save();
      }
    });

    console.log('Seed Role Success');
  } catch (err) {
    throw new Error(err);
  }
};
