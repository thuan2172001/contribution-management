import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import CommonError from '../../library/error';

import {
  success,
} from '../../../utils/response-utils';
import {getAll} from "./student.service";

const api = express.Router();

api.get('/student', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    const results = await getAll(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
