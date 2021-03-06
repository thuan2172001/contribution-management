const api = require('express').Router();
const BasicUnitAction = require('./basic-unit');
const {
  success,
  bad_request,
  serverError,
} = require('../../../utils/response-utils');

api.get('/basic-unit', async (req, res) => {
  try {
    const queryParams = req.query;
    const data = await BasicUnitAction.getAllBasicUnit(queryParams);
    const {
      result, page, limit, total, total_page,
    } = data;
    return res.json(success({
      page, limit, total, total_page, result,
    }));
  } catch (err) {
    res.send(err.message);
  }
});

api.post('/basic-unit', async (req, res) => {
  try {
    const { body } = req;
    const result = await BasicUnitAction.createBasicUnit(body);
    return res.json(result);
  } catch (err) {
    res.send(err.message);
  }
});

api.get('/basic-unit/:code', async (req, res) => {
  try {
    const { params } = req;
    const result = await BasicUnitAction.getBasicUnit(params);
    return res.json(success({ result }));
  } catch (err) {
    res.send(err);
  }
});

api.put('/basic-unit/:code', async (req, res) => {
  try {
    const { params } = req;
    const { body } = req;
    const args = { ...params, ...body };
    const result = await BasicUnitAction.updateBasicUnit(args);
    return res.json(success({ result }));
  } catch (err) {
    res.send(err);
  }
});

api.delete('/basic-unit/:code', async (req, res) => {
  try {
    const { params } = req;
    const args = { ...params };
    const result = await BasicUnitAction.deleteBasicUnit(args);
    return res.json(success({ result }));
  } catch (err) {
    res.send(err);
  }
});

api.get('/basic-unit/search/all', async (req, res) => {
  try {
    const { query } = req;
    const args = { ...query };
    const data = await BasicUnitAction.searchBasicUnit(args);
    const {
      result, page, limit, total, total_page,
    } = data;

    return res.json(success({
      page, limit, total, total_page, result,
    }));
  } catch (err) {
    res.send(err);
  }
});

api.delete('/basic-unit', async (req, res) => {
  try {
    const { body } = req;
    const args = { ...body };
    await BasicUnitAction.deleteManyBasicUnit(args);
    return res.send('ccc');
  } catch (err) {
    res.send(err);
  }
});

module.exports = api;
