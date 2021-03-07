import express from 'express';
// eslint-disable-next-line import/named
import { CheckAuth } from '../../middlewares/auth.mid';
import CommonError from '../../library/error';

import {
  success,
} from '../../../utils/response-utils';
import {
  getAll, create, update, removeById, getById, remove,
} from './school.service';

// eslint-disable-next-line import/named

const api = express.Router();

api.get('/school', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    const results = await getAll(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/school/:schoolId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getById(args);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.post('/school', CheckAuth, async (req, res) => {
  try {
    const args = req.body;
    const results = await create(args);
    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/school/:schoolId', CheckAuth, async (req, res) => {
  try {
    const { schoolId } = req.params;

    const args = req.body;

    const result = await update({
      schoolId, ...args,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/school/bulk', CheckAuth, async (req, res) => {
  try {
    const result = await remove(req.body);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/school/:schoolId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await removeById({ ...args });
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
