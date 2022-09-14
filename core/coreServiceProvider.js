var express = require("express");
const router = express.Router();
const routing = require("../router");
const _ = require("lodash");
const CheckRole = require("../middlewares/CheckRole");
var throttle = require("express-throttle");

var walkSync = function (dir, filelist) {
  if (dir[dir.length - 1] != "/") dir = dir.concat("/");

  var fs = fs || require("fs"),
    files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(dir + file).isDirectory()) {
      filelist = walkSync(dir + file + "/", filelist);
    } else {
      var serviceName = file.replace(".js", "");
      var servicePath = dir + file;
      filelist.push({
        service: serviceName,
        data: "." + servicePath.replace(".js", ""),
      });
    }
  });
  return filelist;
};

var optionsTrollte = {
  burst: 10,
  period: "2sec",
  on_throttled: function (req, res, next, bucket) {
    res.set("X-Rate-Limit-Limit", 5);
    res.set("X-Rate-Limit-Remaining", 0);
    res.set("X-Rate-Limit-Reset", bucket.etime);
    return res.status(503).json({
      error_message: "To many request",
    });
  },
};

routing.forEach((item) => {
  if (item.type == "GET") {
    router.get(
      item.endPoint,
      throttle(optionsTrollte),
      CheckRole,
      async function (req, res) {
        const service = require("../services" + item.service);
        return await service.exec(req, res);
      }
    );
  } else if (item.type == "POST") {
    router.post(
      item.endPoint,
      throttle(optionsTrollte),
      CheckRole,
      async function (req, res) {
        const service = require("../services" + item.service);
        return await service.exec(req, res);
      }
    );
  } else if (item.type == "PUT") {
    router.put(
      item.endPoint,
      throttle(optionsTrollte),
      CheckRole,
      async function (req, res) {
        const service = require("../services" + item.service);
        return await service.exec(req, res);
      }
    );
  } else if (item.type == "PATCH") {
    router.patch(
      item.endPoint,
      throttle(optionsTrollte),
      CheckRole,
      async function (req, res) {
        const service = require("../services" + item.service);
        return await service.exec(req, res);
      }
    );
  } else if (item.type == "DELETE") {
    router.delete(
      item.endPoint,
      throttle(optionsTrollte),
      CheckRole,
      async function (req, res) {
        const service = require("../services" + item.service);
        return await service.exec(req, res);
      }
    );
  } else if (item.type == "UPLOAD") {
    const multer = require("multer");
    const upload = multer({});
    router.post(
      item.endPoint,
      CheckRole,
      upload.single("file"),
      async function (req, res) {
        const service = require("../services" + item.service);
        return await service.exec(req, res);
      }
    );
  }
});

module.exports = router;
