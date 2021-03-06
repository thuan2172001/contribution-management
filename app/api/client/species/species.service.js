import { ValidateSearchArgs } from '../../library/search';
import Species from '../../../models/species';
import CustomerOrder from '../../../models/customer_order';
import Packing from '../../../models/packing';
import Planting from '../../../models/planting';
import Seeding from '../../../models/seeding';
import { saveImageAndGetHash } from '../../../utils/image-utils';

const Promise = require('bluebird');
const _ = require('lodash');

const SPECIES_ID_NOT_FOUND = 'FIND.ERROR.SPECIES.SPECIES_ID_NOT_FOUND';
const getSpeciesByBarcode = async (args = {}) => {
  const validate = (arg = {}) => {
    const { barcode } = arg;

    if (!barcode) throw new Error('Barcode is invalid.');

    return barcode;
  };

  const vBarcode = validate(args);

  return Species.findOne({ barcode: vBarcode });
};

const getSpeciesByName = async (args = {}) => {
  const validate = (arg = {}) => {
    const { name } = arg;

    if (!name) throw new Error('FIND.ERROR.SPECIES.SPECIES_NAME_INVALID');

    return name;
  };

  const vName = validate(args);

  return Species.findOne({ name: vName });
};

const checkUsingSpecies = async (vSpecies) => {
  const vSpeciesId = vSpecies._id;
  const customerOrder = await CustomerOrder.findOne({
    species: vSpeciesId,
  });

  if (customerOrder) return { message: 'DELETE.ERROR.SPECIES.CUSTOMER_ORDER_USING', additional: vSpecies.name };

  const packing = await Packing.findOne({
    species: vSpeciesId,
  });

  if (packing) return { message: 'DELETE.ERROR.SPECIES.PACKING_USING', additional: vSpecies.name };

  const planting = await Planting.findOne({
    species: vSpeciesId,
  });

  if (planting) return { message: 'DELETE.ERROR.SPECIES.PLANTING_USING', additional: vSpecies.name };

  const seeding = await Seeding.findOne({
    species: vSpeciesId,
  });

  if (seeding) return { message: 'DELETE.ERROR.SPECIES.SEEDING_USING', additional: vSpecies.name };

  return null;
};

const validateArg = async (args = {}) => {
  const {
    name,
    barcode,
    growingDays,
    plantingDays,
    expiryDays,
    image,
  } = args;

  Object.keys(args).forEach((key) => {
    if (_.isNull(args[key]) || args[key] === '') {
      throw new Error(`Property "${key}" empty/null`);
    }
  });

  if (typeof name !== 'string' || (name.length === 0 || name > 80)) throw new Error('Name of agent is invalid.');
  let species = await getSpeciesByName({
    name,
  });

  if (species) throw new Error('CREATE.ERROR.SPECIES.SPECIES_NAME_IN_USE');

  if (typeof barcode !== 'string' || barcode.length === 0) throw new Error('CREATE.ERROR.SPECIES.BARCODE_INVALID');
  species = await getSpeciesByBarcode({
    barcode,
  });
  if (species) throw new Error('CREATE.ERROR.SPECIES.BARCODE_IN_USE');

  if (typeof growingDays !== 'number') throw new Error('CREATE.ERROR.SPECIES.GROWING_DAY');
  if (typeof plantingDays !== 'number') throw new Error('CREATE.ERROR.SPECIES.PLANTING_DAY');
  if (typeof expiryDays !== 'number') throw new Error('CREATE.ERROR.SPECIES.EXPIRY_DAY');
  return args;
};

const getAll = async (args = {}) => {
  const defaultSortField = 'updatedAt';

  const validFields = ['name', 'code', 'barcode'];

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

  const total = await Species
    .find(filterOption)
    .sort(sortOption)
    .count({});
  // .skip(skipOptions);

  const result = await Species.find(filterOption)
    .sort(sortOption)
    .collation({
      locale: 'vi',
      numericOrdering: true,
    })
    .skip(skipOptions)
    .limit(limit);

  return {
    data: result,
    paging: { page, limit, total },
  };
};

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { speciesId } = arg;

    if (!speciesId) throw new Error(SPECIES_ID_NOT_FOUND);

    return speciesId;
  };

  const vSpeciesId = validateArgs(args);

  try {
    return await Species.findOne({ _id: vSpeciesId });
  } catch (e) {
    throw new Error(e.message);
  }
};

