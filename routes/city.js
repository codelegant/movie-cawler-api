const restify = require('restify');
const debug = require('debug')('debug');

const cawler = require('../cawler/index');
const cliLog = require('../libs/cliLog');
const MovieDb = require('../db/MovieDb');

module.exports = (() => ({
  /**
   * 直接从数据库获取城市列表
   */
  async getFromDb(req, res, next){
    try {
      const { regionName } = req.query;
      if (regionName) return next('regionName');
      const movieDb = new MovieDb();
      const docs = await movieDb.findMany('cities');

      return docs.length ? res.json(200, docs) : next();

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市列表失败'));
    }
  },

  /**
   * 先爬取城市列表，然后存入数据库
   */
  async getFromCawler(req, res, next){
    try {
      const citiesArr = await cawler.cities();
      const movieDb = new MovieDb();
      const result = await movieDb.insert('cities', citiesArr);
      return result.ops.length
        ? res.json(200, result.ops)
        : next(new restify.NotFoundError('未查询到城市列表'));
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市列表失败'));
    }
  },

  /**
   * 使用 regionName 字段查询城市数据
   */
  async getByRegionNameFromDb(req, res, next){
    try {
      const { regionName } = req.query;
      if (! regionName) {
        return next(new restify.InvalidArgumentError('只接受 regionName 作为参数'));
      }
      const movieDb = new MovieDb();

      const docs = await movieDb.findMany('cities', true, { regionName });
      return docs.length ? res.json(200, docs) : next();
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市信息失败'));
    }
  },

  /**
   * 数据为空，重新抓取，存储，查找
   */
  async getByRegionNameFromCawler(req, res, next){
    try {
      const { regionName } = req.query;
      if (! regionName) {
        return next(new restify.InvalidArgumentError('只接受 regionName 作为参数'));
      }

      const citiesArr = await cawler.cities();
      const movieDb = new MovieDb();
      const result = await movieDb.insert('cities', citiesArr, false);
      let docs = [];
      for (const ele of result.ops) {
        if (ele.regionName === regionName) {
          docs = ele;
          break;
        }
      }

      return docs.length
        ? res.json(200, docs[ 0 ])
        : next(new restify.NotFoundError(`查询 regionName:${regionName} 失败`));

    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('获取城市信息失败'));
    }
  },

  /**
   * 重新爬取城市列表信息，并存入数据库
   */
  async put(req, res, next){
    try {
      const movieDb = new MovieDb();
      await movieDb.deleteMany('cities', false);

      const citiesArr = await cawler.cities();

      const cities = await cawler.cities();
      const result = await movieDb.insert('cities', citiesArr);

      return res.send(result.ops.length ? 201 : 204);
    } catch (e) {
      cliLog.error(e);
      return next(new restify.InternalServerError('更新城市列表失败'));
    }
  },
}))();