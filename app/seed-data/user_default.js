import faker from 'faker';
import User from '../models/user';
import Role from '../models/role';
import Agency from '../models/agency';
import { getCSVFiles, getContentCSVFiles, cleanField } from './scanDataFile';
import { findAgency, findManagementUnit, findRole } from './findData';
import ProductPlanHarvesting from '../models/product_plan_harvesting';

const Promise = require('bluebird');

faker.locale = 'vi';

export const createDefaultUser = async () => {
  try {
    const generateNumber = await User.count();

    if (generateNumber > 0) return;

    const userFile = await getCSVFiles('users');

    const { header, content } = await getContentCSVFiles(userFile[0]);

    const managementFile = await getCSVFiles('managementunits');

    const {
      header: headerManagement,
      content: contentManagement,
    } = await getContentCSVFiles(managementFile[0]);

    const roleFile = await getCSVFiles('roles');

    const { header: headerRole, content: contentRole } = await getContentCSVFiles(roleFile[0]);

    const agencyFile = await getCSVFiles('agencies');

    const {
      header: headerAgency,
      content: contentAgency,
    } = await getContentCSVFiles(agencyFile[0]);

    await Promise.each(content, async (line) => {
      const field = cleanField(line.split(','));

      const managementUnitId = field[header.indexOf('managementUnit')];
      const roleId = field[header.indexOf('role')];
      const agencyId = field[header.indexOf('agency')];

      const management = await findManagementUnit(managementUnitId,
        contentManagement,
        headerManagement);

      const agency = await findAgency(agencyId, contentAgency, headerAgency);

      const role = await findRole(roleId, contentRole, headerRole);

      const userObj = {
        username: field[header.indexOf('username')],
        firstName: field[header.indexOf('firstName')],
        lastName: field[header.indexOf('lastName')],
        fullName: `${field[header.indexOf('lastName')]} ${field[header.indexOf('firstName')]}`,
        address: {
          address: field[header.indexOf('address')],
          city: field[header.indexOf('city')],
          district: field[header.indexOf('district')],
          state: field[header.indexOf('state')],
        },
        email: field[header.indexOf('email')],
        birthDay: field[header.indexOf('birthDay')],
        gender: field[header.indexOf('gender')],
        phone: field[header.indexOf('phone')],
        role: role[0],
        managementUnit: management[0],
      };
      const checkUserExits = await User.findOne(userObj);

      if (!checkUserExits) {
        const user = new User({
          status: '1',
          username: field[header.indexOf('username')],
          firstName: field[header.indexOf('firstName')],
          lastName: field[header.indexOf('lastName')],
          fullName: `${field[header.indexOf('lastName')]} ${field[header.indexOf('firstName')]}`,
          address: {
            address: field[header.indexOf('address')],
            city: field[header.indexOf('city')],
            district: field[header.indexOf('district')],
            state: field[header.indexOf('state')],
          },
          email: field[header.indexOf('email')],
          birthDay: field[header.indexOf('birthDay')],
          gender: field[header.indexOf('gender')],
          phone: field[header.indexOf('phone')],
          role: role[0],
          managementUnit: management[0],
          publicKey: 'ApKXOV4ilsHdFCDISoN4so/zXQxDWtt3AiAZg5bx2oNM',
          encryptedPrivateKey:
            'U2FsdGVkX1849aMg8O6GLRVrFSLd2aQI4cRaS4Ql2nZr8p+smv5O9koFn+J6EkcwaZF6u8dGb3tJEXg35q0raA==',
          issuerSignature: 'Admin System',
          issuedPublicKey: 'ApKXOV4ilsHdFCDISoN4so/zXQxDWtt3AiAZg5bx2oNM',
        });
        await user.save();
      }
    });

    console.log('Seed User Success');
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createAgencyForUser = async () => {
  try {
    const userFile = await getCSVFiles('users');

    const { header, content } = await getContentCSVFiles(userFile[0]);

    const agencyFile = await getCSVFiles('agencies');

    const {
      header: headerAgency,
      content: contentAgency,
    } = await getContentCSVFiles(agencyFile[0]);

    await Promise.each(content, async (line) => {
      const field = cleanField(line.split(','));

      const agencyId = field[header.indexOf('agency')];

      if (agencyId !== '') {
        const agency = await findAgency(agencyId, contentAgency, headerAgency);

        const userObj = {
          username: field[header.indexOf('username')],
        };
        const userExits = await User.findOne(userObj);

        if (userExits && !userExits.agency && agency[0]) {
          await User
            .updateOne({ _id: userExits._id }, {
              $set: {
                agency: agency[0]._id,
              },
            });
        }
      }
    });

    console.log('Seed Agency for User Success');
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createShippingAgencyForUser = async () => {
  try {
    const userFile = await getCSVFiles('users');

    const { header, content } = await getContentCSVFiles(userFile[0]);

    const shippingAgencyFile = await getCSVFiles('shippingagencies');

    const {
      header: headerShippingAgency,
      content: contentShippingAgency,
    } = await getContentCSVFiles(shippingAgencyFile[0]);

    await Promise.each(content, async (line) => {
      const field = cleanField(line.split(','));

      const shippingAgencyId = field[header.indexOf('shippingAgency')];

      if (shippingAgencyId !== '') {
        const shippingAgency = await findAgency(shippingAgencyId,
          contentShippingAgency, headerShippingAgency);

        const userObj = {
          username: field[header.indexOf('username')],
        };

        const userExits = await User.findOne(userObj);

        if (userExits && !userExits.agency && shippingAgency[0]) {
          console.log({ userExits });
          await User
            .updateOne({ _id: userExits._id }, {
              $set: {
                agency: shippingAgency[0]._id,
              },
            });
        }
      }
    });

    console.log('Seed Shipping Agency for User Success');
  } catch (err) {
    throw new Error(err.message);
  }
};
