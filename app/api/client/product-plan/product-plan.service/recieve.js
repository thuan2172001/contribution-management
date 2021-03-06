import ProductPlan from '../../../../models/product_plan';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import ProductPlanHarvesting from '../../../../models/product_plan_harvesting';
import ProductPlanPreliminaryTreatment from '../../../../models/product_plan_preliminary_treatment';
import ProductPlanCleaning from '../../../../models/product_plan_cleaning';
import ProductPlanPacking from '../../../../models/product_plan_packing';
import ProductPlanPreserve from '../../../../models/product_plan_preserve';

// API OK
const recieve = async (args = {}, body = {}, user) => {
  // Tách update process riêng ra vì để còn validate lại một lần nữa xem data ở step trước đã đầy đủ chưa
  const validateArgs = async (args = {}) => {
    const {
      planId,
    } = args;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return args;
  };
  const validateBody = async (body = {}) => {
    const {
      process, role,
    } = body;
    if (!process) throw new Error('VALIDATE.ERROR.PROCESS_NOT_FOUND');
    if (!role) throw new Error('VALIDATE.ERROR.ROLE_NOT_FOUND');
    const validRole = ['technical', 'leader', 'worker'];
    const validProcess = ['2', '3', '4', '5', '6'];
    if (!validRole.includes(role)) throw new Error('VALIDATE.ERROR.INVALID_ROLE');
    if (!validProcess.includes(process)) throw new Error('VALIDATE.ERROR.INVALID_PROCESS');
    return body;
  };
  const { planId } = await validateArgs(args);
  const { process, role } = await validateBody(body);

  try {
    // Quet xem plan co ton tai khong
    const currentProductPlan = await ProductPlan.findOne({ _id: planId });
    if (currentProductPlan) {
      // TODO Check xem nếu kế hoạch chưa ở process trùng process gửi lên thì không cho nhận vì process trước chưa làm xong

      // Neu co ton tai thi check xem plan nay co dang thuc hien khong, user cos quyen thao tac khong
      const currentPlanRoleMapping = await PlanRoleMapping.findOne({
        isRecieved: false,
        user,
        process,
        role,
        productPlan: planId,
      });
      if (currentPlanRoleMapping) {
        currentPlanRoleMapping.isRecieved = true;
        if (currentPlanRoleMapping.role === 'leader') {
          let updatedAttr;
          if (process === '2') {
            updatedAttr = await ProductPlanHarvesting.updateOne({ _id: currentProductPlan.harvesting }, {
              $set: {
                startTime: new Date(),
              },
            });
          }
          if (process === '3') {
            updatedAttr = await ProductPlanPreliminaryTreatment.updateOne({ _id: currentProductPlan.preliminaryTreatment }, {
              $set: {
                startTime: new Date(),
              },
            });
          }
          if (process === '4') {
            updatedAttr = await ProductPlanCleaning.updateOne({ _id: currentProductPlan.cleaning }, {
              $set: {
                startTime: new Date(),
              },
            });
          }
          if (process === '5') {
            updatedAttr = await ProductPlanPacking.updateOne({ _id: currentProductPlan.packing }, {
              $set: {
                startTime: new Date(),
              },
            });
          }
          if (updatedAttr && updatedAttr.nModified === 1) {
            const savedMapping = await currentPlanRoleMapping.save();
            return savedMapping;
          }
          throw new Error('UPDATE.ERROR.PRODUCT_PLAN.UPDATE_START_TIME_ERROR');
        } else if (currentPlanRoleMapping.role === 'technical' && process === '6') {
          // Bảo quản chỉ có technical nên technical nhận việc thì sẽ tính startTime
          const updatedAttr = await ProductPlanPreserve.updateOne({ _id: currentProductPlan.preservation }, {
            $set: {
              startTime: new Date(),
            },
          });
          if (updatedAttr && updatedAttr.nModified === 1) {
            const savedMapping = await currentPlanRoleMapping.save();
            return savedMapping;
          }
        } else {
          const savedMapping = await currentPlanRoleMapping.save();
          return savedMapping;
        }
      }
      throw new Error('FIND.ERROR.PRODUCT_PLAN.YOU_DO_NOT_HAVE_PERMISSION_ON_THIS_PLAN');
    }
    throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    console.log(e);
    throw new Error(e.message);
  }
};
module.exports = {
  recieve,
};
