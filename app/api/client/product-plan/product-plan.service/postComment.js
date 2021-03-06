import ProductPlan from '../../../../models/product_plan';
import { createNoti } from '../../notification/notification.service';

const postComment = async (args = {}, body, user) => {
  const validateArgs = (arg = {}) => {
    const { planId } = arg;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return arg;
  };
  const validateBody = (bodyArgs = {}) => {
    const { content } = bodyArgs;
    if (!content) throw new Error('FIND.ERROR.MESSAGE_CANNOT_BE_EMPTY');
    return bodyArgs;
  };
  const { planId } = await validateArgs(args);
  const { content } = await validateBody(body);
  try {
    const productPlan = await ProductPlan.findOne({ _id: planId }).populate('content');
    if (productPlan) {
      const { comments } = productPlan;
      comments.push({
        createdBy: user,
        createdAt: new Date(),
        content,
      });
      productPlan.comments = comments;
      await productPlan.save();
      const newPlan = await ProductPlan.findOne({ _id: planId }).populate({
        path: 'comments',
        select: [
          'fullName',
        ],
        populate: {
          path: 'createdBy',
          select: ['fullName'],
        },
      }).select(['comments', 'code']);
      await createNoti(`Kế hoạch ${newPlan.code} có comment mới`, 'all', true);

      return newPlan.comments;
    }
    throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  postComment,
};
