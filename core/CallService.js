const Validator = require("../util/node-input-validator");
const { isUuid } = require("uuidv4");
require("dotenv").config();
var pg = require("pg");
const moment = require("moment");
const fs = require("fs");

var language = "";

// TYPE PARSER
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
  return parseInt(value);
});
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
  return parseInt(value);
});
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => {
  return parseFloat(value);
});

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// DATABASE CONNECTION
let dbConnect = async function () {
  let db;
  db = require("knex")({
    client: process.env.DB_DRIVE,
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT || 5432,
    },
  });
  return db;
};

const database = require("knex")({
  client: process.env.DB_DRIVE,
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 5432,
  },
});
// END DATABASE CONNECTION

// END TYPE PARSER
class CoreException {
  constructor(errorMessage = "", errorList = {}, errorCode = 422) {
    let lengthError = errorMessage.split("|");
    errorMessage =
      language == "id"
        ? lengthError.length > 1
          ? lengthError[1]
          : lengthError[0]
        : lengthError[0];
    this.errorMessage = errorMessage ? errorMessage.capitalize() : "";
    this.errorList = errorList;
    this.errorCode = errorCode;
  }
}

class DebugException {
  constructor(data) {
    this.errorMessage = data;
  }
}

// OUTPUT RESPONSE
var CoreResponse = {
  ok: function (res, data) {
    var body = {
      success: true,
      data: data,
    };
    var statusCode = 200;
    return res.status(statusCode).json(body);
  },
  fail: function (res, errorMessage = "", errorList = {}, statusCode = 500) {
    var result = {
      success: false,
    };

    if (errorMessage !== "") {
      let lengthError = errorMessage.split("|");
      if (res.language == "id") {
        errorMessage =
          res.language == "id"
            ? lengthError.length > 1
              ? lengthError[1]
              : lengthError[0]
            : lengthError[0];
      }
      result.error_message = errorMessage ? errorMessage.capitalize() : "";
    }
    if (errorList !== {}) {
      result.error_list = errorList;
    }
    return res.status(statusCode).json(result);
  },
  debug: function (res, data) {
    var body = {
      success: true,
      data: data,
    };
    var statusCode = 200;
    return res.status(statusCode).json(body);
  },
};
//END OUTPUT RESPONSE

const CallService = async function (service, input, db) {
  // CUSTOM VALIDATOR
  Validator.extend("uuid", (field, value) => {
    return isUuid(value);
  });
  Validator.extend("float", (field, value) => {
    let parse = parseFloat(value);
    if (parse == null || parse == undefined || isNaN(parse)) {
      return false;
    }
    return typeof (parseFloat(value) === Number);
  });
  Validator.extend("datetime", (field, value) => {
    try {
      return moment(value).format("YYYY-MM-DD H:mm:ss");
    } catch {
      return true;
    }
  });

  Validator.extend("time", (field, value) => {
    try {
      return moment(`2000-01-01 ${value}`).format("YYYY-MM-DD H:mm:ss");
    } catch {
      return true;
    }
  });

  Validator.extend("phone", (field, value) => {
    const regex =
      /(\+62 ((\d{3}([ -]\d{3,})([- ]\d{4,})?)|(\d+)))|(\(\d+\) \d+)|\d{3}( \d+)+|(\d+[ -]\d+)|\d+/;
    let validRegex = regex.test(value);
    let validPhone = false;
    if (value.substring(0, 2) == "62" || value.substring(0, 2) == "08") {
      validPhone = true;
    }
    if (validRegex && validPhone) {
      return true;
    } else {
      return false;
    }
  });

  const validator = new Validator(input, service.validation);
  const matched = await validator.check();
  if (!matched) {
    let error = {};
    if (validator.errors) {
      for (let item in validator.errors) {
        error = validator.errors[item].message;
        throw new CoreException(error, "");
      }
    }
    throw new CoreException("", validator.errors);
  }
  // CALL PREPARE FUNCTION
  var inputNew = await service.prepare(input, db);
  const inputProcess = inputNew == null ? input : inputNew;
  // CALL PROCESS FUNCTION
  const result = await service.process(inputProcess, input, db);
  return result;
};

