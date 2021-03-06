import User from '../../../models/user';
import Packing from '../../../models/packing';

const validateUser = async (ids = []) => {
  let existsUser = await User.find({ _id: { $in: ids } }).lean().select('_id');
  existsUser = existsUser.map((u) => u._id.toString());
  return existsUser;
};

const validateImage = (image) => {
  if (!image.path) {
    throw new Error('VALIDATE.ERROR.MISSING_PATH');
  }
  if (!image.takenTime) {
    throw new Error('VALIDATE.ERROR.MISSING_TAKEN_TIME');
  }
  if (!image.location) {
    throw new Error('VALIDATE.ERROR.MISSING_LOCATION');
  }
  if (!image.location.coordinates) {
    throw new Error('VALIDATE.ERROR.MISSING_COORDINATES');
  }
  if (image.location.coordinates.length !== 2) {
    throw new Error('VALIDATE.ERROR.INVALID_COORDINATES');
  }
  if (image.location.type !== 'Point') {
    throw new Error('VALIDATE.ERROR.INVALID_LOCATION_TYPE');
  }
  if (!(image.location.coordinates[0] >= -180 && image.location.coordinates[0] <= 180)) {
    throw new Error('VALIDATE.ERROR.INVALID_LONGITUDE');
  }
  if (!(image.location.coordinates[1] >= -90 && image.location.coordinates[1] <= 90)) {
    throw new Error('VALIDATE.ERROR.INVALID_LATITUDE');
  }
};

