import Seeding from '../../../models/seeding';

const getAll = async () => {
  const seedings = await Seeding.find({});
  return seedings;
};

const getById = async (args = {}, type = 'flat') => {
  const validateArgs = (arg = {}) => {
    const { levelId } = arg;
    if (!levelId) throw new Error('FIND.ERROR.STORE_LEVEL_NOT_FOUND');
    return levelId;
  };
  const vLevelId = validateArgs(args);
  try {
    let levelData;
    if (type === 'tree') {
      levelData = await StoreLevel.findOne({ _id: vLevelId });
      const currentLevel = levelData.level;
      levelData = await StoreLevel.find({ level: { $gt: currentLevel } }).lean().select('_id level name status parent code');
      if (levelData.length > 0) {
        levelData = buildHierarchyTree(levelData);
      }
    } else {
      levelData = await StoreLevel.findOne({ _id: vLevelId, level: { $gt: 0 } });
    }
    if (!levelData) {
      throw new Error('FIND.ERROR.STORE_LEVEL_NOT_FOUND');
    } else return levelData;
  } catch (e) {
    if (e.kind === 'ObjectId') {
      throw new Error('FIND.ERROR.STORE_LEVEL_NOT_FOUND');
    }
    throw new Error(e.message);
  }
};

const create = async (args = {}) => {
  const validateArg = (args = {}) => {
    const {
      name,
      status,
    } = args;
    const validStatus = ['0', '1'];
    if (typeof name !== 'string' || (name.length === 0 || name > 80) || name === 'Root' || name === 'root') throw new Error(BAD_REQUEST);
    if (typeof status !== 'string') throw new Error('VALIDATE.ERROR.INVALID_STATUS');
    if (!validStatus.includes(status)) throw new Error('VALIDATE.ERROR.INVALID_STATUS');
    return args;
  };
  const {
    parentId,
    name,
    status,
  } = await validateArg(args);
  try {
    let parentLevelInfo;
    if (parentId) {
      parentLevelInfo = await StoreLevel.findOne({ _id: parentId });
    } else {
      parentLevelInfo = await StoreLevel.findOne({ level: 0 });
    }
    const { level, _id } = parentLevelInfo;
    const newLevel = level + 1;
    const newStoreLevel = new StoreLevel({
      name,
      status,
      level: newLevel,
      parent: _id,
    });
    const savedStoreLevel = await newStoreLevel.save();
    if (savedStoreLevel && savedStoreLevel._id) {
      return savedStoreLevel;
    }
    throw new Error('CREATE.ERROR.FAILED_TO_CREATE_STORE_LEVEL');
  } catch (e) {
    if (e.kind === 'ObjectId') {
      throw new Error('FIND.ERROR.STORE_LEVEL_NOT_FOUND');
    }
    throw new Error('CREATE.ERROR.BAD_REQUEST');
  }
};
const removeById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { levelId } = arg;

    if (!levelId) throw new Error('DELETE.ERROR.STORE_LEVEL_NOT_FOUND');
    return levelId;
  };

  const vLevelId = validateArgs(args);
  try {
    const isHavedChildren = await StoreLevel.findOne({ parent: vLevelId });
    if (isHavedChildren) throw new Error('DELETE.ERROR.STORE_LEVEL_HAVE_CHILDREN');
    const isHaveAgency = await Agency.findOne({ storeLevel: vLevelId });
    if (isHaveAgency) throw new Error('DELETE.ERROR.STORE_LEVEL_HAVE_AGENCY');
    const result = await StoreLevel.findOneAndDelete({ _id: vLevelId });
    if (result || result.deletedCount > 0) {
      return result;
    }
    throw new Error('DELETE.ERROR.CANT_DELETE_STORE_LEVEL');
  } catch (err) {
    if (e.kind === 'ObjectId') {
      throw new Error('FIND.ERROR.STORE_LEVEL_NOT_FOUND');
    }
    throw new Error(err.message);
  }
};
const update = async (args = {}) => {
  const { levelId } = args;
  const validateArgs = async (arg = {}) => {
    const {
      name,
      status,
    } = args;
    if (name && typeof name !== 'string') throw new Error('VALIDATE.ERROR.INVALID_NAME');
    if (status && typeof status !== 'string') throw new Error('VALIDATE.ERROR.INVALID_STATUS');
    if (status) {
      const validStatus = ['0', '1'];
      if (!validStatus.includes(status)) throw new Error('VALIDATE.ERROR.INVALID_STATUS');
    }
    return arg;
  };
  const vArgs = await validateArgs(args);
  if (!levelId.levelId) throw new Error('UPDATE.ERROR.STORE_LEVEL_NOT_FOUND');
  try {
    const storeLevel = await StoreLevel.findOne({ _id: levelId.levelId });
    if (!storeLevel) throw new Error('UPDATE.ERROR.STORE_LEVEL_NOT_FOUND');
    const listFiled = [
      'name',
      'status',
    ];
    listFiled.forEach((fieldName) => {
      storeLevel[fieldName] = vArgs[fieldName] || storeLevel[fieldName];
    });

    return storeLevel.save();
  } catch (e) {
    if (e.kind === 'ObjectId') {
      throw new Error('FIND.ERROR.STORE_LEVEL_NOT_FOUND');
    }
    throw new Error(e.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  removeById,
};
