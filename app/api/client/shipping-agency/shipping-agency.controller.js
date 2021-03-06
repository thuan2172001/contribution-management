import express from 'express';
import { CheckAuth } from '../../middlewares/auth.mid';
import {
  getAll,
  getById,
  getByCode,
  removeById,
  create,
  update,
  remove,
} from '../agency/agency.service';
import CommonError from '../../library/error';
import {
  success,
} from '../../../utils/response-utils';

const api = express.Router();

api.get('/shipping-agency/count', CheckAuth, async (req, res) => {
  try {
    const args = req.query;
    const results = await getAll(args);

    return res.json(success(results.length));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/shipping-agency', CheckAuth, async (req, res) => {
  try {
    const args = req.query;

    const results = await getAll(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/shipping-agency/:agencyId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getById(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.get('/shipping-agency/:agencyCode', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await getByCode(args);

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.post('/shipping-agency', CheckAuth, async (req, res) => {
  try {
    const args = req.body;

    const results = await create(args);

    return res.json(success(results));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.put('/shipping-agency/:agencyId', CheckAuth, async (req, res) => {
  try {
    const { agencyId } = req.params;

    const args = req.body;

    const result = await update({
      agencyId, ...args,
    });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/shipping-agency/bulk', CheckAuth, async (req, res) => {
  try {
    const { listAgencies } = req.body;

    const result = await remove({ listAgencies });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

api.delete('/shipping-agency/:agencyId', CheckAuth, async (req, res) => {
  try {
    const args = req.params;

    const result = await removeById({ ...args });

    return res.json(success(result));
  } catch (err) {
    return CommonError(req, err, res);
  }
});

module.exports = api;
