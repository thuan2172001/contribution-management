import express from 'express';
// eslint-disable-next-line import/named
import { CheckAuth } from '../../middlewares/auth.mid';
import CommonError from '../../library/error';

import {
  success,
} from '../../../utils/response-utils';
import {
  getAll, create, update, removeById,
} from './student.service';
// eslint-disable-next-line import/named

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

api.post('/student', CheckAuth, async (req, res) => {
  try {
    const args = req.body;
    const results = await create(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/student/:studentId', CheckAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    const args = req.body;

    const result = await update({
      studentId, ...args,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/student/:studentId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await removeById({ ...args });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
module.exports = api;
