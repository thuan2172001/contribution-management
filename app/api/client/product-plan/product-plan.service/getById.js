import ProductPlan from '../../../../models/product_plan';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import ProductPlanConfig from '../product-plan.config.json';
import { compareWithBlockchain } from '../../../../services/blockchain/hashProcess';

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { planId } = arg;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return arg;
  };
  const { planId } = await validateArgs(args);
  try {
    const productPlan = await ProductPlan.findOne({ _id: planId }).lean().populate([
      ProductPlanConfig.seeding,
      ProductPlanConfig.planting,
      ProductPlanConfig.harvesting,
      ProductPlanConfig.preliminaryTreatment,
      ProductPlanConfig.cleaning,
      ProductPlanConfig.packing,
      ProductPlanConfig.preservation,
      ProductPlanConfig.comment,
      ProductPlanConfig.createdBy,
    ]);
    if (productPlan) {
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
      if (productPlan.isMaster) {
        if (productPlan.process > 2) {
          const selectArray = ['-comments'];
          const processArray = ['-harvesting', '-preliminaryTreatment', '-cleaning', '-packing', '-preservation'];
          for (let i = 7; i >= 2; i--) {
            if (i > productPlan.process) {
              selectArray.push(processArray[i - 3]);
            }
          }
          const productPlanToCompare = await ProductPlan.findOne({ _id: planId }).select(selectArray).populate('harvesting preliminaryTreatment cleaning packing preservation');
          mappingInfo.forEach((m) => {
            const mapRoleProcess = planRoleMapping.filter((e) => e.process === m.process);
            if (!productPlanToCompare[m.name]) return;
            productPlanToCompare[m.name].technical = mapRoleProcess.filter((e) => e.role === 'technical');
            productPlanToCompare[m.name].leader = mapRoleProcess.filter((e) => e.role === 'leader');
            productPlanToCompare[m.name].worker = mapRoleProcess.filter((e) => e.role === 'worker');
          });
          await compareWithBlockchain(productPlanToCompare);
        }
      }
      return productPlan;
    }
    throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  getById,
};
