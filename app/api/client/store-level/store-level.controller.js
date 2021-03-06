import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
  removeById,
  create,
  update,
  getAgencyByStoreLevel,
} from './store-level.service';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/store-level', CheckAuth, async (req, res) => {
  try {
    const results = await getAll();

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/store-level/tree', CheckAuth, async (req, res) => {
  try {
    const type = 'tree';
    const results = await getAll(type);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/store-level/:levelId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getById(args);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/store-level/:levelId/agency', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getAgencyByStoreLevel(args);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.post('/store-level', CheckAuth, async (req, res) => {
  try {
    const args = req.body;
    const results = await create({ ...args });
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/store-level/:levelId', CheckAuth, async (req, res) => {
  try {
    const args = req.body;
    const levelId = req.params;
    const result = await update({ ...args, levelId });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.delete('/store-level/:levelId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await removeById({ ...args });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
