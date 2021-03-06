import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
  removeById,
  create,
  update,
} from './seeding.service';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/seeding', CheckAuth, async (req, res) => {
  try {
    const results = await getAll();
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/seeding/:seedingId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getById(args);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.post('/seeding', CheckAuth, async (req, res) => {
  try {
    const args = req.body;
    const results = await create({ ...args });
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/seeding/:seedingId', CheckAuth, async (req, res) => {
  try {
    const args = req.body;
    const levelId = req.params;
    const result = await update({ ...args, levelId });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/seeding/:seedingId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await removeById({ ...args });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