const removeById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { speciesId } = arg;

    if (!speciesId) throw new Error(SPECIES_ID_NOT_FOUND);

    return speciesId;
  };

  const vSpeciesId = validateArgs(args);

  try {
    const species = await Species.findOne({
      _id: vSpeciesId,
    });

    if (species) {
      const result = await checkUsingSpecies(species);
      if (result) throw new Error(`${JSON.stringify([result])}`);
      return Species.findOneAndDelete({
        _id: species._id,
      });
    }
    throw new Error('DELETE.ERROR.SPECIES.SPECIES_ID_NOT_FOUND');
  } catch (err) {
    throw new Error(err.message);
  }
};

const remove = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { listSpecies } = arg;

    if (!Array.isArray(listSpecies) && listSpecies.length === 0) throw new Error('DELETE.ERROR.SPECIES.LIST_SPECIES_INVALID');

    return listSpecies;
  };

  const vSpecieses = validateArgs(args);

  try {
    let result = await Promise.all(vSpecieses.map(async (speciesId) => {
      const species = await Species.findOne({
        _id: speciesId,
      });

      if (species) {
        const result = await checkUsingSpecies(species);
        if (result) return result;
        const check = await Species.findOneAndDelete({
          _id: species._id,
        });
        if (check) return null;
        return { message: 'DELETE.ERROR.SPECIES.CANNOT_DELETE', additional: species.name };
      }
      return { message: 'DELETE.ERROR.SPECIES.NOT_FOUND', additional: speciesId };
    }));
    result = result.filter((r) => r != null);
    if (result.length > 0) {
      throw new Error(`${JSON.stringify(result)}`);
    }
    return vSpecieses;
  } catch (err) {
    throw new Error(err.message);
  }
};

const update = async (args = {}) => {
  const { speciesId } = args;

  const validateArgs = async (arg = {}) => {
    const {
      name,
      barcode,
      growingDays,
      plantingDays,
      expiryDays,
      images,
    } = args;

    if (name) {
      if (name && typeof name !== 'string') throw new Error('CREATE.ERROR.SPECIES.NAME_INVALID');
      const species = await getAll({ name });
      if (species.paging.total > 0) {
        if (species.data.some((t) => t._id.toString() !== speciesId)) throw new Error('CREATE.ERROR.SPECIES.SPECIES_NAME_IN_USE');
        // throw new Error('VALIDATE.ERROR.PACKING.PACKING_HAS_BEEN_USED');
      }
    }

    if (barcode) {
      if (barcode && typeof barcode !== 'string') throw new Error('CREATE.ERROR.SPECIES.BARCODE_INVALID');
      const species = await getAll({ barcode });
      if (species.paging.total > 0) {
        if (species.data.some((t) => t._id.toString() !== speciesId)) throw new Error('CREATE.ERROR.SPECIES.BARCODE_IN_USE');
        // throw new Error('VALIDATE.ERROR.PACKING.PACKING_HAS_BEEN_USED');
      }
    }

    if (growingDays && typeof growingDays !== 'number') throw new Error('CREATE.ERROR.SPECIES.GROWING_DAY');
    if (plantingDays && typeof plantingDays !== 'number') throw new Error('CREATE.ERROR.SPECIES.PLANTING_DAY');
    if (expiryDays && typeof expiryDays !== 'number') throw new Error('CREATE.ERROR.SPECIES.EXPIRY_DAY');

    if (images) {
      if (!Array.isArray(images)) {
        throw new Error('CREATE.ERROR.AGENCY.IMAGES_INVALID');
      }
    }
    return arg;
  };

  const vArgs = await validateArgs(args);

  if (!speciesId) throw new Error(SPECIES_ID_NOT_FOUND);

  try {
    const species = await Species.findOne({ _id: speciesId });

    if (!species) throw new Error('CREATE.ERROR.SPECIES.SPECIES_ID_INVALID');

    let savedImage = {};
    if (vArgs.image) {
      savedImage = await saveImageAndGetHash(vArgs.image);
    }
    const listFiled = [
      'name',
      'barcode',
      'growingDays',
      'plantingDays',
      'expiryDays',
    ];

    listFiled.forEach((fieldName) => {
      species[fieldName] = vArgs[fieldName] || species[fieldName];
    });

    species.image = savedImage || species.image;

    return species.save();
  } catch (e) {
    throw new Error(e.message);
  }
};

const create = async (args = {}) => {
  const {
    name,
    barcode,
    growingDays,
    plantingDays,
    expiryDays,
    image,
  } = await validateArg(args);

  let savedImage = {};
  if (image) {
    savedImage = await saveImageAndGetHash(image);
  }

  try {
    const newSpecies = new Species({
      name,
      barcode,
      growingDays,
      plantingDays,
      expiryDays,
      image: savedImage,
    });

    return await newSpecies.save();
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
};
