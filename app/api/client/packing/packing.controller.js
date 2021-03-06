import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
  removeById,
  remove,
  create,
  update,
} from './packing.service';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/packing', CheckAuth, async (req, res) => {
  try {
    const args = req.query;

    if (!args.species || args.species === '') delete args.species;

    const results = await getAll(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/packing/:packingId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getById(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.post('/packing', CheckAuth, async (req, res) => {
  try {
    const args = req.body;

    const results = await create({ ...args });

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/packing/:packingId', CheckAuth, async (req, res) => {
  try {
    const { packingId } = req.params;

    const args = req.body;

    const result = await update({
      packingId, ...args,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/packing/bulk', CheckAuth, async (req, res) => {
  try {
    const { listPacking } = req.body;

    const result = await remove({
      listPacking,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/packing/:packingId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await removeById({ ...args });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
