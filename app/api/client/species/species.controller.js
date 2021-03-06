import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
  removeById,
  remove,
  create,
  update,
} from './species.service';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/species', CheckAuth, async (req, res) => {
  try {
    const args = req.query;

    const results = await getAll(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/species/:speciesId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getById(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.post('/species', CheckAuth, async (req, res) => {
  try {
    const args = req.body;

    const results = await create({ ...args });

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/species/:speciesId', CheckAuth, async (req, res) => {
  try {
    const { speciesId } = req.params;

    const args = req.body;

    const result = await update({
      speciesId, ...args,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/species/bulk', CheckAuth, async (req, res) => {
  try {
    const { listSpecies } = req.body;

    const result = await remove({
      listSpecies,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/species/:speciesId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await removeById({ ...args });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
