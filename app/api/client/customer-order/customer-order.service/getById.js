import CustomerOrder from '../../../../models/customer_order';

const getById = async (args = {}) => {
  const validateArgs = (arg = {}) => {
    const { orderId } = arg;
    if (!orderId) throw new Error('FIND.ERROR.CUSTOMER_ORDER.ORDER_ID_NOT_FOUND');
    return arg;
  };
  const { orderId } = await validateArgs(args.params);
  try {
    const currentOrder = await CustomerOrder.findOne({ _id: orderId })
      .lean()
      .populate([
        {
          path: 'products',
          populate: ['species', 'packing'],
        },
        {
          path: 'sellAgency',
          select: 'name',
        },
        {
          path: 'customer',
          select: 'fullName',
        },
        {
          path: 'seller',
          select: 'fullName',
        },
      ]);
    if (currentOrder) {
      return currentOrder;
    }
    throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  getById,
};
