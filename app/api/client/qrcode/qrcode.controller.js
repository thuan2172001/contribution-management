import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';
import {
  getAll, getById, create, activeById,
  updateStatus,
} from './qrcode.service';

const api = express.Router();

api.get('/qrcode/count', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    const results = await getAll(args);

    return res.json(success(results.length));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/qrcode', CheckAuth, async (req, res) => {
  try {
    const args = req.query;

    const results = await getAll(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/qrcode/:qrcodeId/public', async (req, res) => {
  try {
    const args = req.params;

    const result = await getById(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/qrcode/:qrcodeId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getById({ ...args, userInfo: req.userInfo });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/qrcode/:qrcodeId/status', CheckAuth, async (req, res) => {
  try {
    const { qrcodeId } = req.params;

    const args = req.body;
    const result = await updateStatus({
      ...args,
      qrcodeId,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/qrcode/:qrcodeId/active', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const { body } = req;
    const { _id } = req.userInfo;
    const result = await activeById(args, body, _id);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.post('/qrcode', CheckAuth, async (req, res) => {
  try {
    req.setTimeout(7200000, () => {
      console.log('---------------Time Limit');
    });
    const args = req.body;
    const { _id } = req.userInfo;
    const results = await create(args, _id);
    // const a = new Blob([''], { type: 'text/arrayBuffer' });
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
