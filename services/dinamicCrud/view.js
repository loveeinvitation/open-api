const { CoreService, CoreException } = require('../../core/CallService');
const router = require('../../models/_index');
const { Global } = require('../../util/globalFunction');

/**
 * Service DINAMIC VIEW
 */

const service = {
  input: function (request) {
    // VALIDATION QUERY PARAM
    this.validation = {
      id: 'required|integer',
      limit: 'integer|min:0',
      offset: 'integer|min:0',
    };
    let input = request.query;
    input.id = request.params.id;

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

    input.dinamicModel = model.model;
    input.originModel = model;

    // CHECK PERMISSION IN MODEL
    if (!input.dinamicModel.ALLOW.view) {
      throw new CoreException(`Cant get data|Tidak diijinkan menampilkan data`);
    }

    input.queryBuilder = [];
    input.relationBuilder = [];
    input.filter = [`A.id = ?`];
    input.filterValue = [input.id];
    input.data = [];
    // BUILDER QUERY
    for (let item of input.dinamicModel.FIELDS) {
      if (item.methods.view) {
        let viewConf = item.methods.view;
        if (typeof viewConf === 'object') {
          // TYPE VIEW
          if (viewConf.type === 'lookup') {
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
          } else if (viewConf.type === 'datetime') {
            input.queryBuilder.push(
              `to_char(A.${item.id},'YYYY-MM-DD hh24:MI:ss') AS ${item.id}`
            );
          } else if (viewConf.type === 'date') {
            input.queryBuilder.push(
              `to_char(A.${item.id},'YYYY-MM-DD') AS ${item.id}`
            );
          } else if (viewConf.type === 'image' || viewConf.type === 'file') {
            input.queryBuilder.push(
              `A.${item.id},CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/${process.env.FILE_UPLOAD_PATH}/${viewConf.path}/',A.${item.id}) ELSE '' END AS ${item.id}_preview`
            );
            if (viewConf.type === 'image') {
              input.queryBuilder.push(
                ` CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/${process.env.FILE_UPLOAD_PATH}/${viewConf.path}/thumbnail_',A.${item.id}) ELSE '' END AS ${item.id}_thumbnail`
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

    return input;
  },

  prepare: async function (input, db) {
    input.currentUserId = input.session.user_id;
    input.currentCorporateId = input.session.corporate_id;
    input.primaryTable = input.dinamicModel.TABLE_NAME;
    // STATIC FILTER
    if (input.dinamicModel.STATIC_FILTER) {
      for (let item of input.dinamicModel.STATIC_FILTER) {
        input.filter.push(`A.${item.id} = ?`);
        if (item.value === "current_corporate_id") {
          input.filterValue.push(input.currentCorporateId);
        } else if (item.value === "current_user_id") {
          input.filterValue.push(input.currentUserId);
        }
      }
    }

    // VALIDATION DATA
    if (Array.isArray(input.dinamicModel.VALIDATION_DATA)) {
      for (let item of input.dinamicModel.VALIDATION_DATA) {
        for (let a of item.validation) {
          let val = "";
          if (a.value === "current_value") {
            val = input[item.id];
          } else if (a.value === "current_corporate_id") {
            val = input.currentCorporateId;
          } else if (a.value === "current_user_id") {
            val = input.currentUserId;
          } else if (a.value === "parent_value") {
            val = input[a.parent_id];
          } else {
            val = a.value;
          }
          if (val) {
            input.filter.push(`rel_${item.id}.${a.id} = ?`);
            input.filterValue.push(val);
          }
        }
      }
    }

    // FILTER SOFT DELETE
    if (input.dinamicModel.SOFT_DELETE) {
      input.filter.push(`A.active = '1' `);
    }

    // CUSTOM QUERY BUILDER
    if (input.originModel.customBuilder instanceof Function) {
      input.CoreException = CoreException;
      await input.originModel.customBuilder(input, db);
    }

    input.filter =
      input.filter.length > 0 ? `WHERE ` + input.filter.join(" AND ") : "";

    if (input.dinamicModel.HAS_MANY) {
      let tempJoin = [];
      let displayJoin = [];
      let tempSql = "";
      for (itemHasMany of input.dinamicModel.HAS_MANY) {
        displayJoin.push("A.*");
        for (itemJoin of itemHasMany.LEFT_JOIN) {
          displayJoin.push(`${itemJoin.DISPLAY}`);
          tempJoin.push(
            ` LEFT JOIN ${itemJoin.TABLE_NAME}  ON A.${itemJoin.FOREIGN_KEY} = ${itemJoin.TABLE_NAME}.id  `
          );
        }
        tempSql += `SELECT ${displayJoin} FROM ${itemHasMany.TABLE_NAME} A `;
        tempSql += tempJoin.join(" ");
        tempSql += `WHERE A.${itemHasMany.FOREIGN_KEY} = ?`;
        input.data[itemHasMany.TABLE_NAME] = await db.run_select(tempSql, [
          input.id,
        ]);
      }
    }

    return input;
  },

  process: async function (input, OriginalInput, db) {
    let data = [];
    var sql = ` SELECT ${input.queryBuilder.join(', \n')} FROM ${
      input.primaryTable
    } A \n
                ${input.relationBuilder.join(' \n')}
                ${input.filter} LIMIT 1`;
    data = await db.row(sql, input.filterValue);

    for (let item in input.data) {
      data[Object.keys(input.data)] = input.data[item];
    }

    return data;
  },
  validation: {},
};

module.exports = CoreService(service);
