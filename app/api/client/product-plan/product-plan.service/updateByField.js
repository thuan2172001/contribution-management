import ProductPlan from '../../../../models/product_plan';
import ProductPlanCleaning from '../../../../models/product_plan_cleaning';
import ProductPlanHarvesting from '../../../../models/product_plan_harvesting';
import ProductPlanPreserve from '../../../../models/product_plan_preserve';
import ProductPlanPreliminaryTreatment from '../../../../models/product_plan_preliminary_treatment';
import ProductPlanPacking from '../../../../models/product_plan_packing';
import { validateInput } from '../product-plan.validate';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import { saveImageAndGetHashList } from '../../../../utils/image-utils';

const Promise = require('bluebird');

const buildRoleMapping = (planId, field, bodyField, process) => {
  const newField = [];
  bodyField.forEach((u) => {
    newField.push({
      user: u.user,
      startTime: u.startTime,
      endTime: u.endTime,
      notes: u.notes,
      role: field,
      productPlan: planId,
      process,
    });
  });
  return newField;
};
const updateByField = async (args = {}, body = {}, user) => {
  const validateBody = async (body = {}) => {
    let validatedBody = JSON.parse(JSON.stringify(body));
    validatedBody = await validateInput(validatedBody);
    if (!validatedBody.role) {
      throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.MISSING_ROLE');
    }
    return validatedBody;
  };
  const validateArgs = (arg = {}) => {
    const { productPlanField } = arg;
    if (!productPlanField) throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.INVALID_FIELD');
    const validFields = [
      'seeding', 'planting', 'harvesting',
      'preliminaryTreatment', 'cleaning',
      'packing', 'preservation',
    ];
    if (!validFields.includes(productPlanField)) {
      throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.INVALID_FIELD');
    }
    return arg;
  };
  const { productPlanField, planId } = await validateArgs(args);
  const validBody = await validateBody(body);
  try {
    const currentProductPlan = await ProductPlan.findOne({ _id: planId });
    const currentPlanRole = await PlanRoleMapping.find({ productPlan: planId, role: 'worker' });
    const harvestRole = currentPlanRole.find((x) => x.process === '2');
    const preliminaryTreatmentRole = currentPlanRole.find((x) => x.process === '3');
    const cleaningRole = currentPlanRole.find((x) => x.process === '4');
    const packingRole = currentPlanRole.find((x) => x.process === '5');
    const preserveRole = currentPlanRole.find((x) => x.process === '6');
    if (currentProductPlan) {
      if (currentProductPlan.confirmationStatus !== '2') {
        throw new Error('UPDATE.ERROR.PRODUCT_PLAN.PLAN_IS_WAITING_FOR_CONFIRM');
      }
      if (productPlanField === 'harvesting') {
        const currentHarvesting = await ProductPlanHarvesting.findOne(
          { _id: currentProductPlan.harvesting },
        );
        const myRole = await PlanRoleMapping.findOne(
          {
            productPlan: planId, user, process: '2', role: validBody.role,
          },
        );
        if (!myRole) {
          throw new Error('UPDATE.ERROR.PRODUCT_PLAN.YOU_DO_NOT_HAVE_PERMISSION_ON_THIS_PLAN');
        }
        const harvestingUpdateField = ['quantity', 'temperature', 'humidity', 'porosity', 'worker', 'imageBefore', 'imageInProgress', 'imageAfter'];
        await Promise.each(harvestingUpdateField, async (field) => {
          if (validBody[field]) {
            if (field === 'worker' && myRole.role === 'leader') {
              if (!harvestRole) {
                if (validBody[field]) {
                  const updatedField = buildRoleMapping(planId, field, validBody[field], '2');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              }
            } else if (field === 'imageInProgress' || field === 'imageBefore' || field === 'imageAfter') {
              const savedImageInfo = await saveImageAndGetHashList(validBody[field]);
              savedImageInfo.map((m) => {
                m.takenBy = user.toString();
                return m;
              });
              currentHarvesting[field] = currentHarvesting[field].concat(savedImageInfo);
            } else {
              currentHarvesting[field] = validBody[field] || currentHarvesting[field];
            }
          }
        });
        const savedHarvesting = await currentHarvesting.save();
        return savedHarvesting;
      }
      if (productPlanField === 'preliminaryTreatment') {
        const currentPreliminaryTreatment = await ProductPlanPreliminaryTreatment.findOne({ _id: currentProductPlan.preliminaryTreatment });
        const myRole = await PlanRoleMapping.findOne({
          productPlan: planId, user, process: '3', role: validBody.role,
        });
        if (!myRole) {
          throw new Error('UPDATE.ERROR.PRODUCT_PLAN.YOU_DO_NOT_HAVE_PERMISSION_ON_THIS_PLAN');
        }
        const preliminaryFields = ['quantity', 'worker', 'imageBefore', 'imageInProgress', 'imageAfter'];
        await Promise.each(preliminaryFields, async (field) => {
          if (validBody[field]) {
            if (field === 'quantity') {
              const currentHarvesting = await ProductPlanHarvesting.findOne(
                { _id: currentProductPlan.harvesting },
              );
              if (validBody[field] > currentHarvesting.quantity) {
                throw new Error('UPDATE.ERROR.PRODUCT_PLAN.PRELIMINARY_TREATMENT_QUANTITY_CANNOT_GREATER_THAN_HARVESTING_QUANTITY');
              }
            }
            if (field === 'worker' && myRole.role === 'leader') {
              if (!preliminaryTreatmentRole) {
                if (validBody[field]) {
                  const updatedField = buildRoleMapping(planId, field, validBody[field], '3');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              }
            } else if (field === 'imageInProgress' || field === 'imageBefore' || field === 'imageAfter') {
              const savedImageInfo = await saveImageAndGetHashList(validBody[field]);
              savedImageInfo.map((m) => {
                m.takenBy = user.toString();
                return m;
              });
              currentPreliminaryTreatment[field] = currentPreliminaryTreatment[field].concat(savedImageInfo);
            } else {
              currentPreliminaryTreatment[field] = validBody[field] || currentPreliminaryTreatment[field];
            }
          }
        });
        const savedPreliminaryTreatment = await currentPreliminaryTreatment.save();
        return savedPreliminaryTreatment;
      }
      if (productPlanField === 'cleaning') {
        const currentCleaning = await ProductPlanCleaning.findOne({ _id: currentProductPlan.cleaning });
        const myRole = await PlanRoleMapping.findOne({
          productPlan: planId, user, process: '4', role: validBody.role,
        });
        if (!myRole) {
          throw new Error('UPDATE.ERROR.PRODUCT_PLAN.YOU_DO_NOT_HAVE_PERMISSION_ON_THIS_PLAN');
        }
        const cleaningFields = ['quantity', 'worker', 'imageBefore', 'imageInProgress', 'imageAfter'];
        await Promise.each(cleaningFields, async (field) => {
          if (validBody[field]) {
            if (field === 'quantity') {
              const currentPreliminaryTreatment = await ProductPlanPreliminaryTreatment.findOne({ _id: currentProductPlan.preliminaryTreatment });
              if (validBody[field] > currentPreliminaryTreatment.quantity) {
                throw new Error('UPDATE.ERROR.PRODUCT_PLAN.CLEANING_QUANTITY_CANNOT_GREATER_THAN_PRELIMINARY_TREATMENT_QUANTITY');
              }
            }
            if (field === 'worker' && myRole.role === 'leader') {
              if (!cleaningRole) {
                if (validBody[field]) {
                  const updatedField = buildRoleMapping(planId, field, validBody[field], '4');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              }
            } else if (field === 'imageInProgress' || field === 'imageBefore' || field === 'imageAfter') {
              const savedImageInfo = await saveImageAndGetHashList(validBody[field]);
              savedImageInfo.map((m) => {
                m.takenBy = user.toString();
                return m;
              });
              currentCleaning[field] = currentCleaning[field].concat(savedImageInfo);
            } else {
              currentCleaning[field] = validBody[field] || currentCleaning[field];
            }
          }
        });
        const savedCleanning = await currentCleaning.save();
        return savedCleanning;
      }
      if (productPlanField === 'packing') {
        // Update packing
        const currentPacking = await ProductPlanPacking.findOne({ _id: currentProductPlan.packing });
        const myRole = await PlanRoleMapping.findOne({
          productPlan: planId, user, process: '5', role: validBody.role,
        });
        if (!myRole) {
          throw new Error('UPDATE.ERROR.PRODUCT_PLAN.YOU_DO_NOT_HAVE_PERMISSION_ON_THIS_PLAN');
        }
        const packingFields = ['quantity', 'worker', 'products', 'sampleImage', 'packingImage'];
        await Promise.each(packingFields, async (field) => {
          if (validBody[field]) {
            if (field === 'worker' && myRole.role === 'leader') {
              if (!packingRole) {
                if (validBody[field]) {
                  const updatedField = buildRoleMapping(planId, field, validBody[field], '5');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              }
            } else if (field === 'sampleImage' || field === 'packingImage') {
              const savedImageInfo = await saveImageAndGetHashList(validBody[field]);
              savedImageInfo.map((m) => {
                m.takenBy = user.toString();
                return m;
              });
              currentPacking[field] = currentPacking[field].concat(savedImageInfo);
            } else {
              currentPacking[field] = validBody[field] || currentPacking[field];
            }
          }
        });
        const savedPacking = await currentPacking.save();
        return savedPacking;
      }
      if (productPlanField === 'preservation') {
        // Update packing
        const currentPreserve = await ProductPlanPreserve.findOne({ _id: currentProductPlan.preservation });
        const myRole = await PlanRoleMapping.findOne({
          productPlan: planId, user, process: '6', role: validBody.role,
        });
        if (!myRole) {
          throw new Error('UPDATE.ERROR.PRODUCT_PLAN.YOU_DO_NOT_HAVE_PERMISSION_ON_THIS_PLAN');
        }
        const preserveField = ['startTime', 'endTime', 'temperature', 'worker', 'estimatedExpireTime', 'storageImage'];
        await Promise.each(preserveField, async (field) => {
          if (validBody[field]) {
            if (field === 'worker' && myRole.role === 'technical') {
              if (!preserveRole) {
                if (validBody[field]) {
                  const updatedField = buildRoleMapping(planId, field, validBody[field], '6');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              }
            } else if (field === 'storageImage') {
              const savedImageInfo = await saveImageAndGetHashList(validBody[field]);
              savedImageInfo.map((m) => {
                m.takenBy = user.toString();
                return m;
              });
              currentPreserve[field] = currentPreserve[field].concat(savedImageInfo);
            } else {
              currentPreserve[field] = validBody[field] || currentPreserve[field];
            }
          }
        });
        const savedPreservation = await currentPreserve.save();
        return savedPreservation;
      }
    } else {
      throw new Error('UPDATE.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
    }
  } catch (e) {
    if (e.kind === 'ObjectId') {
      throw new Error('FIND.ERROR.PRODUCT_PLAN.INVALID_ID');
    }
    throw new Error(e.message);
  }
};

module.exports = {
  updateByField,
};
