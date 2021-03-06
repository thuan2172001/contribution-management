import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
} from './management-unit-service.js';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/management-unit', CheckAuth, async (req, res) => {
  try {
    const results = await getAll();

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/management-unit/tree', CheckAuth, async (req, res) => {
  try {
    const type = 'tree';
    const results = await getAll(type);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});
api.get('/management-unit/:levelId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;
    const result = await getById(args);
    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
