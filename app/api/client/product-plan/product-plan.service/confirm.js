import Promise from 'bluebird';
import _ from 'lodash';
import ProductPlan from '../../../../models/product_plan';
import ProductPlanPreliminaryTreatment from '../../../../models/product_plan_preliminary_treatment';
import ProductPlanCleaning from '../../../../models/product_plan_cleaning';
import ProductPlanPreserve from '../../../../models/product_plan_preserve';
import ProductPlanPacking from '../../../../models/product_plan_packing';
import PlanRoleMapping from '../../../../models/plan_role_mapping';
import ProductPlanHarvesting from '../../../../models/product_plan_harvesting';
import { createNoti } from '../../notification/notification.service';
import { updateToBlockchain } from '../../../../services/blockchain/hashProcess';
// API OK
const confirmPlan = async (args = {}, body = {}, user) => {
  // Tách update process riêng ra
  // vì để còn validate lại một lần nữa xem data ở step trước đã đầy đủ chưa
  const validateBody = async (bodyArgs = {}) => {
    const {
      confirmationStatus,
    } = bodyArgs;
    if (confirmationStatus) {
      const validStatus = ['1', '2', '3'];
      if (!validStatus.includes(confirmationStatus)) {
        throw new Error('FIND.ERROR.INVALID_STATUS_NUMBER');
      }
    }
    return bodyArgs;
  };
  const validateArgs = async (arg = {}) => {
    const {
      planId,
    } = arg;
    if (!planId) throw new Error('FIND.ERROR.PLAN_ID_NOT_FOUND');
    return arg;
  };
  const fullBody = await validateBody(body);
  const { confirmationStatus } = fullBody;
  const { planId } = await validateArgs(args);
  let canUpdateProcess = [
    { process: '2', name: 'harvesting' },
    { process: '3', name: 'preliminaryTreatment' },
    { process: '4', name: 'cleaning' },
    { process: '5', name: 'packing' },
    { process: '6', name: 'preservation' }];
  try {
    const currentProductPlan = await ProductPlan.findOne({ _id: planId }).populate('harvesting preliminaryTreatment cleaning packing preservation');
    if (currentProductPlan) {
      // Check xem có phải master không, nếu là master thì update bthg,
      // Nếu không phải master thì duplicate các data khác data ở master và lưu vào master
      if (currentProductPlan.isMaster) {
        // Check xem có đang ở theo dõi không, nếu đang ở theo dõi thì tạo phiên bản mới
        // Nếu đang không ở theo dõi thì cập nhật bình thường
        if (
          currentProductPlan.step === '1'
            && currentProductPlan.confirmationStatus === '2'
            && currentProductPlan.process !== '1'
        ) {
          console.log('Dang o theo doi');
          //= ====================================================================
          // Đang ở theo dõi, tạo phiên bản mới cho nó rồi gửi duyệt cái mới
          canUpdateProcess = canUpdateProcess
            .filter((x) => x.process >= currentProductPlan.process);
          // ConfirmationStatus = 1, step = 0, process = process cũ, isActive = true
          // Lưu plan mới vào history của plan gốc
          // Tạo thêm các sub field mới, lưu id subfield vào plan mới tạo ra
          // Tạo thêm các planRole mới,
          // Check nếu isMaster === false thì cập nhật các thông tin của plan vào plan master
          let toCreatePlanRoleMapping = [];
          const currentHarvesting = currentProductPlan.harvesting;
          const currentPreliminaryTreatment = currentProductPlan.preliminaryTreatment;
          const currentCleaning = currentProductPlan.cleaning;
          const currentPacking = currentProductPlan.packing;
          const currentPreservation = currentProductPlan.preservation;
          // Tạo sub field mới
          const newHarvesting = new ProductPlanHarvesting({
            startTime: currentHarvesting.startTime,
            endTime: currentHarvesting.endTime,
            quantity: currentHarvesting.quantity,
            temperature: currentHarvesting.temperature,
            humidity: currentHarvesting.humidity,
            porosity: currentHarvesting.porosity,
            imageBefore: currentHarvesting.imageBefore,
            imageInProgress: currentHarvesting.imageInProgress,
            imageAfter: currentHarvesting.imageAfter,
          });
          const newPreliminaryTreatment = new ProductPlanPreliminaryTreatment({
            estimatedTime: currentPreliminaryTreatment.estimatedTime,
            startTime: currentPreliminaryTreatment.startTime,
            endTime: currentPreliminaryTreatment.endTime,
            estimatedQuantity: currentPreliminaryTreatment.estimatedQuantity,
            quantity: currentPreliminaryTreatment.quantity,
            imageBefore: currentPreliminaryTreatment.imageBefore,
            imageInProgress: currentPreliminaryTreatment.imageInProgress,
            imageAfter: currentPreliminaryTreatment.imageAfter,
          });
          const newCleaning = new ProductPlanCleaning({
            estimatedTime: currentCleaning.estimatedTime,
            startTime: currentCleaning.startTime,
            endTime: currentCleaning.endTime,
            estimatedQuantity: currentCleaning.estimatedQuantity,
            quantity: currentCleaning.quantity,
            imageBefore: currentCleaning.imageBefore,
            imageInProgress: currentCleaning.imageInProgress,
            imageAfter: currentCleaning.imageAfter,
          });
          const newPacking = new ProductPlanPacking({
            estimatedTime: currentPacking.estimatedTime,
            startTime: currentPacking.startTime,
            endTime: currentPacking.endTime,
            estimatedExpireTimeStart: currentPacking.estimatedExpireTimeStart,
            estimatedExpireTimeEnd: currentPacking.estimatedExpireTimeEnd,
            expireTimeStart: currentPacking.expireTimeStart,
            expireTimeEnd: currentPacking.expireTimeEnd,
            packing: currentPacking.packing,
            estimatedQuantity: currentPacking.estimatedQuantity,
            quantity: currentPacking.quantity,
            products: currentPacking.products,
            sampleImage: currentPacking.sampleImage,
            packingImage: currentPacking.packingImage,

          });
          const newPreservation = new ProductPlanPreserve({
            estimatedStartTime: currentPreservation.estimatedStartTime,
            estimatedEndTime: currentPreservation.estimatedEndTime,
            startTime: currentPreservation.startTime,
            endTime: currentPreservation.endTime,
            temperature: currentPreservation.temperature,
            storageImage: currentPreservation.storageImage,
          });
          // Tạo product plan mới
          const newProductPlan = new ProductPlan({
            step: '0',
            isMaster: false,
            isActive: true,
            unit: fullBody.unit ? fullBody.unit : currentProductPlan.unit,
            confirmationStatus: '1',
            code: currentProductPlan.code,
            process: currentProductPlan.process,
            seeding: currentProductPlan.seeding,
            planting: currentProductPlan.planting,
            harvesting: newHarvesting._id,
            preliminaryTreatment: newPreliminaryTreatment._id,
            cleaning: newCleaning._id,
            packing: newPacking._id,
            preservation: newPreservation._id,
            createdBy: user,
            parentPlan: currentProductPlan._id,
            comments: currentProductPlan.comments,
          });
          // Sao chép các thông tin mới được gửi lên và tạo mảng chứa các nhân viên mới
          await Promise.each(canUpdateProcess, async (process) => {
            if (fullBody[process.name]) {
              if (process.name === 'harvesting') {
                if (fullBody[process.name].technical) {
                  fullBody[process.name].technical.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '2',
                      user: tech,
                      role: 'technical',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
                if (fullBody[process.name].leader) {
                  fullBody[process.name].leader.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '2',
                      user: tech,
                      role: 'leader',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
              }
              if (process.name === 'preliminaryTreatment') {
                newPreliminaryTreatment.estimatedTime = fullBody[process.name].estimatedTime;
                newPreliminaryTreatment
                  .estimatedQuantity = fullBody[process.name].estimatedQuantity;
                if (fullBody[process.name].technical) {
                  fullBody[process.name].technical.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '3',
                      user: tech,
                      role: 'technical',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
                if (fullBody[process.name].leader) {
                  fullBody[process.name].leader.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '3',
                      user: tech,
                      role: 'leader',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
              }
              if (process.name === 'cleaning') {
                newCleaning.estimatedTime = fullBody[process.name].estimatedTime;
                newCleaning.estimatedQuantity = fullBody[process.name].estimatedQuantity;
                if (fullBody[process.name].technical) {
                  fullBody[process.name].technical.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '4',
                      user: tech,
                      role: 'technical',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
                if (fullBody[process.name].leader) {
                  fullBody[process.name].leader.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '4',
                      user: tech,
                      role: 'leader',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
              }
              if (process.name === 'packing') {
                newPacking.estimatedTime = fullBody[process.name].estimatedTime;
                newPacking.estimatedQuantity = fullBody[process.name].estimatedQuantity;
                newPacking
                  .estimatedExpireTimeStart = fullBody[process.name].estimatedExpireTimeStart;
                newPacking.estimatedExpireTimeEnd = fullBody[process.name].estimatedExpireTimeEnd;
                newPacking.packing = fullBody[process.name].packing;
                if (fullBody[process.name].technical) {
                  fullBody[process.name].technical.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '5',
                      user: tech,
                      role: 'technical',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
                if (fullBody[process.name].leader) {
                  fullBody[process.name].leader.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '5',
                      user: tech,
                      role: 'leader',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
              }
              if (process.name === 'preservation') {
                newPreservation.estimatedStartTime = fullBody[process.name].estimatedStartTime;
                newPreservation.estimatedEndTime = fullBody[process.name].estimatedEndTime;
                if (fullBody[process.name].technical) {
                  fullBody[process.name].technical.forEach((tech) => {
                    toCreatePlanRoleMapping.push({
                      isRecieved: false,
                      isDone: false,
                      process: '6',
                      user: tech,
                      role: 'technical',
                      productPlan: newProductPlan._id,
                    });
                  });
                }
              }
            }
          });
          // Lấy danh sách nhân viên cũ ra
          // loop process,
          // nếu xuất hiện một user ở process mới thì xóa hết những user có process đó trong mảng nhân viên cũ
          // thay bằng nhân viên mới

          let oldEmployee = await PlanRoleMapping.find({ productPlan: planId }).select('-_id');
          toCreatePlanRoleMapping.forEach((each) => {
            const checkProcess = ['2', '3', '4', '5', '6'];
            checkProcess.forEach((p) => {
              if (each.process === p) {
                _.remove(oldEmployee, {
                  process: p,
                });
              }
            });
          });
          oldEmployee = oldEmployee.map((e) => {
            delete e._id;
            e.productPlan = newProductPlan._id;
            return e;
          });
          toCreatePlanRoleMapping = toCreatePlanRoleMapping.concat(oldEmployee);
          await newHarvesting.save();
          await newPreliminaryTreatment.save();
          await newCleaning.save();
          await newPacking.save();
          await newPreservation.save();
          await PlanRoleMapping.insertMany(toCreatePlanRoleMapping);
          const savedNewPlan = await newProductPlan.save();
          await createNoti(`Kế hoạch ${savedNewPlan.code} mới được tạo`, 'all', true);
          return savedNewPlan;
        }
        //= ====================================================================
        // Chưa từng sang theo dõi, cập nhật như bình thường
        if (confirmationStatus === '2') {
          currentProductPlan.confirmationDate = new Date();
          currentProductPlan.step = '1';
          currentProductPlan.process = '2';

          // Tạo 1 bản sao của kế hoạch ban đầu rồi đẩy vào lịch sử
          const currentHarvesting = currentProductPlan.harvesting;
          const currentPreliminaryTreatment = currentProductPlan.preliminaryTreatment;
          const currentCleaning = currentProductPlan.cleaning;
          const currentPacking = currentProductPlan.packing;
          const currentPreservation = currentProductPlan.preservation;
          // Tạo sub field mới
          const newHarvesting = new ProductPlanHarvesting({
            startTime: currentHarvesting.startTime,
            endTime: currentHarvesting.endTime,
            quantity: currentHarvesting.quantity,
            temperature: currentHarvesting.temperature,
            humidity: currentHarvesting.humidity,
            porosity: currentHarvesting.porosity,
            imageBefore: currentHarvesting.imageBefore,
            imageInProgress: currentHarvesting.imageInProgress,
            imageAfter: currentHarvesting.imageAfter,
          });
          const newPreliminaryTreatment = new ProductPlanPreliminaryTreatment({
            estimatedTime: currentPreliminaryTreatment.estimatedTime,
            startTime: currentPreliminaryTreatment.startTime,
            endTime: currentPreliminaryTreatment.endTime,
            estimatedQuantity: currentPreliminaryTreatment.estimatedQuantity,
            quantity: currentPreliminaryTreatment.quantity,
            imageBefore: currentPreliminaryTreatment.imageBefore,
            imageInProgress: currentPreliminaryTreatment.imageInProgress,
            imageAfter: currentPreliminaryTreatment.imageAfter,
          });
          const newCleaning = new ProductPlanCleaning({
            estimatedTime: currentCleaning.estimatedTime,
            startTime: currentCleaning.startTime,
            endTime: currentCleaning.endTime,
            estimatedQuantity: currentCleaning.estimatedQuantity,
            quantity: currentCleaning.quantity,
            imageBefore: currentCleaning.imageBefore,
            imageInProgress: currentCleaning.imageInProgress,
            imageAfter: currentCleaning.imageAfter,
          });
          const newPacking = new ProductPlanPacking({
            estimatedTime: currentPacking.estimatedTime,
            startTime: currentPacking.startTime,
            endTime: currentPacking.endTime,
            estimatedExpireTimeStart: currentPacking.estimatedExpireTimeStart,
            estimatedExpireTimeEnd: currentPacking.estimatedExpireTimeEnd,
            expireTimeStart: currentPacking.expireTimeStart,
            expireTimeEnd: currentPacking.expireTimeEnd,
            packing: currentPacking.packing,
            estimatedQuantity: currentPacking.estimatedQuantity,
            quantity: currentPacking.quantity,
            products: currentPacking.products,
            sampleImage: currentPacking.sampleImage,
            packingImage: currentPacking.packingImage,

          });
          const newPreservation = new ProductPlanPreserve({
            estimatedStartTime: currentPreservation.estimatedStartTime,
            estimatedEndTime: currentPreservation.estimatedEndTime,
            startTime: currentPreservation.startTime,
            endTime: currentPreservation.endTime,
            temperature: currentPreservation.temperature,
            storageImage: currentPreservation.storageImage,
          });
          // Tạo product plan mới
          const newProductPlan = new ProductPlan({
            step: '0',
            isMaster: false,
            isActive: true,
            unit: currentProductPlan.unit,
            confirmationStatus: '2',
            confirmationDate: new Date(),
            code: currentProductPlan.code,
            process: currentProductPlan.process,
            seeding: currentProductPlan.seeding,
            planting: currentProductPlan.planting,
            harvesting: newHarvesting._id,
            preliminaryTreatment: newPreliminaryTreatment._id,
            cleaning: newCleaning._id,
            packing: newPacking._id,
            preservation: newPreservation._id,
            createdBy: user,
            parentPlan: currentProductPlan._id,
            comments: currentProductPlan.comments,
          });
          // Tạo plan role mới
          let oldEmployee = await PlanRoleMapping.find({ productPlan: planId }).select('-_id');
          oldEmployee = oldEmployee.map((e) => {
            delete e._id;
            e.productPlan = newProductPlan._id;
            return e;
          });
          await PlanRoleMapping.insertMany(oldEmployee);
          await newHarvesting.save();
          await newPreliminaryTreatment.save();
          await newCleaning.save();
          await newPacking.save();
          await newPreservation.save();
          await newProductPlan.save();
          currentProductPlan.history.push({
            createdAt: new Date(),
            name: `${currentProductPlan.code}_${(new Date()).getTime()}`,
            productPlan: newProductPlan._id,
          });
        }
        currentProductPlan.confirmationStatus = confirmationStatus;
        if (confirmationStatus === '3') {
          // Nếu từ chối thì cần check xem cái này có process là mấy
          // Nếu process =1 thì chỉ cần đẩy về chờ tạo
          // Nếu process >=2 thì bỏ luôn
          if (currentProductPlan.process === '1') {
            currentProductPlan.step = '0';
            currentProductPlan.confirmationStatus = '0';
            // TODO Xoá data và đẩy về chờ tạo
          } else {
            // Nếu process >= 2 thì bỏ luôn
            // Set step =0, confirm = 0, process = 1, isActive = false
            currentProductPlan.step = '0';
            currentProductPlan.confirmationStatus = '0';
            currentProductPlan.process = '1';
            currentProductPlan.isActive = false;
          }
          //= ====================================================================
        }
        const savedProductPlan = await currentProductPlan.save();
        return savedProductPlan;
      }
      // KHONG PHAI MASTER
      // Sao chép các dữ liệu khác vào cho master,
      // tạo các planRole mới cho master, set isConfirm của kế hoạch này về 2,
      // confirmDate
      const masterPlan = await ProductPlan.findOne({ _id: currentProductPlan.parentPlan }).populate('harvesting preliminaryTreatment cleaning packing preservation comments');
      if (masterPlan) {
        // Nếu tìm thấy master
        // Check xem yêu cầu là phê duyệt hay từ chối
        // Nếu từ chối thì chỉ cần set confirm = 3, isActive = false
        // Nếu phê duyệt thì cần set confirm = 2, isActive = false, và merge data vào kế hoạch gốc
        if (confirmationStatus === '2') {
          // Phê duyệt
          await Promise.each(canUpdateProcess, async (process) => {
            // Nếu có thay đổi thì dup data rồi update vào các subfield của master
            if (masterPlan[process.name] !== currentProductPlan[process.name]) {
              if (process.name === 'preliminaryTreatment') {
                const masterPreliminaryTreatment = await ProductPlanPreliminaryTreatment
                  .findOne({ _id: masterPlan.preliminaryTreatment });
                masterPreliminaryTreatment
                  .estimatedTime = currentProductPlan[process.name].estimatedTime;
                masterPreliminaryTreatment
                  .estimatedQuantity = currentProductPlan[process.name].estimatedQuantity;
                await masterPreliminaryTreatment.save();
              }
              if (process.name === 'cleaning') {
                const masterCleaning = await ProductPlanCleaning
                  .findOne({ _id: masterPlan.cleaning });
                masterCleaning
                  .estimatedTime = currentProductPlan[process.name].estimatedTime;
                masterCleaning
                  .estimatedQuantity = currentProductPlan[process.name].estimatedQuantity;
                await masterCleaning.save();
              }
              if (process.name === 'packing') {
                const masterPacking = await ProductPlanPacking.findOne({ _id: masterPlan.packing });
                masterPacking
                  .estimatedTime = currentProductPlan[process.name].estimatedTime;
                masterPacking
                  .estimatedQuantity = currentProductPlan[process.name].estimatedQuantity;
                masterPacking
                  .estimatedExpireTimeStart = currentProductPlan[process.name].estimatedExpireTimeStart;
                masterPacking
                  .estimatedExpireTimeEnd = currentProductPlan[process.name].estimatedExpireTimeEnd;
                masterPacking.packing = currentProductPlan[process.name].packing;
                await masterPacking.save();
              }
              if (process.name === 'preservation') {
                const masterPreservation = await ProductPlanPreserve
                  .findOne({ _id: masterPlan.preservation });
                masterPreservation
                  .estimatedStartTime = currentProductPlan[process.name].estimatedStartTime;
                masterPreservation
                  .estimatedEndTime = currentProductPlan[process.name].estimatedEndTime;
                await masterPreservation.save();
              }
            }
          });
          // Lưu lịch sử phiên bản vào trong master plan
          masterPlan.history.push({
            createdAt: new Date(),
            name: `${masterPlan.code}_${(new Date()).getTime()}`,
            productPlan: currentProductPlan._id,
          });
          // Cập nhật đơn vị cho kế hoạch master
          masterPlan.unit = currentProductPlan.unit;
          const savedMaster = await masterPlan.save();
          // Xóa hết planRole cũ của master,
          await PlanRoleMapping.deleteMany({ productPlan: masterPlan._id });
          // Tìm planrole ở kế hoạch current và dup cho kế hoạch master
          let planRole = await PlanRoleMapping.find({ productPlan: currentProductPlan }).lean();
          planRole = planRole.map((pl) => {
            delete pl._id;
            pl.productPlan = masterPlan._id;
            return pl;
          });
          await PlanRoleMapping.insertMany(planRole);
          currentProductPlan.confirmationStatus = '2';
          currentProductPlan.confirmationDate = new Date();
          currentProductPlan.isActive = false;
          await currentProductPlan.save();
          await createNoti(`Kế hoạch ${currentProductPlan.code} đã được phê duyệt`, 'all', true);
          return masterPlan;
        }
        if (confirmationStatus === '3') {
          // Từ chối
          currentProductPlan.confirmationStatus = '3';
          currentProductPlan.isActive = false;
          const savedPlan = await currentProductPlan.save();
          await createNoti(`Kế hoạch ${currentProductPlan.code} đã bị từ chối`, 'all', true);
          return savedPlan;
        }
      }
      throw new Error('FIND.ERROR.PRODUCT_PLAN.NOT_FOUND_MASTER_PLAN');
    }
    throw new Error('FIND.ERROR.PRODUCT_PLAN.PRODUCT_PLAN_NOT_FOUND');
  } catch (e) {
    throw new Error(e.message);
  }
};
module.exports = {
  confirmPlan,
};
