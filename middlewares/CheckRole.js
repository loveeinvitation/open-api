const routers = require('../router');
const jwt = require('jsonwebtoken');
const AccessControl = require('accesscontrol');
const moment = require('moment');
const {
  CoreResponse,
  CoreException,
  database,
} = require('../core/CallService');
const requestIp = require('request-ip');

require('dotenv').config();
const ac = new AccessControl();

module.exports = async (req, res, next) => {
  req.language = req.headers.lang ? req.headers.lang : 'en';
  const clientIp = requestIp.getClientIp(req);
  let host = req.get('host');
  req.ipAddress = clientIp;
  req.primaryHost = host;
  let db = database;

  let actionObj = {
    POST: 'create',
    GET: 'read',
    PATCH: 'update',
    PUT: 'update',
    DELETE: 'delete',
    UPLOAD: 'create',
  };

  let method = req.method;
  if (req.route.path.includes('upload')) method = 'UPLOAD';
  let service = routers.filter(
    (v) => v.endPoint === req.route.path && v.type === method
  )[0];

  if (!service)
    return CoreResponse.fail(
      res,
      'Page not found | Halaman tidak ditemukan',
      {},
      404
    );

  let serviceTask = service.task
    ? service.task == 'lookup'
      ? req.params.model + '_lookup'
      : service.task
    : req.params.model;

  // let headers = req.headers.authorization.split(' ')[1];
  let headers = req.headers;
  let token = '';
  if (headers) {
    token = headers.authorization;
    if (token) {
      token = token.split(' ')[1];
    }
  }

  // console.log("headers", headers);
  // console.log("token", token);
  // DECODE AUTH TOKEN
  let decodedToken = null;
  if (token) {
    decodedToken = jwt.verify(token, process.env.APP_KEY, (err, decoded) => {
      if (err) return err;
      return decoded;
    });
  }
  if (service.auth && !decodedToken) return CoreResponse.fail(res, 'Check your token', {}, 401);

  // END DECODE AUTH TOKEN

  if (!service.auth) return next();
  let session = {
    user_id: null,
    corporate_id: -1,
    api_token: null,
    socket_id: null,
    device_id: null,
    token_id: null,
    role_code: 'Guest',
    role_name: 'Guest',
    role_id: -2,
  };

  req.session = session;
  if (decodedToken.role_id === -1) {
    return next();
  }
  if (headers) {
    if (service.auth && !decodedToken) return CoreResponse.fail(res, 'Unauthorized', {}, 401);
    var sql = ` SELECT A.user_id, B.name, B.phone, B.username, B.role_id, C.role_name,B.password,
                A.id AS token_id, A.socket_id, A.device_id, CASE WHEN A.mobile = '1' THEN TRUE ELSE FALSE END AS mobile,A.api_token
                FROM api_token A
                INNER JOIN users B ON B.id = A.user_id
                INNER JOIN roles C ON C.id = B.role_id
                WHERE A.api_token = ? AND A.active ='1' LIMIT 1`;

    await db.raw(sql, [decodedToken.api_token])
      .then((resp) => {
        session = resp.rows[0];
      }).catch((err) => {
        console.log(err);
        session = false;
      });

    if (!session) {
      return CoreResponse.fail(res, 'Unauthorized', {}, 401);
    }
  }
  // SESSION
  session.datetime = moment().utcOffset(7).format('YYYY-MM-DD HH:mm:ss');
  req.session = session;
  // END SESSION

  let roles = await db
    .select(db.raw(`CASE WHEN role_task.action = 'lookup' THEN CONCAT(tasks.task_name,'_lookup') ELSE tasks.task_name END as resource `),
      db.raw(`CASE WHEN role_task.action = 'lookup' THEN 'read' ELSE role_task.action END as action `),
      'role_task.attribute as attributes',
      'roles.role_code as role',
      'role_task.possession'
    ).from('role_task')
    .join('roles', 'roles.id', 'role_task.role_id')
    .join('tasks', 'tasks.id', 'role_task.task_id')
    .where({ 'role_task.role_id': session.role_id })
    .then((result) => {
      if (result.length === 0) {
        return false;
      }
      return result;
    })
    .catch(() => {
      throw CoreResponse.fail(res, 'Terjadi kesalahan pada server', {}, 500);
    });
  if (!roles) throw CoreResponse.fail(res, 'Unauthorized', {}, 401);
  ac.setGrants(roles);
  const permission = ac.permission({
    role: session.role_name.toLocaleLowerCase(),
    resource: serviceTask,
    action: actionObj[req.method],
    attributes: ['*'],
  }).granted;

  return permission? next() : CoreResponse.fail(res, 'Permission Denied', {}, 403);
};
