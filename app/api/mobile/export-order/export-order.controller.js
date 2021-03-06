import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
} from './export-order.service';
import { create } from './export-order.service/create';
import { update } from './export-order.service/update';

import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/export-order', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    if (!args.species || args.species === '') delete args.species;
    const { _id } = req.userInfo;

    const results = await getAll(args, _id);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/export-order/:orderId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const { _id } = req.userInfo;
    const result = await getById(args, _id);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.post('/export-order', CheckAuth, async (req, res) => {
  try {
    const { _id } = req.userInfo;
    const { body } = req;
    const args = req.params;
    const result = await create(args, body, _id);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.put('/export-order/:orderId', CheckAuth, async (req, res) => {
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
