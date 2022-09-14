const { CoreService, CoreException } = require("../../core/CallService");
const router = require("../../models/_index");
const { Global } = require("../../util/globalFunction");
const fs = require("fs");
const sharp = require("sharp");
const { uuid } = require("uuidv4");

/**
 * Service DINAMIC CREATE
 */

const service = {
  transaction: false,
  input: function (request) {
    // VALIDATION QUERY PARAM
    this.validation = {};
    let input = request.body;

    // DEFINE PATH PARAM
    const route = request.params.model;

    // UNDEFINED MODEL
    if (!router[route]) {
      throw new CoreException(
        `Page not found|Halaman tidak ditemukan`,
        {},
        404
      );
    }

    // DEFINE MODEL
    const model = require(`../../models/.${router[route]}.js`);
    input.modelConfig = model;
    input.dinamicModel = model.model;
    this.transaction = model.model.TRANSACTION
      ? model.model.TRANSACTION
      : false;

    // CHECK PERMISSION IN MODEL
    if (!input.dinamicModel.ALLOW.create) {
      throw new CoreException(`Cant add data|Tidak diijinkan menambahkan data`);
    }

    input.createData = {};
    input.createField = [];
    input.fileRemove = [];

    // BUILD DINAMIC MODEL
    for (let item of input.dinamicModel.FIELDS) {
      if (item.methods.create && item.id !== "id") {
        input.createField.push(item.id);
        let value = "";
        let createConf = item.methods.create;

        if (typeof createConf === "object") {
          // TYPE CREATE
          value = input[item.id];
          if (createConf.type === "integer" || createConf.type === "decimal") {
            if (input[item.id] == 0) {
              value = 0;
            } else if (!input[item.id]) {
              value = createConf.default || 0;
            } else if (createConf.default) {
              value = createConf.default || 0;
            }
          } else if (
            createConf.type === "image" ||
            createConf.type === "file"
          ) {
            if (value) {
              value = value["file"];
              let path = `tmp/${value}`;
              if (!fs.existsSync(path)) {
                throw new CoreException("File not found|file tidak ditemukan");
              }
              let ext = value.split(".");
              let extension = ext[ext.length - 1];
              extension = extension ? extension.toLowerCase() : extension;
              if (Array.isArray(createConf.allowed)) {
                if (!createConf.allowed.includes(extension)) {
                  Global.deleteFile(`tmp/${value}`);
                  throw new CoreException(
                    `file format not allowed|Format file tidak diijinkan`
                  );
                }
              }
              input.fileRemove.push({
                filename: value,
                path: createConf.path,
                image: createConf.type === "image" ? true : false,
              });
              input[item.id] = value;
            }
          } else {
            if (!input[item.id]) {
              value = createConf.default || null;
            } else {
              value = input[item.id];
            }
          }
          // VALIDATION PAYLOAD
          if (Array.isArray(createConf.validation)) {
            this.validation[item.id] = createConf.validation.join("|");
          }
          // END TYPE CREATE
        } else {
          value = input[item.id] ? input[item.id] : null;
        }
        input.createData[item.id] = value;
      }
    }
    return input;
  },
  prepare: async function (input, db) {
    input.currentDate = Global.currentDate();
    input.currentDateTime = Global.currentDateTime();
    input.currentUserId = input.session.user_id;
    input.currentCorporateId = input.session.corporate_id;
    input.primaryTable = input.dinamicModel.TABLE_NAME;
    // STATIC VALUE
    if (input.dinamicModel.STATIC_VALUE) {
      for (let item of input.dinamicModel.STATIC_VALUE) {
        if (input.createField.includes(item.id)) {
          if (item.value === "current_corporate_id") {
            input.createData[item.id] = input.currentCorporateId;
          } else if (item.value === "current_user_id") {
            input.createData[item.id] = input.currentUserId;
          } else if (item.value === "current_datetime") {
            input.createData[item.id] = input.currentDateTime;
          } else if (item.value === "current_date") {
            input.createData[item.id] = input.currentDate;
          } else if (item.value === "generate_uuid") {
            input.createData[item.id] = uuid();
          }
        }
      }
    }

    // VALIDATION UNIQUE
    if (Array.isArray(input.dinamicModel.FIELDS_UNIQUE)) {
      if (input.dinamicModel.FIELDS_UNIQUE.length > 0) {
        let filter = [];
        let filterValue = [];
        for (let item of input.dinamicModel.FIELDS_UNIQUE) {
          if (input.createData[item]) {
            filter.push(`${item} = ?`);
            filterValue.push(input.createData[item]);
          }
        }
        let checkUnique = await db.row(
          `SELECT*FROM ${input.primaryTable} ${
            filter.length > 0 ? `WHERE ${filter.join(" AND ")}` : ""
          }`,
          filterValue
        );
        if (checkUnique) {
          throw new CoreException(`Data already exist|Data telah tersedia`);
        }
      }
    }

    // VALIDATION DATA
    if (Array.isArray(input.dinamicModel.VALIDATION_DATA)) {
      for (let item of input.dinamicModel.VALIDATION_DATA) {
        if (input.createData[item.id]) {
          let filter = [];
          let filterValue = [];
          for (let a of item.validation) {
            let val = "";
            filter.push(`${a.id} = ?`);
            if (a.value === "current_value") {
              val = input.createData[item.id];
            } else if (a.value === "current_corporate_id") {
              val = input.currentCorporateId;
            } else if (a.value === "current_user_id") {
              val = input.currentUserId;
            } else if (a.value === "parent_value") {
              val = input.createData[a.parent_id];
            } else {
              val = a.value;
            }
            filterValue.push(val);
          }
          filter = filter.length > 0 ? `WHERE ${filter.join(" AND ")}` : "";
          let validateData = await db.row(
            `SELECT*FROM ${item.table} ${filter}`,
            filterValue
          );
          if (!validateData) {
            let res = {};
            res[item.id] = `data ${item.id} not found `;
            throw new CoreException(
              `please check your form|silahkan periksa kembali formulir`,
              res
            );
          }
        }
      }
    }

    return input;
  },

  process: async function (input, OriginalInput, db) {
    // BEFORE CREATE
    if (input.modelConfig.beforeCreate instanceof Function) {
      input.CoreException = CoreException;
      await input.modelConfig.beforeCreate(input, db);
    }

    // INSERT TO TABLE
    let insertData = await db.run_insert(
      `${input.primaryTable}`,
      input.createData
    );
    input.createData.id = insertData.id;

    // MOVE FILE UPLOAD
    for (let item of input.fileRemove) {
      await Global.moveFile(
        `tmp/${item.filename}`,
        `${process.env.FILE_UPLOAD_PATH}/${item.path}`,
        item.filename
      );

      if (item.image) {
        await sharp(
          `${process.env.FILE_UPLOAD_PATH}/${item.path}/${item.filename}`
        )
          .resize(250, 250)
          .jpeg({
            quality: 100,
          })
          .rotate(0)
          .toFile(
            `${process.env.FILE_UPLOAD_PATH}/${item.path}/thumbnail_${item.filename}`
          );
      }
    }

    // AFTER CREATE
    if (input.modelConfig.afterCreate instanceof Function) {
      input.CoreException = CoreException;
      await input.modelConfig.afterCreate(input, db);
    }

    return {
      message: "data saved successfully",
      data: input.createData,
    };
  },
  validation: {},
};

module.exports = CoreService(service);
