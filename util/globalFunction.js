const moment = require("moment");
const axios = require("axios");
const sharp = require("sharp");
const { DebugException } = require("../core/CallService");

const Global = {
  currentDateTime: function () {
    moment().locale("id");
    return moment().utcOffset(7).format("YYYY-MM-DD HH:mm:ss");
  },
  currentDate: function () {
    moment().locale("id");
    return moment().utcOffset(7).format("YYYY-MM-DD");
  },

  parseDesimal: function (data) {
    let value = parseFloat(data);
    if (isNaN(value) || value == null || data == undefined) {
      return 0;
    } else {
      return value;
    }
  },
  makeOtp: function (length = 5) {
    var result = "";
    var characters = "01234567890";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },
  makeUniq: function (length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },
  makeExpired: function (add_time) {
    moment().locale("id");
    return moment()
      .utcOffset(7)
      .add(add_time, "minute")
      .format("YYYY-MM-DD HH:mm:ss");
  },
  addMonth: function (value) {
    moment().locale("id");
    return moment().utcOffset(7).add(value, "M").format("YYYY-MM-DD HH:mm:ss");
  },
  separator(value) {
    if (!value) {
      return 0;
    }
    var val = value.toString().replace(/\,/g, ".");
    var nilai = parseFloat(val).toFixed(0);
    nilai = nilai.toString().replace(/\,/g, ".");
    nilai = nilai.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return nilai;
  },
  moveFile: async function (oldPath, dirNew, newFileName) {
    const fs = require("fs");
    if (fs.existsSync(oldPath)) {
      if (!fs.existsSync(dirNew)) {
        fs.mkdirSync(dirNew, { recursive: true });
      }
      fs.renameSync(oldPath, `${dirNew}/${newFileName}`);
    } else {
      return false;
    }
    return true;
  },
  deleteFile: function (filePath) {
    const fs = require("fs");
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      return false;
    }
    return true;
  },
  // VIEW RELATIONSHIP HAS MANY DATA
  viewHasMany: function (input, model) {
    const modelView = require(`../models/${model}.js`);
    input.dinamicModel = modelView.model;
    input.queryBuilder = [];
    input.relationBuilder = [];
    // BUILDER QUERY
    for (let item of input.dinamicModel.FIELDS) {
      if (item.methods.view) {
        let viewConf = item.methods.view;
        if (typeof viewConf === "object") {
          // TYPE VIEW
          if (viewConf.type === "lookup") {
            input.relationBuilder.push(
              ` LEFT JOIN ${viewConf.relation_table} rel_${item.id} ON rel_${item.id}.${viewConf.relation_field} = A.${item.id} `
            );
            if (Array.isArray(viewConf.relation_display)) {
              for (let a of viewConf.relation_display) {
                input.queryBuilder.push(
                  `A.${item.id},rel_${item.id}.${a} AS ${item.id}_${a}`
                );
                // SEARCH LOOKUP
                if (viewConf.search && input.search) {
                  input.searchField.push(`rel_${item.id}.${a} ILIKE  ? `);
                  input.searchValue.push(`%${input.search}%`);
                }
              }
            }
          } else if (viewConf.type === "datetime") {
            input.queryBuilder.push(
              `to_char(A.${item.id},'YYYY-MM-DD hh24:MI:ss') AS ${item.id}`
            );
          } else if (viewConf.type === "date") {
            input.queryBuilder.push(
              `to_char(A.${item.id},'YYYY-MM-DD') AS ${item.id}`
            );
          } else if (viewConf.type === "image" || viewConf.type === "file") {
            input.queryBuilder.push(
              `A.${item.id},CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/public/${viewConf.path}/',A.${item.id}) ELSE '' END AS ${item.id}_preview`
            );
            if (viewConf.type === "image") {
              input.queryBuilder.push(
                ` CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/public/${viewConf.path}/thumbnail_',A.${item.id}) ELSE '' END AS ${item.id}_thumbnail`
              );
            }
          } else {
            input.queryBuilder.push(`A.${item.id}`);
          }
          // END TYPE VIEW
        } else {
          input.queryBuilder.push(`A.${item.id}`);
        }
      }
    }

    input.currentUserId = input.session.user_id;
    input.currentCorporateId = input.session.corporate_id;
    input.primaryTable = input.dinamicModel.TABLE_NAME;
    // STATIC FILTER
    if (input.dinamicModel.STATIC_FILTER) {
      for (let item of input.dinamicModel.STATIC_FILTER) {
        if (item.id != "status_code") {
          input.filter.push(`A.${item.id} = ?`);
          if (item.value === "current_corporate_id") {
            input.filterValue.push(input.currentCorporateId);
          } else if (item.value === "current_user_id") {
            input.filterValue.push(input.currentUserId);
          }
        }
      }
    }

    // FILTER SOFT DELETE
    if (input.dinamicModel.SOFT_DELETE) {
      input.filter.push(`A.active = '1' `);
    }

    input.filter =
      input.filter.length > 0 ? `WHERE ` + input.filter.join(" AND ") : "";
  },

  // GET UOM ID FROM NAME
  getUomId: async function (productId, db) {
    let filter = [];
    let filterValue = [];
    filter.push(`id = ?`);
    if (productId) {
      filterValue.push(productId);
    }
    filter = filter.length > 0 ? `WHERE ${filter.join(" AND ")}` : "";
    let validateData = await db.row(
      `SELECT*FROM product ${filter}`,
      filterValue
    );

    if (!validateData) {
      let res = {};
      res.productId = `data product_id not found `;
      throw new CoreException(
        `please check your form|silahkan periksa kembali formulir`,
        res
      );
    }
    return validateData.uom_id;
  },

  //is !empty obejct
  isNotEmptyObject: function (obj) {
    return Object.keys(obj).length > 0;
  },

  formatDate: function (date, schema) {
    let dateFormat = "YYYY-MM-DD";
    if (schema === "datetime") {
      dateFormat = "YYYY-MM-DD hh24:MI:ss";
    } else if (schema === "date") {
      dateFormat = "YYYY-MM-DD";
    } else if (schema === "longDate") {
      dateFormat = "LL";
    } else if (schema === "month") {
      dateFormat = "MMMM";
    }
    return moment(date).format(dateFormat);
  },

  // get start date from month name and year
  getStartDate: function (date) {
    return moment(date).format("YYYY-MM-DD");
  },

  //get last date from month name and year
  getEndDate: function (date) {
    return moment(date).endOf("month").format("YYYY-MM-DD");
  },

  buildReportNumber: async function (tablename, db) {
    // console.log("buildReportNumber", tablename);
    let report_number = "";
    let prefix = "";
    switch (tablename) {
      case "environment":
        prefix = "ENV";
        break;
      case "ph_tanah":
        prefix = "PHT";
        break;
      case "nutrition":
        prefix = "NUTRITION";
        break;
      case "growth":
        prefix = "GROWTH";
        break;
      case "bug":
        prefix = "BUG";
        break;
      case "production":
        prefix = "PRD";
        break;
      case "harvest":
        prefix = "HARVEST";
        break;
      case "ph":
        prefix = "PH";
        break;
      case "pencegahan":
        prefix = "PHP";
        break;
      case "destroy":
        prefix = "SULAM";
        break;
      case "planting":
        prefix = "PLANTING";
        break;
      case "fruit_report":
        prefix = "FRUIT";
        break;
      default:
        break;
    }
    // create report number from date years and month and total report in this month
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;

    let sql = `SELECT COUNT(*) as total FROM ${tablename} WHERE report_number ILIKE '%${year}-${month}%'`;
    // console.log("SQL report_number =============> : ", sql);
    let total_report = await db.run_select(sql);
    total_report = total_report[0].total;

    //get last report number in this month
    sqlNumber = `SELECT report_number FROM ${tablename} WHERE report_number ILIKE '%${year}-${month}%' ORDER BY id DESC LIMIT 1`;
    // console.log("SQL sql_number =============> : ", sqlNumber);
    let last_report_number = await db.run_select(sqlNumber);
    if (last_report_number.length > 0) {
      last_report_number = last_report_number[0].report_number;
      //get last number from string last report number
      last_report_number = last_report_number.split("-");
      last_report_number = last_report_number[last_report_number.length - 1];
    } else {
      last_report_number = 0;
    }
    // console.log("last_report_number =============> : ", last_report_number);

    if (total_report == 0) {
      report_number = `${prefix}-${year}-${month}-1`;
    } else {
      report_number = `${prefix}-${year}-${month}-${
        Number(last_report_number) + 1
      }`;
    }
    // console.log("report_number =============> : ", report_number);
    return report_number;
  },

  processAttachment: async function (data, table) {
    if (data) {
      let filename = data["file"]; // attachment.file
      let path = `tmp/${filename}`;
      let ext = filename.split(".");
      let extension = ext[ext.length - 1];
      extension = extension ? extension.toLowerCase() : extension;
      let destination = `${process.env.FILE_UPLOAD_PATH}/${table}`;

      await Global.moveFile(path, destination, filename);
      await sharp(`${destination}/${filename}`)
        .resize(250, 250)
        .jpeg({
          quality: 100,
        })
        .rotate(0)
        .toFile(`${destination}/thumbnail_${filename}`);

      return filename;
    } else {
      return null;
    }
  },
};

module.exports = { Global };
