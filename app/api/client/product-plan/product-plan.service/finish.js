import ProductPlan from '../../../../models/product_plan';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import ProductPlanHarvesting from '../../../../models/product_plan_harvesting';
import ProductPlanPreliminaryTreatment from '../../../../models/product_plan_preliminary_treatment';
import ProductPlanCleaning from '../../../../models/product_plan_cleaning';
import ProductPlanPacking from '../../../../models/product_plan_packing';
import ProductPlanPreserve from '../../../../models/product_plan_preserve';
import { createNoti } from '../../notification/notification.service';
import { updateToBlockchain, compareWithBlockchain } from '../../../../services/blockchain/hashProcess';
import ProductPlanConfig from '../product-plan.config.json';

function checkStepDone(arg = {}) {
  arg = JSON.parse(JSON.stringify(arg));
  for (const [prop, value] of Object.entries(arg)) {
    if (prop === 'imageBefore' || prop === 'imageAfter' || prop === 'storageImage' || prop === 'packingImage' || prop === 'sampleImage') {
      if (arg[prop].length < 1) return false;
      const totalMasterImage = arg[prop].filter((img) => img.isMaster === true);
      if (totalMasterImage < 1) return false;
    }
    if (prop === 'imageInProgress') {
      if (arg[prop].length < 1) return false;
    }
    if (prop === 'startTime' || prop === 'quantity' || prop === 'temperature' || prop === 'humidity' || prop === 'porosity') {
      if (!arg[prop]) return false;
    }
  }
  return true;
}
// API OK
const finish = async (args = {}, body = {}, user) => {
  const validateArgs = async (args = {}) => {
    const {
      planId,
      productPlanField,
    } = args;
    if (!planId) throw new Error('VALIDATE.ERROR.PLAN_ID_NOT_FOUND');
    if (!productPlanField) throw new Error('VALIDATE.ERROR.PLAN_FIELD_NOT_FOUND');
    const validField = ['harvesting', 'preliminaryTreatment', 'cleaning', 'packing', 'preservation'];
    if (!validField.includes(productPlanField)) {
      throw new Error('VALIDATE.ERROR.PLAN_FIELD_INVALID');
    }
    return args;
  };
  const { planId, productPlanField } = await validateArgs(args);
  // TODO validate body
  const { process, role } = body;
  if (!role) {
    throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.MISSING_ROLE');
  }
  try {
    const currentProductPlan = await ProductPlan.findOne({ _id: planId }).populate(
      {
        path: productPlanField,
      },
    );
    if (currentProductPlan) {
      const currentProcess = currentProductPlan.process;
      if (currentProcess === process) {
        const currentPlanRoleMapping = await PlanRoleMapping.findOne({
          isRecieved: true,
          user,
          role,
          process,
          productPlan: planId,
          isDone: false,
        });
        if (currentPlanRoleMapping) {
          currentPlanRoleMapping.isDone = true;
          // Nếu ở các bước khac thì leader là người finish
          if (currentPlanRoleMapping.role === 'leader' && (process === '2' || process === '3' || process === '4')) {
            // const isDone = checkStepDone(currentProductPlan[productPlanField]);
            const isDone = true;
            if (isDone) {
              const nextProcess = (parseInt(process) + 1).toString();
              currentProductPlan.process = nextProcess;
              let updatedAttr;
              if (process === '2') {
                updatedAttr = await ProductPlanHarvesting
                  .updateOne({ _id: currentProductPlan[productPlanField]._id }, {
                    $set: {
                      endTime: new Date(),
                    },
                  });
                await createNoti(`Kế hoạch ${currentProductPlan.code} đã hoàn thành thu hoạch`, 'all', true);
              }
              if (process === '3') {
                updatedAttr = await ProductPlanPreliminaryTreatment
                  .updateOne({ _id: currentProductPlan[productPlanField]._id }, {
                    $set: {
                      endTime: new Date(),
                    },
                  });
                await createNoti(`Kế hoạch ${currentProductPlan.code} đã hoàn thành sơ chế`, 'all', true);
              }
              if (process === '4') {
                updatedAttr = await ProductPlanCleaning
                  .updateOne({ _id: currentProductPlan[productPlanField]._id }, {
                    $set: {
                      endTime: new Date(),
                    },
                  });
                await createNoti(`Kế hoạch ${currentProductPlan.code} đã hoàn thành làm sạch`, 'all', true);
              }
              if (updatedAttr && updatedAttr.nModified === 1) {
                await currentProductPlan.save();
                const savedMapping = await currentPlanRoleMapping.save();
                await PlanRoleMapping.updateMany({
                  process,
                  productPlan: planId,
                  isDone: false,
                }, { $set: { isDone: true } });

                // update hash to blockchain
                if (currentProductPlan.process > 2) {
                  const processArray = ['-harvesting', '-preliminaryTreatment', '-cleaning', '-packing', '-preservation'];
                  const selectArray = ['-comments'];
                  selectArray = selectArray.concat(processArray.slice(0, currentProductPlan.process - 3));
                  const productPlan = await ProductPlan.findOne({ _id: planId }).select(selectArray).populate('harvesting preliminaryTreatment cleaning packing preservation');
                  const planRoleMapping = await PlanRoleMapping.find({ productPlan: planId }).lean().select('process user role isRecieved').populate({ path: 'user', select: 'firstName lastName fullName' });
                  const mappingInfo = [
                    { process: '2', name: 'harvesting' },
                    { process: '3', name: 'preliminaryTreatment' },
                    { process: '4', name: 'cleaning' },
                    { process: '5', name: 'packing' },
                    { process: '6', name: 'preservation' },
                  ];
                  mappingInfo.forEach((m) => {
                    const mapRoleProcess = planRoleMapping.filter((e) => e.process === m.process);
                    if (!productPlan[m.name]) return;
                    productPlan[m.name].technical = mapRoleProcess.filter((e) => e.role === 'technical');
                    productPlan[m.name].leader = mapRoleProcess.filter((e) => e.role === 'leader');
                    productPlan[m.name].worker = mapRoleProcess.filter((e) => e.role === 'worker');
                  });
                  await updateToBlockchain(productPlan);
                }
                return savedMapping;
              }
              throw new Error('UPDATE.ERROR.PRODUCT_PLAN.UPDATE_END_TIME_ERROR');
            } else {
              throw new Error('UPDATE.ERROR.SOME_FIELD_DOES_NOT_HAVE_DATA');
            }
          } else if (currentPlanRoleMapping.role === 'technical' && (process === '5' || process === '6')) {
            // const isDone = checkStepDone(currentProductPlan[productPlanField]);
            const isDone = true;
            if (isDone) {
              const nextProcess = (parseInt(process) + 1).toString();
              currentProductPlan.process = nextProcess;
              let updatedAttr;
              if (process === '5') {
                updatedAttr = await ProductPlanPacking
                  .updateOne({ _id: currentProductPlan[productPlanField]._id }, {
                    $set: {
                      endTime: new Date(),
                    },
                  });
                await createNoti(`Kế hoạch ${currentProductPlan.code} đã hoàn thành đóng gói`, 'all', true);
              }
              if (process === '6') {
                console.log('Process 6');
                console.log(currentProductPlan[productPlanField]);
                updatedAttr = await ProductPlanPreserve
                  .updateOne({ _id: currentProductPlan[productPlanField]._id }, {
                    $set: {
                      endTime: new Date(),
                    },
                  });
                await createNoti(`Kế hoạch ${currentProductPlan.code} đã hoàn thành bảo quản`, 'all', true);
              }
              if (updatedAttr && updatedAttr.nModified === 1) {
                await currentProductPlan.save();
                const savedMapping = await currentPlanRoleMapping.save();
                await PlanRoleMapping.updateMany({
                  process,
                  productPlan: planId,
                  isDone: false,
                }, { $set: { isDone: true } });

                // update hash to blockchain
                // update hash to blockchain
                if (currentProductPlan.process > 2) {
                  const processArray = ['-harvesting', '-preliminaryTreatment', '-cleaning', '-packing', '-preservation'];
                  const selectArray = ['-comments'];
                  selectArray = selectArray.concat(processArray.slice(0, currentProductPlan.process - 3));
                  const productPlan = await ProductPlan.findOne({ _id: planId }).select(selectArray).populate('harvesting preliminaryTreatment cleaning packing preservation');
                  const planRoleMapping = await PlanRoleMapping.find({ productPlan: planId }).lean().select('process user role isRecieved').populate({ path: 'user', select: 'firstName lastName fullName' });
                  const mappingInfo = [
                    { process: '2', name: 'harvesting' },
                    { process: '3', name: 'preliminaryTreatment' },
                    { process: '4', name: 'cleaning' },
                    { process: '5', name: 'packing' },
                    { process: '6', name: 'preservation' },
                  ];
                  mappingInfo.forEach((m) => {
                    const mapRoleProcess = planRoleMapping.filter((e) => e.process === m.process);
                    if (!productPlan[m.name]) return;
                    productPlan[m.name].technical = mapRoleProcess.filter((e) => e.role === 'technical');
                    productPlan[m.name].leader = mapRoleProcess.filter((e) => e.role === 'leader');
                    productPlan[m.name].worker = mapRoleProcess.filter((e) => e.role === 'worker');
                  });
                  await updateToBlockchain(productPlan);
                }
                return savedMapping;
              }
              throw new Error('UPDATE.ERROR.PRODUCT_PLAN.UPDATE_END_TIME_ERROR');
            } else {
              throw new Error('UPDATE.ERROR.SOME_FIELD_DOES_NOT_HAVE_DATA');
            }
          }
          const savedMapping = await currentPlanRoleMapping.save();
          return savedMapping;
        }
        throw new Error('FIND.ERROR.PRODUCT_PLAN.PLAN_ROLE_MAPPING_NOT_FOUND');
      } else {
        throw new Error('UPDATE.ERROR.PROCESS_NUMBER_NOT_CORRECT');
      }
    } else throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  finish,
};
