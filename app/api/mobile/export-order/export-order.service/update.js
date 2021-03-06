import Promise from 'bluebird';
import ExportOrder from '../../../../models/export_order';
import ImportOrder from '../../../../models/import_order';
import ShippingOrder from '../../../../models/shipping_order';
import Customer from '../../../../models/customer';
import CustomerOrder from '../../../../models/customer_order';
import User from '../../../../models/user';
import QRCode from '../../../../models/qrcode';

const update = async (args = {}, body = {}, user) => {
  const validateBody = async (args = {}) => {
    const {
      status,
    } = args;
    const validateErrorPre = 'VALIDATE.ERROR.EXPORT_ORDER';
    if (!status) throw new Error(`${validateErrorPre}.MISSING_STATUS`);
    const validStatus = ['2', '3'];
    if (!validStatus.includes(status)) throw new Error(`${validateErrorPre}.INVALID_STATUS`);
    return args;
  };
  const validateArgs = (arg = {}) => {
    const { orderId } = arg;
    if (!orderId) throw new Error('FIND.ERROR.EXPORT_ORDER.MISSING_ORDER_ID');
    return arg;
  };
  const {
    status,
  } = await validateBody(body);
  const { orderId } = await validateArgs(args);
  try {
    const updateErrorPre = 'UPDATE.ERROR.EXPORT_ORDER';
    const currentExportOrder = await ExportOrder.findOne({ _id: orderId, createdBy: user });
    if (currentExportOrder) {
      if (currentExportOrder.exportType === '2') {
        if (currentExportOrder.status === '2') {
          throw new Error(`${updateErrorPre}.ORDER_IS_WAITING_TO_BE_PICK_UP`);
        } else {
          currentExportOrder.status = status;
          currentExportOrder.exportedBy = user;
          currentExportOrder.exportedAt = new Date();
          // Nếu loại xuất kho là xuất kho phân phối thì tạo lênh nhập kho + lệnh ship hàng
          const newImportOrder = new ImportOrder({
            exportAgency: currentExportOrder.exportAgency,
            exportedAt: currentExportOrder.exportedAt,
            shipping: currentExportOrder.shipping,
            products: currentExportOrder.products,
            exportOrder: currentExportOrder._id,
            status: '1',
          });
          await newImportOrder.save();
          const newShippingOrder = new ShippingOrder({
            exportAgency: currentExportOrder.exportAgency,
            importAgency: currentExportOrder.importAgency,
            products: currentExportOrder.products,
            exportOrder: currentExportOrder._id,
            importAgencyAddress: currentExportOrder.importAgencyAddress,
            status: '1',
            shipper: currentExportOrder.shipping.shipper,
          });
          await newShippingOrder.save();
          const savedExportOrder = await currentExportOrder.save();
          return savedExportOrder;
        }
      } else if (currentExportOrder.exportType === '1') {
        if (status && status === '3') {
          currentExportOrder.status = '3';
          const savedExportOrder = await currentExportOrder.save();
          // Check xem có user chưa, nếu có rồi thì tạo lịch sử mua hàng
          // Nếu chưa có user thì tạo user mới và tạo cả lịch sử mua hàng
          const currentCustomer = await Customer.findOne({
            username: currentExportOrder.buyer.phone,
          });
          const userInfo = await User.findOne({ _id: user });
          if (!userInfo.agency) throw new Error(`${updateErrorPre}.USER_DOES_NOT_BELONG_TO_ANY_AGENCY`);
          if (currentCustomer) {
            // Đã tồn tại khách hàng
            // Tạo lịch sử mua hàng mới cho khách hàng đó
            const newOrder = new CustomerOrder({
              sellAgency: userInfo.agency,
              products: currentExportOrder.products,
              customer: currentCustomer._id,
              seller: user,
            });
            await newOrder.save();
          } else {
            // Chưa có khách hàng, tạo khách hàng mới
            const newCustomer = new Customer({
              username: currentExportOrder.buyer.phone,
              fullName: currentExportOrder.buyer.name,
            });
            const newOrder = new CustomerOrder({
              sellAgency: userInfo.agency,
              products: currentExportOrder.products,
              customer: newCustomer._id,
              seller: user,
            });
            await newCustomer.save();
            await newOrder.save();
          }
          // Cập nhật thông tin bán lẻ cho mã qr
          await QRCode.updateMany({ _id: { $in: currentExportOrder.products } }, {
            $set: {
              isSold: true,
              soldDate: new Date(),
              soldAt: userInfo.agency,
              soldBy: user,
              buyer: currentCustomer._id,
            },
          });
          return savedExportOrder;
        }
        throw new Error(`${updateErrorPre}.CAN_ONLY_RECEIVE_STATUS_3`);
      }
    } throw new Error(`${updateErrorPre}.EXPORT_ORDER_NOT_FOUND`);
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  update,
};
