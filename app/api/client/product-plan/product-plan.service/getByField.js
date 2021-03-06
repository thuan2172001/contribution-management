import ProductPlan from '../../../../models/product_plan';
import ProductPlanConfig from '../product-plan.config.json';
import PlanRoleMapping from '../../../../models/plan_role_mapping';

const getByField = async (args = {}) => {
  const validFields = ['seeding', 'comments', 'planting', 'harvesting', 'preliminaryTreatment', 'cleaning', 'packing', 'preservation', 'history'];
  const validateArgs = (arg = {}) => {
    const { productPlanField } = arg;
    if (!productPlanField) throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.INVALID_FIELD');
    if (!validFields.includes(productPlanField)) {
      throw new Error('VALIDATE.ERROR.PRODUCT_PLAN.INVALID_FIELD');
    }
    return arg;
  };
  const { productPlanField, planId } = await validateArgs(args);
  const processNameMapping = [
    { process: '2', name: 'harvesting' },
    { process: '3', name: 'preliminaryTreatment' },
    { process: '4', name: 'cleaning' },
    { process: '5', name: 'packing' },
    { process: '6', name: 'preservation' },
  ];

  const currentProcess = processNameMapping.filter((x) => x.name === productPlanField)[0];
  try {
    const responseData = await ProductPlan.findOne({ _id: planId }).lean().select(productPlanField).populate(ProductPlanConfig[productPlanField]);
    if (responseData) {
      if (currentProcess) {
        const planRoleMapping = await PlanRoleMapping.find({ productPlan: planId, process: currentProcess.process }).lean().select('process user role startTime endTime notes isRecieved isDone').populate({ path: 'user', select: 'firstName lastName fullName' });
        responseData[currentProcess.name].technical = planRoleMapping.filter((e) => e.role === 'technical');
        responseData[currentProcess.name].leader = planRoleMapping.filter((e) => e.role === 'leader');
        responseData[currentProcess.name].worker = planRoleMapping.filter((e) => e.role === 'worker');
      }
      return responseData;
    }
    throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  getByField,
};
