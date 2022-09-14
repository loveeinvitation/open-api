const { CoreService, CoreException } = require('../../core/CallService');
const router = require('../../models/_index');
const { Global } = require('../../util/globalFunction');
const fs = require('fs');
const sharp = require('sharp');
const { uuid } = require('uuidv4');

/**
 * Service DINAMIC UPDATE
 */

const service = {
  transaction: false,
  input: function (request) {
    // VALIDATION QUERY PARAM
    this.validation = {
      id: 'required|integer',
    };
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
    if (!input.dinamicModel.ALLOW.update) {
      throw new CoreException(`Cant update data|Tidak diijinkan mengubah data`);
    }

    input.relationBuilder = [];
    input.updateData = {};
    input.updateField = [];
    input.fileUpdate = [];
    input.fileRemove = [];
    input.fileDelete = [];

    for (let item of input.dinamicModel.FIELDS) {
      if (item.methods.update && item.id !== 'id') {
        input.updateField.push(item.id);
        let value = '';
        let updateConf = item.methods.update;
        if (typeof updateConf === 'object') {
          // TYPE update
          value = input[item.id];
          if (updateConf.type === 'integer' || updateConf.type === 'decimal') {
            if (input[item.id] == 0) {
              value = 0;
            } else if (!input[item.id]) {
              value = updateConf.default || 0;
            } else if (updateConf.default) {
              value = updateConf.default || 0;
            }
          } else if (
            updateConf.type === 'image' ||
            updateConf.type === 'file'
          ) {
            input.fileUpdate.push({
              id: item.id,
              filename: value,
              allowed: updateConf.allowed,
              path: updateConf.path,
              image: updateConf.type === 'image' ? true : false,
            });
          } else {
            if (!input[item.id]) {
              value = updateConf.default || null;
            } else {
              value = input[item.id];
            }
          }
          // VALIDATION PAYLOAD
          if (Array.isArray(updateConf.validation)) {
            this.validation[item.id] = updateConf.validation.join('|');
          }
          // END TYPE update
        } else {
          value = input[item.id] ? input[item.id] : null;
        }
        input.updateData[item.id] = value;
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

    // STATIC FILTER
    input.filter = [`id = ?`];
    input.filterValue = [input.id];
    if (input.dinamicModel.STATIC_FILTER) {
      for (let item of input.dinamicModel.STATIC_FILTER) {
        input.filter.push(`${item.id} = ?`);
        if (item.value === 'current_user_id') {
          input.filterValue.push(input.currentUserId);
        }
      }
    }

    // FILTER SOFT DELETE
    if (input.dinamicModel.SOFT_DELETE) {
      input.filter.push(`active = '1' `);
    }
    // CHECK AVAILABILITY DATA
    input.oldData = await db.row(
      `SELECT A.* FROM ${input.primaryTable} A ${
        input.filter.length > 0 ? ` WHERE ${input.filter.join(' AND ')}` : ''
      } `,
      input.filterValue
    );

    if (!input.oldData) {
      throw new CoreException(`Data not found|Data tidak ditemukan`);
    }
    // CHECK FILE UPLOAD
    for (let item of input.fileUpdate) {
      if (input.oldData[item.id] != input.updateData[item.id]) {
        if (input.oldData[item.id]) {
          if (
            fs.existsSync(
              `${process.env.FILE_UPLOAD_PATH}/${item.path}/${
                input.oldData[item.id]
              }`
            )
          ) {
            input.fileDelete.push({
              filename: input.oldData[item.id],
              path: item.path,
            });
          }
          if (item.image) {
            if (
              fs.existsSync(
                `${process.env.FILE_UPLOAD_PATH}/${item.path}/thumbnail_${
                  input.oldData[item.id]
                }`
              )
            ) {
              input.fileDelete.push({
                filename: `thumbnail_${input.oldData[item.id]}`,
                path: item.path,
              });
            }
          }
        }
        if (input.updateData[item.id]) {
          let value = input.updateData[item.id]['file'];
          let path = `tmp/${value}`;
          if (!fs.existsSync(path)) {
            throw new CoreException('File not found|file tidak ditemukan');
          }
          let ext = value.split('.');
          let extensi = ext[ext.length - 1];
          extensi = extensi.toLowerCase();
          if (Array.isArray(item.allowed)) {
            if (!item.allowed.includes(extensi)) {
              Global.deleteFile(`tmp/${value}`);
              throw new CoreException(
                `file format not allowed|Format file tidak diijinkan`
              );
            }
          }
          input.fileRemove.push({
            filename: value,
            path: item.path,
            image: item.image,
          });
          input.updateData[item.id] = input.updateData[item.id]['file'];
        }
      }
    }

    // STATIC VALUE
    if (input.dinamicModel.STATIC_VALUE) {
      for (let item of input.dinamicModel.STATIC_VALUE) {
        if (input.updateField.includes(item.id)) {
          if (item.value === 'current_corporate_id') {
            input.updateData[item.id] = input.currentCorporateId;
          } else if (item.value === 'current_user_id') {
            input.updateData[item.id] = input.currentUserId;
          } else if (item.value === 'current_datetime') {
            input.updateData[item.id] = input.currentDateTime;
          } else if (item.value === 'current_date') {
            input.updateData[item.id] = input.currentDate;
          } else if (item.value === 'generate_uuid') {
            input.updateData[item.id] = uuid();
          }
        }
      }
    }

    // VALIDATION UNIQUE
    if (Array.isArray(input.dinamicModel.FIELDS_UNIQUE)) {
      if (input.dinamicModel.FIELDS_UNIQUE.length > 0) {
        let filter = [];
        let filterValue = [input.id];
        for (let item of input.dinamicModel.FIELDS_UNIQUE) {
          if (input.updateData[item]) {
            filter.push(`${item} = ?`);
            filterValue.push(input.updateData[item]);
          }
        }
        let checkUnique = await db.row(
          `SELECT*FROM ${input.primaryTable} WHERE id != ?  ${
            filter.length > 0 ? ` AND ${filter.join(' AND ')}` : ''
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
        if (input.updateData[item.id]) {
          let filter = [];
          let filterValue = [];
          for (let a of item.validation) {
            let val = '';
            filter.push(`${a.id} = ?`);
            if (a.value === 'current_value') {
              val = input.updateData[item.id];
            } else if (a.value === 'current_corporate_id') {
              val = input.currentCorporateId;
            } else if (a.value === 'current_user_id') {
              val = input.currentUserId;
            } else if (a.value === 'parent_value') {
              val = input.updateData[a.parent_id];
            } else {
              val = a.value;
            }
            filterValue.push(val);
          }
          filter = filter.length > 0 ? `WHERE ${filter.join(' AND ')}` : '';
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
    // BEFORE update
    if (input.modelConfig.beforeUpdate instanceof Function) {
      input.CoreException = CoreException;
      await input.modelConfig.beforeUpdate(input, db);
    }
    console.log(input.updateData);
    await db.run_update(`${input.primaryTable}`, input.updateData, {
      id: input.id,
    });
    input.updateData.id = input.id;
    for (let item of input.fileRemove) {
      if (item.image) {
        await sharp(`tmp/${item.filename}`)
          .resize(250, 250)
          .jpeg({ quality: 100 })
          .rotate(0)
          .toFile(
            `${process.env.FILE_UPLOAD_PATH}/${item.path}/thumbnail_${item.filename}`
          );
      }
      await Global.moveFile(
        `tmp/${item.filename}`,
        `${process.env.FILE_UPLOAD_PATH}/${item.path}`,
        item.filename
      );
    }

    // DELETE FILE
    for (let item of input.fileDelete) {
      Global.deleteFile(
        `${process.env.FILE_UPLOAD_PATH}/${item.path}/${item.filename}`
      );
    }

    // AFTER update
    if (input.modelConfig.afterUpdate instanceof Function) {
      input.CoreException = CoreException;
      await input.modelConfig.afterUpdate(input, db);
    }
    return {
      message: 'data saved successfully',
      data: input.updateData,
    };
  },
  validation: {},
};

module.exports = CoreService(service);