const validateInput = async (args) => {
  const payload = args;
  if (payload.technical && payload.technical.length > 0) {
    payload.technical = await validateUser(payload.technical);
    if (payload.technical.length === 0) delete payload.technical;
  }
  if (payload.leader && payload.leader.length > 0) {
    payload.leader = await validateUser(payload.leader);
    if (payload.leader.length === 0) delete payload.leader;
  }
  if (payload.worker && payload.worker.length > 0) {
    const workerIds = [];
    payload.worker.map((w) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      if (!w.startTime || new Date(w.startTime) < d) {
        throw new Error('VALIDATE.ERROR.INVALID_START_TIME');
      }
      if (!w.endTime || new Date(w.startTime) < d) {
        throw new Error('VALIDATE.ERROR.MISSING_START_TIME');
      }
      if (new Date(w.startTime) > new Date(w.endTime)) {
        throw new Error('VALIDATE.ERROR.START_TIME_MUST_LESS_THAN_END_TIME');
      }
      workerIds.push(w.user);
    });
    const validUser = await validateUser(workerIds);
    const found = payload.worker.filter((r) => validUser.includes(r.user));
    if (found.length > 0) {
      payload.worker = found;
    } else {
      delete payload.worker;
    }
  }
  if (payload.quantity) {
    if (payload.quantity < 0) {
      throw new Error('VALIDATE.ERROR.INVALID_QUANTITY');
    }
  }
  if (payload.estimatedQuantity) {
    if (payload.estimatedQuantity < 0) {
      throw new Error('VALIDATE.ERROR.INVALID_ESTIMATED_QUANTITY');
    }
  }
  if (payload.temperature) {
    if (!(payload.temperature > -101 && payload.temperature < 101)) {
      throw new Error('VALIDATE.ERROR.INVALID_TEMPERATURE');
    }
  }
  if (payload.humidity) {
    if (!(payload.humidity > 0 && payload.humidity < 101)) {
      throw new Error('VALIDATE.ERROR.INVALID_HUMIDITY');
    }
  }
  if (payload.porosity) {
    if (!(payload.porosity > 0 && payload.porosity < 101)) {
      throw new Error('VALIDATE.ERROR.INVALID_POROSITY');
    }
  }
  if (payload.location) {
    if (payload.location.length !== 2) {
      throw new Error('VALIDATE.ERROR.INVALID_LOCATION');
    }
    if (!(payload.location[0] >= -180 && payload.location[1] <= 180)) {
      throw new Error('VALIDATE.ERROR.INVALID_LONGITUDE');
    }
    if (!(payload.location[0] >= -90 && payload.location[1] <= 90)) {
      throw new Error('VALIDATE.ERROR.INVALID_LATITUDE');
    }
  }
  if (payload.estimatedTime) {
    const now = new Date();
    if (new Date(payload.estimatedTime) <= now) {
      throw new Error('VALIDATE.ERROR.INVALID_ESTIMATED_TIME');
    }
  }
  if (payload.estimatedStartTime) {
    const now = new Date();
    if (new Date(payload.estimatedStartTime) <= now) {
      throw new Error('VALIDATE.ERROR.INVALID_ESTIMATED_START_TIME');
    }
  }
  if (payload.estimatedEndTime) {
    const now = new Date();
    if (new Date(payload.estimatedEndTime) <= now) {
      throw new Error('VALIDATE.ERROR.INVALID_ESTIMATED_END_TIME');
    }
  }
  if (payload.estimatedStartTime && payload.estimatedEndTime) {
    if (new Date(payload.estimatedStartTime) > new Date(payload.estimatedEndTime)) {
      throw new Error('VALIDATE.ERROR.ESTIMATED_START_TIME_MUST_BEFORE_ESTIMATED_END_TIME');
    }
  }
  if (payload.expireTimeStart) {
    const now = new Date();
    if (new Date(payload.startTime) <= now) {
      throw new Error('VALIDATE.ERROR.START_TIME_MUST_GREATER_THAN_NOW');
    }
  }
  if (payload.expireTimeEnd) {
    const now = new Date();
    if (new Date(payload.endTime) <= now) {
      throw new Error('VALIDATE.ERROR.END_TIME_MUST_BE_GREATER_THAN_NOW');
    }
  }
  if (payload.expireTimeStart && payload.expireTimeEnd) {
    if (new Date(payload.expireTimeStart) > new Date(payload.expireTimeEnd)) {
      throw new Error('VALIDATE.ERROR.START_TIME_MUST_BEFORE_END_TIME');
    }
  }
  if (payload.estimatedExpireTimeStart) {
    const now = new Date();
    if (new Date(payload.estimatedExpireTime) <= now) {
      throw new Error('VALIDATE.ERROR.INVALID_ESTIMATED_EXPIRE_TIME_START');
    }
  }
  if (payload.estimatedExpireTimeEnd) {
    const now = new Date();
    if (new Date(payload.estimatedExpireTime) <= now) {
      throw new Error('VALIDATE.ERROR.INVALID_ESTIMATED_EXPIRE_TIME_END');
    }
  }
  if (payload.estimatedExpireTimeStart && payload.estimatedExpireTimeEnd) {
    if (new Date(payload.estimatedExpireTimeStart) > new Date(payload.estimatedExpireTimeEnd)) {
      throw new Error('VALIDATE.ERROR.ESTIMATED_EXPIRE_START_TIME_MUST_BEFORE_ESTIMATED_EXPIRE_END_TIME');
    }
  }
  if (payload.packing) {
    const validPacking = await Packing.findOne({ _id: payload.packing }).lean().select('_id');
    if (validPacking) {
      payload.packing = validPacking._id;
    } else {
      throw new Error('VALIDATE.ERROR.INVALID_PACKING');
    }
  }
  if (payload.products) {
    if (payload.products.length > 0) {

    }
  }
  if (payload.imageBefore) {
    try {
      payload.imageBefore = JSON.parse(JSON.stringify(payload.imageBefore));
      if (!Array.isArray(payload.imageBefore)) {
        throw new Error('VALIDATE.ERROR.IMAGE_BEFORE_IS_NOT_AN_ARRAY');
      } else if (payload.imageBefore.length > 0) {
        payload.imageBefore.forEach((img) => {
          validateImage(img);
        });
      } else {
        delete payload.imageBefore;
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (payload.sampleImage) {
    try {
      payload.sampleImage = JSON.parse(JSON.stringify(payload.sampleImage));
      if (!Array.isArray(payload.sampleImage)) {
        throw new Error('VALIDATE.ERROR.IMAGE_IS_NOT_AN_ARRAY');
      } else if (payload.sampleImage.length > 0) {
        payload.sampleImage.forEach((img) => {
          validateImage(img);
        });
      } else {
        delete payload.sampleImage;
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (payload.packingImage) {
    try {
      payload.packingImage = JSON.parse(JSON.stringify(payload.packingImage));
      if (!Array.isArray(payload.packingImage)) {
        throw new Error('VALIDATE.ERROR.IMAGE_BEFORE_IS_NOT_AN_ARRAY');
      } else if (payload.packingImage.length > 0) {
        payload.packingImage.forEach((img) => {
          validateImage(img);
        });
      } else {
        delete payload.packingImage;
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (payload.storageImage) {
    try {
      payload.storageImage = JSON.parse(JSON.stringify(payload.storageImage));
      if (!Array.isArray(payload.storageImage)) {
        throw new Error('VALIDATE.ERROR.IMAGE_BEFORE_IS_NOT_AN_ARRAY');
      } else if (payload.storageImage.length > 0) {
        payload.storageImage.forEach((img) => {
          validateImage(img);
        });
      } else {
        delete payload.storageImage;
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (payload.imageAfter) {
    try {
      payload.imageAfter = JSON.parse(JSON.stringify(payload.imageAfter));
      if (!Array.isArray(payload.imageAfter)) {
        throw new Error('VALIDATE.ERROR.IMAGE_BEFORE_IS_NOT_AN_ARRAY');
      } else if (payload.imageAfter.length > 0) {
        payload.imageAfter.forEach((img) => {
          validateImage(img);
        });
      } else {
        delete payload.imageAfter;
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }
  if (payload.imageInProgress) {
    try {
      payload.imageInProgress = JSON.parse(JSON.stringify(payload.imageInProgress));
      if (!Array.isArray(payload.imageInProgress)) {
        throw new Error('VALIDATE.ERROR.IMAGE_BEFORE_IS_NOT_AN_ARRAY');
      } else if (payload.imageInProgress.length > 0) {
        payload.imageInProgress.forEach((img) => {
          validateImage(img);
        });
      } else {
        delete payload.imageInProgress;
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }
  return payload;
};
module.exports = {
  validateInput,
};