let dir = "logs/";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const ExecuteService = async function (event, service, response) {
  let db;
  try {
    let input = service.input(event);

    if (service.transaction === true) {
      db = await dbConnect();
    } else {
      db = database;
    }

    db.run_select = async function (sql, params = []) {
      return db
        .raw(sql, params)
        .then((res) => {
          return res.rows;
        })
        .catch((err) => {
          console.log(err);
          fs.writeFileSync(
            `logs/log-${moment().format("DD-MM-YYYY HH-mm")}.txt`,
            `Error query :  ${err}`
          );
          if (process.env.PRODUCTION == "1") {
            throw new CoreException("Bad Request | Server gangguan", "", 500);
          } else {
            throw err;
          }
        });
    };
    db.row = async function (sql, params = []) {
      return db
        .run_select(sql, params)
        .then((res) => {
          return res[0];
        })
        .catch((err) => {
          console.log(err);
          fs.writeFileSync(
            `logs/log-${moment().format("DD-MM-YYYY HH-mm")}.txt`,
            `Error query :  ${err}`
          );
          if (process.env.PRODUCTION == "1") {
            throw new CoreException("Bad Request | Server gangguan", "", 500);
          } else {
            throw err;
          }
        });
    };

    db.run_insert = async function (table, values, multiple = false) {
      return await db(table)
        .insert(values)
        .returning("*")
        .then((res) => {
          if (multiple) return res;
          else return res[0];
        })
        .catch((err) => {
          console.log(err);
          fs.writeFileSync(
            `logs/log-${moment().format("DD-MM-YYYY HH-mm")}.txt`,
            `Error query :  ${err}`
          );
          if (process.env.PRODUCTION == "1") {
            throw new CoreException("Bad Request | Server gangguan", "", 500);
          } else {
            throw err;
          }
        });
    };

    db.run_update = async function (table, value, where) {
      return await db
        .update(value)
        .into(table)
        .returning("*")
        .where(where)
        .catch((err) => {
          console.log(err);
          fs.writeFileSync(
            `logs/log-${moment().format("DD-MM-YYYY HH-mm")}.txt`,
            `Error query :  ${err}`
          );
          if (process.env.PRODUCTION == "1") {
            throw new CoreException("Bad Request | Server gangguan", "", 500);
          } else {
            throw err;
          }
        });
    };

    db.run_delete = async function (table, where) {
      return await db
        .delete()
        .from(table)
        .where(where)
        .returning("*")
        .catch((err) => {
          console.log(err);
          fs.writeFileSync(
            `logs/log-${moment().format("DD-MM-YYYY HH-mm")}.txt`,
            `Error query :  ${err}`
          );
          if (process.env.PRODUCTION == "1") {
            throw new CoreException("Bad Request | Server gangguan", "", 500);
          } else {
            throw err;
          }
        });
    };

    // BEGIN TRANSACTION
    if (service.transaction === true) {
      await db.raw("BEGIN");
    }

    input.session = event.session;
    // input.corporateSubcription = event.corporateSubcription
    // input.socket = event.app.io

    const result = await CallService(service, input, db);

    // COMMIT TRANSACTION
    if (service.transaction === true) {
      await db.raw("COMMIT");
      await db.destroy();
    }

    return CoreResponse.ok(response, result);
  } catch (err) {
    // console.log("ERR :", err);
    if (service.transaction === true && db) {
      console.log(`RUNING ROLEBACK`);
      await db.raw("ROLLBACK");
      await db.destroy();
    }
    if (err instanceof CoreException) {
      return CoreResponse.fail(
        response,
        err.errorMessage,
        err.errorList,
        err.errorCode
      );
    } else if (err instanceof DebugException) {
      return CoreResponse.debug(
        response,
        err.errorMessage,
        err.errorList,
        err.errorCode
      );
    } else {
      return CoreResponse.fail(response, err.message);
    }
  }
};

var CoreService = function (service) {
  return {
    exec: async function (event, response) {
      response.language = event.language;
      language = event.language;
      return await ExecuteService(event, service, response);
    },
    call: async function (input, db) {
      service.validation = {};
      return await CallService(service, input, db);
    },
  };
};

module.exports = {
  CallService,
  ExecuteService,
  CoreException,
  DebugException,
  CoreResponse,
  CoreService,
  dbConnect,
  database,
};
