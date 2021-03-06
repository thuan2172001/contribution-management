import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import CommonError from '../../library/error';
import { getAll } from './customer.service/getAll';
import { getAllOrderByCustomerId } from './customer.service/getAllOrderByCustomerId';

import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/customer', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    const results = await getAll(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/customer/:customerId/orders', CheckAuth, async (req, res) => {
  try {
    const args = req;
    const results = await getAllOrderByCustomerId(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
module.exports = api;
