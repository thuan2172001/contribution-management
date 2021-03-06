import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import { getAll } from './product-plan.service/getAll';
import { getByField } from './product-plan.service/getByField';
import { getById } from './product-plan.service/getById';
import { updateByField } from './product-plan.service/updateByField';
import { update } from './product-plan.service/update';
import { confirmPlan } from './product-plan.service/confirm';
import { recieve } from './product-plan.service/recieve';
import { finish } from './product-plan.service/finish';
import { postComment } from './product-plan.service/postComment';
import { setMasterImage } from './product-plan.service/setMasterImage';
import { mergePackingQrCode } from './product-plan.service/mergePackingQRCode';

import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();
// TODO : API cho tổ trưởng nhận việc: GET list kế hoạch ở process 2 và chưa có tổ trưởng ở harvesting. Sẽ tách thành API riêng dạng /planId/recievePlan để có thể lấy được userId và assign phía server
// TODO : sửa lại phần nhận việc, chỉ được nhận kế hoạch đã được duyệt
// TODO : admin là người assign tổ trưởng và kĩ thuật
api.get('/product-plan', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    console.log(args);
    const results = await getAll(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/product-plan/:planId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getById(args);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/product-plan/:planId/:productPlanField/', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getByField({ currentState: 'get', ...args });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/confirm', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const { body } = req;
    const args = req.params;
    const result = await confirmPlan(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/:productPlanField/finish', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const args = req.params;
    const { body } = req;
    const result = await finish(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/:productPlanField/master-image', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const args = req.params;
    const { body } = req;
    const result = await setMasterImage(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/recievePlan', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const { body } = req;
    const args = req.params;
    const result = await recieve(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/comments/', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const args = req.params;
    const { body } = req;
    const result = await postComment(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/:productPlanField/merge-qrcode', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const args = req.params;
    const { body } = req;
    const result = await mergePackingQrCode(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId/:productPlanField/', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const args = req.params;
    const { body } = req;
    const result = await updateByField(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/product-plan/:planId', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const { body } = req;
    const args = req.params;
    const result = await update(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
