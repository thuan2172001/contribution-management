import mongoose from 'mongoose';
import ProductPlan from '../../../../models/product_plan';
import ProductPlanCleaning from '../../../../models/product_plan_cleaning';
import ProductPlanHarvesting from '../../../../models/product_plan_harvesting';
import ProductPlanPreserve from '../../../../models/product_plan_preserve';
import ProductPlanPreliminaryTreatment from '../../../../models/product_plan_preliminary_treatment';
import ProductPlanPacking from '../../../../models/product_plan_packing';
import { validateInput } from '../product-plan.validate';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import { updateToBlockchain } from '../../../../services/blockchain/hashProcess';

const buildRoleMapping = (planId, field, bodyField, process) => {
  const newField = [];
  bodyField.map((u) => {
    newField.push({
      user: u,
      role: field,
      productPlan: planId,
      process,
    });
  });
  return newField;
};
const update = async (args = {}, body = {}, user) => {
  const validateArgs = async (arg = {}) => {
    const {
      planId,
    } = args;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return arg;
  };
  const validateBody = async (body = {}) => {
    const {
      step,
      unit,
      harvesting,
      preliminaryTreatment,
      cleaning,
      packing,
      preservation,
    } = body;
    const validatedBody = JSON.parse(JSON.stringify(body));
    if (step) {
      const validStep = ['0', '1'];
      if (!validStep.includes(step)) {
        throw new Error('FIND.ERROR.INVALID_STEP');
      }
    }
    if (unit) {
      if (unit < 0) throw new Error('VALIDATE.ERROR.INVALID_UNIT');
    }
    if (harvesting) {
      validatedBody.harvesting = await validateInput(harvesting);
    }
    if (preliminaryTreatment) {
      validatedBody.preliminaryTreatment = await validateInput(preliminaryTreatment);
    }
    if (cleaning) {
      validatedBody.cleaning = await validateInput(cleaning);
    }
    if (packing) {
      validatedBody.packing = await validateInput(packing);
    }
    if (preservation) {
      validatedBody.preservation = await validateInput(preservation);
    }
    return validatedBody;
  };
  const { planId } = await validateArgs(args);
  const validBody = await validateBody(body);
  const vHarvesting = validBody.harvesting;
  const vPreliminaryTreatment = validBody.preliminaryTreatment;
  const vCleaning = validBody.cleaning;
  const vPacking = validBody.packing;
  const vPreservation = validBody.preservation;
  try {
    const currentProductPlan = await ProductPlan.findOne({ _id: planId });
    if (!currentProductPlan) return;
    // Check valid step
    if (validBody.step) {
      const currentStep = parseInt(currentProductPlan.step);
      const updateStep = parseInt(validBody.step);
      if (currentStep <= updateStep) {
        currentProductPlan.step = validBody.step;
      } else {
        throw new Error('UPDATE.ERROR.CANNOT_GO_BACK_TO_PREVIOUS_STEP');
      }
    }
    if (validBody.unit) {
      if (currentProductPlan.process <= 3) {
        currentProductPlan.unit = validBody.unit;
      }
    }
    const {
      harvesting, preliminaryTreatment, cleaning, packing, preservation,
    } = currentProductPlan;
    const currentPlanRole = await PlanRoleMapping.find({ productPlan: planId });
    const harvestRole = currentPlanRole.filter((x) => x.process === '2');
    const preliminaryTreatmentRole = currentPlanRole.filter((x) => x.process === '3');
    const cleaningRole = currentPlanRole.filter((x) => x.process === '4');
    const packingRole = currentPlanRole.filter((x) => x.process === '5');
    const preserveRole = currentPlanRole.filter((x) => x.process === '6');
    // Check nếu sửa thông tin mà process = 1 thì sửa bình thường
    // Còn nếu process >=2 thì phải tạo phiên bản mới và cho phiên bản đó thành chờ duyệt
    const currentProcess = parseInt(currentProductPlan.process);
    if (currentProcess === 1 || (currentProcess !== 1 && currentProductPlan.isMaster === false)) {
      // Start update session
      const session = mongoose.startSession();
      (await session).startTransaction();
      try {
        // Process = 1 => Update tẹt
        if (vHarvesting) {
          // Update Harvesting
          console.log('UPDATE Harvesting');
          // TODO: update Image
          const currentHarvesting = await ProductPlanHarvesting.findOne({ _id: harvesting });
          const harvestingUpdateField = ['technical', 'leader'];
          harvestingUpdateField.map(async (field) => {
            if (vHarvesting && vHarvesting[field]) {
              if (field === 'technical' || field === 'leader') {
                const harvestRoleIds = [];
                harvestRole.map((r) => { harvestRoleIds.push(r._id); });
                await PlanRoleMapping.deleteMany({ _id: { $in: harvestRoleIds } });
                if (vHarvesting[field]) {
                  const updatedField = buildRoleMapping(planId, field, vHarvesting[field], '2');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                  await updateToBlockchain(savedRole);
                }
              } else {
                currentHarvesting[field] = vHarvesting[field] || currentHarvesting[field];
              }
            }
          });
          const savedHarvesting = await currentHarvesting.save();
          await updateToBlockchain(savedHarvesting);
        }
        if (vPreliminaryTreatment) {
          console.log('UPDATE vPreliminaryTreatment');

          // Update Preliminary
          // TODO: update Image
          const currentPreliminaryTreatment = await ProductPlanPreliminaryTreatment.findOne({ _id: preliminaryTreatment });
          const preliminaryFields = ['leader', 'technical', 'estimatedQuantity', 'estimatedTime'];
          preliminaryFields.map(async (field) => {
            if (vPreliminaryTreatment && vPreliminaryTreatment[field]) {
              if (field === 'technical' || field === 'leader') {
                const preliminaryTreatmentRoleIds = [];
                preliminaryTreatmentRole.map((r) => { preliminaryTreatmentRoleIds.push(r._id); });
                await PlanRoleMapping.deleteMany({ _id: { $in: preliminaryTreatmentRoleIds } });
                if (vPreliminaryTreatment[field]) {
                  const updatedField = buildRoleMapping(planId, field, vPreliminaryTreatment[field], '3');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              } else {
                currentPreliminaryTreatment[field] = vPreliminaryTreatment[field] || currentPreliminaryTreatment[field];
              }
            }
          });
          const savedPreliminaryTreatment = await currentPreliminaryTreatment.save();
        }

        if (vCleaning) {
          console.log('UPDATE vCleaning');

          // Update cleaning
          // TODO: update Image
          const currentCleaning = await ProductPlanCleaning.findOne({ _id: cleaning });
          const currentPlanRole = await PlanRoleMapping.find({ productPlan: planId });
          const cleaningFields = ['estimatedTime', 'estimatedQuantity', 'leader', 'technical'];
          cleaningFields.map(async (field) => {
            if (vCleaning && vCleaning[field]) {
              if (field === 'technical' || field === 'leader') {
                const cleaningRoleIds = [];
                cleaningRole.map((r) => { cleaningRoleIds.push(r._id); });
                await PlanRoleMapping.deleteMany({ _id: { $in: cleaningRoleIds } });
                if (vCleaning[field]) {
                  const updatedField = buildRoleMapping(planId, field, vCleaning[field], '4');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              } else {
                currentCleaning[field] = vCleaning[field] || currentCleaning[field];
              }
            }
          });
          const savedCleanning = await currentCleaning.save();
        }
        if (vPacking) {
          console.log('UPDATE vPacking');

          // Update packing
          // TODO: update Image
          const currentPacking = await ProductPlanPacking.findOne({ _id: packing });
          const packingFields = ['estimatedTime', 'estimatedQuantity', 'estimatedExpireTimeStart', 'estimatedExpireTimeEnd', 'technical', 'leader', 'packing'];
          packingFields.map(async (field) => {
            if (vPacking && vPacking[field]) {
              if (field === 'leader' || field === 'technical') {
                const packingRoleIds = [];
                packingRole.map((r) => { packingRoleIds.push(r._id); });
                await PlanRoleMapping.deleteMany({ _id: { $in: packingRoleIds } });
                if (vPacking[field]) {
                  const updatedField = buildRoleMapping(planId, field, vPacking[field], '5');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              } else {
                currentPacking[field] = vPacking[field] || currentPacking[field];
              }
            }
          });
          const savedPacking = await currentPacking.save();
        }
        if (vPreservation) {
          console.log('UPDATE vPreservation');

          // Update preserve
          // TODO: update Image
          const currentPreserve = await ProductPlanPreserve.findOne({ _id: preservation });
          const preserveField = ['estimatedStartTime', 'estimatedEndTime', 'technical'];
          preserveField.map(async (field) => {
            if (vPreservation && vPreservation[field]) {
              if (field === 'technical') {
                const preserveRoleIds = [];
                preserveRole.map((r) => { preserveRoleIds.push(r._id); });
                await PlanRoleMapping.deleteMany({ _id: { $in: preserveRoleIds } });
                if (vPreservation[field]) {
                  const updatedField = buildRoleMapping(planId, field, vPreservation[field], '6');
                  const savedRole = await PlanRoleMapping.insertMany(updatedField);
                }
              } else {
                currentPreserve[field] = vPreservation[field] || currentPreserve[field];
              }
            }
          });
          const savedPreserve = await currentPreserve.save();
        }
        currentProductPlan.createdBy = user;
        const savedProductPlan = await currentProductPlan.save();
        // Commit transaction if everything OK
        (await session).commitTransaction();
        await updateToBlockchain(currentProductPlan);
        return savedProductPlan;
      } catch (e) {
        (await session).abortTransaction();
        if (e.kind === 'ObjectId') {
          throw new Error('FIND.ERROR.PLAN_NOT_FOUND');
        }
        throw new Error(e.message);
      } finally {
        (await session).endSession();
      }
    }
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  update,
};
