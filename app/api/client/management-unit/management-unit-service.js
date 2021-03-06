import ManagementUnit from '../../../models/management_unit';

function buildHierachyTree(items) {
  const tree = [];
  const mappedArr = {};
  items.forEach((item) => {
    const id = item._id;
    if (!mappedArr.hasOwnProperty(id)) {
      mappedArr[id] = item;
      mappedArr[id].children = [];
    }
  });
  for (const id in mappedArr) {
    if (mappedArr.hasOwnProperty(id)) {
      const mappedElem = mappedArr[id];
      if (mappedElem.parent) {
        const parentId = mappedElem.parent;
        mappedArr[parentId].children.push(mappedElem);
      } else {
        tree.push(mappedElem);
      }
    }
  }

  return tree[0];
}

const getAll = async (type) => {
  let managementUnits;
  if (type === 'tree') {
    managementUnits = await ManagementUnit.find({}).lean().select('_id level name parent code');
    if (managementUnits.length > 0) {
      managementUnits = buildHierachyTree(managementUnits);
      managementUnits = managementUnits.children;
    }
  } else {
    managementUnits = await ManagementUnit.find({ level: { $gt: 0 } }).lean().select('_id level name parent code');
  }
  return managementUnits;
};

const getById = async (args = {}, type = 'flat') => {
  const validateArgs = (arg = {}) => {
    const { managementUnitId } = arg;
    if (!managementUnitId) throw new Error('FIND.ERROR.MANAGEMENT_UNIT.MANAGEMENT_UNIT_NOT_FOUND');
    return managementUnitId;
  };
  const vManagementUnitId = validateArgs(args);
  try {
    let managementUnit;
    if (type === 'tree') {
      managementUnit = await ManagementUnit.findOne({ _id: vManagementUnitId });
      const currentLevel = managementUnit.level;
      managementUnit = await ManagementUnit.find({ level: { $gt: currentLevel } }).lean().select('_id level name parent code');
      if (managementUnit.length > 0) {
        managementUnit = buildHierachyTree(managementUnit);
        console.log(managementUnit);
      }
    } else {
      managementUnit = await ManagementUnit.findOne({ _id: vManagementUnitId, level: { $gt: 0 } });
    }
    if (!managementUnit) {
      throw new Error('FIND.ERROR.MANAGEMENT_UNIT.MANAGEMENT_UNIT_NOT_FOUND');
    } else return managementUnit;
  } catch (e) {
    if (e.kind === 'ObjectId') {
      throw new Error('FIND.ERROR.MANAGEMENT_UNIT.MANAGEMENT_UNIT_NOT_FOUND');
    }
    throw new Error(e.message);
  }
};

module.exports = {
  getAll,
  getById,
};
