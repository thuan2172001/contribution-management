import Promise from 'bluebird';
import QRCode from '../../../../models/qrcode';
import User from '../../../../models/user';
import { saveImageAndGetHashList } from '../../../../utils/image-utils';
import ExportOrder from '../../../../models/export_order';
import Agency from '../../../../models/agency';
import ImportOrder from '../../../../models/import_order';
import ShippingOrder from '../../../../models/shipping_order';
import Customer from '../../../../models/customer';
import CustomerOrder from '../../../../models/customer_order';

const create = async (args = {}, body = {}, user) => {
  const validateBody = async (body = {}) => {
    const {
      exportType,
      buyer,
      products,
      orderImage,
      importAgency,
      importAgencyAddress,
      shipping,
      status,
    } = body;
    const validateErrorPre = 'VALIDATE.ERROR.EXPORT_ORDER';
    if (!exportType) throw new Error(`${validateErrorPre}.MISSING_EXPORT_TYPE`);
    const validExportType = ['1', '2'];
    if (status) {
      const validStatus = ['1', '2', '3'];
      if (!validStatus.includes(status)) throw new Error(`${validateErrorPre}.INVALID_STATUS`);
    }
    if (!validExportType.includes(exportType)) throw new Error(`${validateErrorPre}.INVALID_EXPORT_TYPE`);
    if (exportType === '1') {
      if (!(buyer && buyer.name)) throw new Error(`${validateErrorPre}.MISSING_BUYER_NAME`);
      if (!(buyer && buyer.phone)) throw new Error(`${validateErrorPre}.MISSING_BUYER_PHONE`);
      if (!(products && products.length > 0)) throw new Error(`${validateErrorPre}.MISSING_PRODUCTS`);
      if (!orderImage) throw new Error(`${validateErrorPre}.MISSING_ORDER_IMAGE`);
      if (!orderImage.path) throw new Error(`${validateErrorPre}.MISSING_IMAGE_PATH`);
    } else if (exportType === '2') {
      if (!importAgency) throw new Error(`${validateErrorPre}.MISSING_IMPORT_AGENCY`);
      if (!importAgencyAddress) throw new Error(`${validateErrorPre}.MISSING_IMPORT_AGENCY_ADDRESS`);
      if (!shipping) throw new Error(`${validateErrorPre}.MISSING_SHIPPING_INFO`);
      if (shipping) {
        if (!shipping.shipper) {
          throw new Error(`${validateErrorPre}.MISSING_SHIPPER`);
        }
      }
    }
    return body;
  };
  const {
    exportType,
    buyer,
    products,
    orderImage,
    importAgency,
    shipping,
    importAgencyAddress,
    status,
    location,
  } = await validateBody(body);
  try {
    const createErrorPre = 'CREATE.ERROR.EXPORT_ORDER';
    const validProductQRs = await QRCode.find({
      _id: { $in: products }, isActive: true, type: 1, 'retailInfo.isSold': false,
    });
    if (validProductQRs.length < 1) throw new Error(`${createErrorPre}.MUST_HAVE_AT_LEAST_1_PRODUCT_QR`);
    const validPackageQRs = await QRCode.find({ _id: { $in: products }, isActive: true, type: 2 });
    const validProducts = validProductQRs.concat(validPackageQRs);
    const validQRs = [];
    validProducts.map((e) => {
      validQRs.push(e._id);
    });
    if (validQRs.length < 1) throw new Error(`${createErrorPre}.ALL_PRODUCTS_ARE_INVALID`);
    const userInfo = await User.findOne({ _id: user });
    if (!userInfo.agency) throw new Error(`${createErrorPre}.USER_DOES_NOT_BELONG_TO_ANY_AGENCY`);
    if (exportType === '1') {
      // Nếu loại xuất kho là bán lẻ
      const savedImage = await saveImageAndGetHashList([orderImage]);
      const newExportOrder = new ExportOrder({
        exportType,
        buyer,
        products: validQRs,
        status: '1',
        orderImage: savedImage[0],
        createdBy: user,
        exportAgency: userInfo.agency,
      });
      if (status && status === '3') {
        // Nếu bấm luôn xuất kho mà ko bấm lưu thì
        // với lệnh bán lẻ sẽ đổi trạng thái thành đã xuất kho luôn
        newExportOrder.status = '3';

        // Check xem có user chưa, nếu có rồi thì tạo lịch sử mua hàng
        // Nếu chưa có user thì tạo user mới và tạo cả lịch sử mua hàng
        const currentCustomer = await Customer.findOne({
          username: buyer.phone,
        });
        if (currentCustomer) {
          // Đã tồn tại khách hàng
          // Tạo lịch sử mua hàng mới cho khách hàng đó
          const newOrder = new CustomerOrder({
            sellAgency: userInfo.agency,
            products: validQRs,
            customer: currentCustomer._id,
            seller: user,
            location,
          });
          await newOrder.save();
        } else {
          // Chưa có khách hàng, tạo khách hàng mới
          const newCustomer = new Customer({
            username: buyer.phone,
            fullName: buyer.name,
          });
          const newOrder = new CustomerOrder({
            sellAgency: userInfo.agency,
            products: validQRs,
            customer: newCustomer._id,
            seller: user,
            location,
          });
          await newCustomer.save();
          // Gán biến newCustomer vào currentCustomer để lấy ra id cập nhật người mua cho mã qr
          await newOrder.save();
        }
        // Cập nhật thông tin bán lẻ cho mã qr
        await QRCode.updateMany({ _id: { $in: validProducts } }, {
          $set: {
            isSold: true,
            soldDate: new Date(),
            soldAt: userInfo.agency,
            soldBy: user,
            buyer: currentCustomer._id,
          },
        });
      }
      return await newExportOrder.save();
    } if (exportType === '2') {
      // Nếu loại xuất kho là phân phối
      const savedImage = await saveImageAndGetHashList([orderImage]);
      const importAgencyInfo = await Agency.findOne({ _id: importAgency });
      if (!importAgencyInfo) throw new Error(`${createErrorPre}.IMPORT_AGENCY_NOT_FOUND`);
      const validShipper = await User.findOne({ _id: shipping.shipper });
      if (!validShipper) throw new Error(`${createErrorPre}.INVALID_SHIPPER`);
      if (!validShipper.agency) {
        throw new Error(`${createErrorPre}.SHIPPER_DOES_NOT_BELONG_TO_ANY_SHIPPING_AGENCY`);
      }
      // Tạo đơn xuất kho mới
      const newExportOrder = new ExportOrder({
        exportType,
        products: validQRs,
        orderImage: savedImage[0],
        createdBy: user,
        status: '1',
        exportAgency: userInfo.agency,
        importAgency,
        importAgencyAddress,
        shipping: {
          gsin: shipping.gsin,
          sscc: shipping.sscc,
          shipper: shipping.shipper,
        },
      });
      const exportDate = new Date();
      // Cập nhật thông tin xuất kho vào cho mã QR
      await Promise.each(validProducts, async (product) => {
        const shippingObject = {
          from: {
            agency: userInfo.agency,
            time: exportDate,
          },
          to: {
            agency: importAgency,
          },
          createdAt: exportDate,
        };
        product.shippingHistory.push(shippingObject);
        await product.save();
      });
      if (status && status === '2') {
        // Nếu bấm luôn lệnh xuất kho thì
        // VỚi lệnh phân phối sẽ tạo thêm 2 đơn hàng import order và shipping order
        newExportOrder.status = status;
        newExportOrder.exportedBy = user;
        newExportOrder.exportedAt = new Date();
        const newImportOrder = new ImportOrder({
          exportAgency: newExportOrder.exportAgency,
          exportedAt: newExportOrder.exportedAt,
          shipping: newExportOrder.shipping,
          products: newExportOrder.products,
          exportOrder: newExportOrder._id,
          status: '1',
        });
        await newImportOrder.save();
        const newShippingOrder = new ShippingOrder({
          exportAgency: newExportOrder.exportAgency,
          importAgency: newExportOrder.importAgency,
          products: newExportOrder.products,
          exportOrder: newExportOrder._id,
          importAgencyAddress: newExportOrder.importAgencyAddress,
          status: '1',
          shipper: newExportOrder.shipping.shipper,
        });
        await newShippingOrder.save();
      }
      return await newExportOrder.save();
    }
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  create,
};
