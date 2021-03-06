import _ from 'lodash';
import ProductPlan from '../../../../models/product_plan';
import QRCode from '../../../../models/qrcode';
import ProductPlanPacking from '../../../../models/product_plan_packing';

// API OK
const mergePackingQrCode = async (args = {}, body = {}, user) => {
  // Tách update process riêng ra vì để còn validate lại một lần nữa xem data ở step trước đã đầy đủ chưa
  const validateBody = async (body = {}) => {
    const {
      qrcode, quantity,
    } = body;
    if (!qrcode) throw new Error('VALIDATE.ERROR.MISSING_QRCODE');
    if (!quantity) throw new Error('VALIDATE.ERROR.MISSING_QUANTITY');
    if (quantity <= 0) throw new Error('VALIDATE.ERROR.QUANTITY_MUST_GREATER_THAN_0');
    return body;
  };
  const validateArgs = async (args = {}) => {
    const {
      planId,
    } = args;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return args;
  };
  const { qrcode, quantity } = await validateBody(body);
  const { planId } = await validateArgs(args);
  try {
    // TODO check xem loại qr là product hay packing, chỉ cho update qr product
    const qrCodeInfo = await QRCode.findOne({ _id: qrcode });
    const productPlan = await ProductPlan.findOne({ _id: planId }).populate('packing planting');
    if (!qrCodeInfo) throw new Error('UPDATE.ERROR.PRODUCT_PLAN.QR_CODE_NOT_FOUND');
    if (qrCodeInfo.type === '2') throw new Error('UPDATE.ERROR.PRODUCT_PLAN.CAN_ONLY_ASSIGN_PRODUCT_QR');
    if (!productPlan) throw new Error('UPDATE.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
    if (!productPlan.packing && productPlan.packing.sampleImage) throw new Error('UPDATE.ERROR.PRODUCT_PLAN.NOT_FOUND_SAMPLE_IMAGE');
    if (!productPlan.packing && productPlan.packing.packing) throw new Error('UPDATE.ERROR.PRODUCT_PLAN.NOT_FOUND_PACKING_OF_PRODUCT_PLAN');
    let masterImage;
    if (productPlan.packing && productPlan.packing.sampleImage) {
      masterImage = productPlan.packing.sampleImage.filter((img) => img.isMaster === true);
      masterImage = masterImage[0];
    }
    if (!masterImage) throw new Error('UPDATE.ERROR.PRODUCT_PLAN.MASTER_IMAGE_NOT_FOUND');
    if (!qrCodeInfo.productPlan) {
      const packingInfo = await ProductPlanPacking.findOne({ _id: productPlan.packing });
      packingInfo.products.push(qrCodeInfo._id.toString());
      await packingInfo.save();
      qrCodeInfo.productPlan = planId;
      qrCodeInfo.scanAt = new Date();
      qrCodeInfo.scanBy = user;
      qrCodeInfo.quantity = quantity;
      qrCodeInfo.species = productPlan.planting.species;
      qrCodeInfo.sampleImage = masterImage;
      qrCodeInfo.packing = productPlan.packing.packing;
      const savedQR = await qrCodeInfo.save();
      return savedQR;
    } throw new Error('UPDATE.ERROR.QR_CODE_HAS_BEEN_ASSIGNED');
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  mergePackingQrCode,
};
