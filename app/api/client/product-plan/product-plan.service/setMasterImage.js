import _ from 'lodash';
import ProductPlan from '../../../../models/product_plan';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import ProductPlanHarvesting from '../../../../models/product_plan_harvesting';
import ProductPlanPreliminaryTreatment from '../../../../models/product_plan_preliminary_treatment';
import ProductPlanCleaning from '../../../../models/product_plan_cleaning';
import ProductPlanPacking from '../../../../models/product_plan_packing';
import ProductPlanPreserve from '../../../../models/product_plan_preserve';

const Promise = require('bluebird');

const setIsMasterImage = (dbImage, images) => {
  const imageIds = images.map((i) => i._id.toString());
  images = images.map((i) => {
    i.isMaster = true;
    return i;
  });
  const imageInProcess = JSON.parse(JSON.stringify(dbImage));
  let updatedImg = [];
  imageInProcess.map((img) => {
    if (!imageIds.includes(img._id)) {
      updatedImg.push(img);
    }
  });
  updatedImg = updatedImg.concat(images);
  return updatedImg;
};

const setMasterImage = async (args = {}, body, user) => {
  const validFields = ['seeding', 'comments', 'planting', 'harvesting', 'preliminaryTreatment', 'cleaning', 'packing', 'preservation', 'history'];
  const validateArgs = (arg = {}) => {
    const { productPlanField } = arg;
    if (!productPlanField) throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.INVALID_FIELD');
    if (!validFields.includes(productPlanField)) {
      throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.INVALID_FIELD');
    }
    return arg;
  };
  const validateBody = (body) => {
    if (!body) throw new Error('VALIDATE.ERROR.EMPTY_BODY');
    const { type } = body;
    type.forEach((eachType) => {
      if (eachType.name === 'imageInProgress') {
        if (eachType.images.length <1&&eachType.images.length >3) throw new Error('VALIDATE.ERROR.IMAGE_IN_PROGRESS_MUST_HAVE_1_3_IMAGE');
      } else if (type === 'imageBefore' || type === 'imageAfter' || type === 'sampleImage' || type === 'packingImage' || type === 'storageImage') {
        if (eachType.images.length !== 1) throw new Error('VALIDATE.ERROR.THIS_TYPE_CAN_HAVE_1_MASTER_IMAGE');
      }
    });
    return body;
  };
  const { productPlanField, planId } = await validateArgs(args);
  const { type } = await validateBody(body);
  const processNameMapping = [
    { process: '2', name: 'harvesting' },
    { process: '3', name: 'preliminaryTreatment' },
    { process: '4', name: 'cleaning' },
    { process: '5', name: 'packing' },
    { process: '6', name: 'preservation' },
  ];
  const currentProcess = processNameMapping.filter((x) => x.name === productPlanField)[0];
  const MAX_IMAGE_IN_PROGRESS = 3;
  try {
    const currentProductPlan = await ProductPlan.findOne({ _id: planId }).lean();
    if (currentProductPlan) {
      if (currentProcess) {
        const planRoleMapping = await PlanRoleMapping.find({
          user,
          productPlan: planId,
          process: currentProcess.process,
          role: 'leader',
        }).lean().select('process user role startTime endTime notes isRecieved isDone');
        if (planRoleMapping) {
          // Người gọi là leader, tiến hành set ảnh master
          if (currentProcess.process === '2') {
            // Thu Hoạch
            const currentHarvesting = await ProductPlanHarvesting.findOne({ _id: currentProductPlan[productPlanField] });
            const VALID_IMAGE_TYPES = ['imageBefore', 'imageAfter', 'imageInProgress'];
            await Promise.each(VALID_IMAGE_TYPES, async (imageType) => {
              let validType = _.filter(type, { name: imageType });
              if (validType.length > 0) {
                validType = validType[0];
                const savedImg = currentHarvesting[imageType].filter((img) => img.isMaster === true);
                if (validType.name === 'imageInProgress') {
                  if (savedImg.length < MAX_IMAGE_IN_PROGRESS) {
                    currentHarvesting[imageType] = setIsMasterImage(currentHarvesting[imageType], validType.images.slice(0, MAX_IMAGE_IN_PROGRESS - savedImg.length));
                  } else {
                    throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_IN_PROGRESS_EXCEEDED');
                  }
                } else if (savedImg.length !== 1) {
                  currentHarvesting[imageType] = setIsMasterImage(currentHarvesting[imageType], validType.images);
                } else {
                  throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_EXCEEDED');
                }
              }
            });
            const savedHarvesting = await currentHarvesting.save();
            return savedHarvesting;
          }
          if (currentProcess.process === '3') {
            // So che
            const currentPreliminaryTreatment = await ProductPlanPreliminaryTreatment.findOne({ _id: currentProductPlan[productPlanField] });
            const VALID_IMAGE_TYPES = ['imageBefore', 'imageAfter', 'imageInProgress'];
            await Promise.each(VALID_IMAGE_TYPES, async (imageType) => {
              let validType = _.filter(type, { name: imageType });
              if (validType.length > 0) {
                validType = validType[0];
                const savedImg = currentPreliminaryTreatment[imageType].filter((img) => img.isMaster === true);
                if (validType.name === 'imageInProgress') {
                  if (savedImg.length < MAX_IMAGE_IN_PROGRESS) {
                    currentPreliminaryTreatment[imageType] = setIsMasterImage(currentPreliminaryTreatment[imageType], validType.images.slice(0, MAX_IMAGE_IN_PROGRESS - savedImg.length));
                  } else {
                    throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_IN_PROGRESS_EXCEEDED');
                  }
                } else if (savedImg.length !== 1) {
                  currentPreliminaryTreatment[imageType] = setIsMasterImage(currentPreliminaryTreatment[imageType], validType.images);
                } else {
                  throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_EXCEEDED');
                }
              }
            });
            const savedPT = await currentPreliminaryTreatment.save();
            return savedPT;
          }
          if (currentProcess.process === '4') {
            // Lam sach
            const currentCleaning = await ProductPlanCleaning.findOne({ _id: currentProductPlan[productPlanField] });
            const VALID_IMAGE_TYPES = ['imageBefore', 'imageAfter', 'imageInProgress'];
            await Promise.each(VALID_IMAGE_TYPES, async (imageType) => {
              let validType = _.filter(type, { name: imageType });
              if (validType.length > 0) {
                validType = validType[0];
                const savedImg = currentCleaning[imageType].filter((img) => img.isMaster === true);
                if (validType.name === 'imageInProgress') {
                  if (savedImg.length < MAX_IMAGE_IN_PROGRESS) {
                    currentCleaning[imageType] = setIsMasterImage(currentCleaning[imageType], validType.images.slice(0, MAX_IMAGE_IN_PROGRESS - savedImg.length));
                  } else {
                    throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_IN_PROGRESS_EXCEEDED');
                  }
                } else if (savedImg.length !== 1) {
                  currentCleaning[imageType] = setIsMasterImage(currentCleaning[imageType], validType.images);
                } else {
                  throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_EXCEEDED');
                }
              }
            });
            const savedCleaning = await currentCleaning.save();
            return savedCleaning;
          }
          if (currentProcess.process === '5') {
            // Lam sach
            const currentPacking = await ProductPlanPacking.findOne({ _id: currentProductPlan[productPlanField] });
            const VALID_IMAGE_TYPES = ['sampleImage', 'packingImage'];
            await Promise.each(VALID_IMAGE_TYPES, async (imageType) => {
              let validType = _.filter(type, { name: imageType });
              if (validType.length > 0) {
                validType = validType[0];
                const savedImg = currentPacking[imageType].filter((img) => img.isMaster === true);
                if (savedImg.length !== 1) {
                  currentPacking[imageType] = setIsMasterImage(currentPacking[imageType], validType.images);
                } else {
                  throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_EXCEEDED');
                }
              }
            });
            const savedPacking = await currentPacking.save();
            return savedPacking;
          }
          if (currentProcess.process === '6') {
            // Lam sach
            const currentPreserve = await ProductPlanPreserve.findOne({ _id: currentProductPlan[productPlanField] });
            const VALID_IMAGE_TYPES = ['storageImage'];
            await Promise.each(VALID_IMAGE_TYPES, async (imageType) => {
              let validType = _.filter(type, { name: imageType });
              if (validType.length > 0) {
                validType = validType[0];
                const savedImg = currentPreserve[imageType].filter((img) => img.isMaster === true);
                if (savedImg.length !== 1) {
                  currentPreserve[imageType] = setIsMasterImage(currentPreserve[imageType], validType.images);
                } else {
                  throw new Error('UPDATE.ERROR.MASTER_IMAGE.MAX_MASTER_IMAGE_EXCEEDED');
                }
              }
            });
            const savedPreserve = await currentPreserve.save();
            return savedPreserve;
          }
        }
      }
    } throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  setMasterImage,
};
