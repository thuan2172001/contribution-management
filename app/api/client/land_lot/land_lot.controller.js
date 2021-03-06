import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
  getByCode,
  removeById,
  remove,
  create,
  update,
} from './land_lot.service';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/land-lot', CheckAuth, async (req, res) => {
  try {
    const args = req.query;

    const results = await getAll(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/land-lot/:landLotId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getById(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/land-lot/:landLotCode', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getByCode(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.post('/land-lot', CheckAuth, async (req, res) => {
  try {
    const args = req.body;

    const results = await create(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/land-lot/:landLotId', CheckAuth, async (req, res) => {
  try {
    const { landLotId } = req.params;

    const args = req.body;

    const result = await update({
      landLotId, ...args,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/land-lot/bulk', CheckAuth, async (req, res) => {
  try {
    const { listLandLot } = req.body;

    const result = await remove({
      listLandLot
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/land-lot/:landLotId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await removeById({ ...args });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
