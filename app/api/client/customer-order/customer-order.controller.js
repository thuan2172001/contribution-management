import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import CommonError from '../../library/error';
import { getById } from './customer-order.service/getById';

import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/customer-order/:orderId', CheckAuth, async (req, res) => {
  try {
    const args = req;
    const results = await getById(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
module.exports = api;
