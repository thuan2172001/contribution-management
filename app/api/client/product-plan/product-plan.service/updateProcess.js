import ProductPlan from '../../../../models/product_plan';

// API OK
const updateProcess = async (args = {}, body = {}) => {
  // Tách update process riêng ra vì để còn validate lại một lần nữa xem data ở step trước đã đầy đủ chưa
  const validateBody = async (body = {}) => {
    const {
      process,
    } = body;
    if (process) {
      const validStep = ['1', '2', '3', '4', '5', '6'];
      if (!validStep.includes(process)) {
        throw new Error('FIND.ERROR.INVALID_PROCESS_NUMBER');
      }
    }
    return body;
  };
  const validateArgs = async (args = {}) => {
    const {
      planId,
    } = args;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return args;
  };
  const { process } = await validateBody(body);
  const { planId } = await validateArgs(args);
  try {
    const currentProductPlan = await ProductPlan.findOne({ _id: planId });
    if (currentProductPlan) {
      if (currentProductPlan.step !== '1' || currentProductPlan.confirmationStatus !== '2') {
        throw new Error('UPDATE.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_IS_WAITING_TO_CONFIRM');
      }
      const nextProcess = parseInt(currentProductPlan.process) + 1;
      if (nextProcess === parseInt(process)) {
        currentProductPlan.process = nextProcess.toString();
        const savedProductPlan = await currentProductPlan.save();
        return savedProductPlan;
      }
      throw new Error('UPDATE.ERROR.PRODUCT_PLAN.NEXT_STEP_NOT_CORRECT');
    } else {
      throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
    }
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  updateProcess,
};
