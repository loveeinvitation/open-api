const { CoreService, CoreException } = require('../../core/CallService')
const router = require('../../models/_index')

/**
 * Service DINAMIC LIST
 */

const service = {
  input: function (request) {
    // VALIDATION QUERY PARAM
    this.validation = {
      limit: 'integer|min:0',
      offset: 'integer|min:0',
    }
    let input = request.query

    // DEFINE PATH PARAM
    const route = request.params.model

    // UNDEFINED MODEL
    if (!router[route]) {
      throw new CoreException( `Page not found|Halaman tidak ditemukan`,{},404)
    }

    // DEFINE MODEL
    const model = require(`../../models/.${router[route]}.js`)
    input.dinamicModel = model.model
    input.originModel = model

    // CHECK PERMISSION IN MODEL
    if (!input.dinamicModel.ALLOW.list) {
      throw new CoreException(`Cant get data|Tidak diijinkan menampilkan data`)
    }

    input.queryBuilder = []
    input.relationBuilder = []
    input.filter = []
    input.filterValue = []
    input.searchField = []
    input.searchValue = []
    input.orderBy = ''

    // BUILDER QUERY
    for (let item of input.dinamicModel.FIELDS) {
      if (item.methods.list) {
        let listConf = item.methods.list
        if (typeof listConf === 'object') {
          // TYPE LIST
          if (listConf.type === 'lookup') {
            input.relationBuilder.push(
              ` LEFT JOIN ${listConf.relation_table} rel_${item.id} ON rel_${item.id}.${listConf.relation_field} = A.${item.id}  `
            )
            if (Array.isArray(listConf.relation_display)) {
              for (let a of listConf.relation_display) {
                input.queryBuilder.push(
                  `A.${item.id},rel_${item.id}.${a} AS ${item.id}_${a}`
                )
                // SEARCH LOOKUP
                if (listConf.search && input.search) {
                  input.searchField.push(`rel_${item.id}.${a}::varchar ILIKE  ? `)
                  input.searchValue.push(`%${input.search}%`)
                }
              }
            }
          } else if (listConf.type === 'datetime') {
            input.queryBuilder.push(
              `to_char(A.${item.id},'YYYY-MM-DD hh24:MI:ss') AS ${item.id}`
            )
          } else if (listConf.type === 'date') {
            input.queryBuilder.push(
              `to_char(A.${item.id},'YYYY-MM-DD') AS ${item.id}`
            )
          } else if (listConf.type === 'image' || listConf.type === 'file') {
            input.queryBuilder.push(
              `A.${item.id},CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/${process.env.FILE_UPLOAD_PATH}/${listConf.path}/',A.${item.id}) ELSE '' END AS ${item.id}_preview`
            )
            if (listConf.type === 'image') {
              input.queryBuilder.push(
                ` CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/${process.env.FILE_UPLOAD_PATH}/${listConf.path}/thumbnail_',A.${item.id}) ELSE '' END AS ${item.id}_thumbnail`
              )
            }
          } else {
            input.queryBuilder.push(`A.${item.id}`)
          }
          // END TYPE LIST

          // SET VALIDATION QUERY PARAMS
          if (Array.isArray(listConf.validation)) {
            this.validation[item.id] = listConf.validation.join('|')
          }
          // ORDER BY
          if (listConf.sort && input.order === item.id) {
            input.orderBy = `A.${item.id}`
          }
          // FILTER
          if (listConf.filter && input[item.id]) {
            console.log('input[item.id]', listConf.filter.operator)
            switch (listConf.filter.operator) {
              case '!=':
                input.filter.push(`A.${item.id} != ?`)
                input.filterValue.push(input[item.id])
                break
              case '>':
                input.filter.push(`A.${item.id} > ?`)
                input.filterValue.push(input[item.id])
                break
              case 'in':
                input.filter.push(`A.${item.id} IN (?)`)
                input.filterValue.push(input[item.id])
                break
              case 'ILIKE':
                input.filter.push(`A.${item.id} ILIKE ?`)
                input.filterValue.push(`%${input[item.id]}%`)
                break
              default:
                input.filter.push(`A.${item.id} = ?`)
                input.filterValue.push(input[item.id])
            }

            // input.filter.push(`A.${item.id} = ?`);
            // input.filterValue.push(input[item.id]);
          }
          // SEARCH
          if (listConf.search && input.search) {
            if (
              listConf.type === 'text' ||
              listConf.type == null ||
              listConf.type == undefined
            ) {
              input.searchField.push(`A.${item.id}::varchar ILIKE  ? `)
              input.searchValue.push(`%${input.search}%`)
            } else if (
              listConf.type === 'integer' ||
              listConf.type === 'decimal'
            ) {
              input.searchField.push(`A.${item.id} =  ?`)
              input.searchValue.push(`${input.search}`)
            }
          }
        } else {
          input.queryBuilder.push(`A.${item.id}`)
        }
      }
    }
    return input
  },

  prepare: async function (input, db) {
    input.currentUserId = input.session.user_id
    input.currentCorporateId = input.session.corporate_id
    input.primaryTable = input.dinamicModel.TABLE_NAME

    // STATIC FILTER
    if (input.dinamicModel.STATIC_FILTER) {
      for (let item of input.dinamicModel.STATIC_FILTER) {
        input.filter.push(`A.${item.id} = ?`)
        if (item.value === 'current_corporate_id') {
          input.filterValue.push(input.currentCorporateId)
        } else if (item.value === 'current_user_id') {
          input.filterValue.push(input.currentUserId)
        } else {
          input.filterValue.push(item.value)
        }
      }
    }

    // VALIDATION DATA
    if (Array.isArray(input.dinamicModel.VALIDATION_DATA)) {
      for (let item of input.dinamicModel.VALIDATION_DATA) {
        for (let a of item.validation) {
          let val = ''
          if (a.value === 'current_value') {
            val = input[item.id]
          } else if (a.value === 'current_corporate_id') {
            val = input.currentCorporateId
          } else if (a.value === 'current_user_id') {
            val = input.currentUserId
          } else if (a.value === 'parent_value') {
            val = input[a.parent_id]
          } else {
            val = a.value
          }
          if (val) {
            input.filter.push(`rel_${item.id}.${a.id} = ?`)
            input.filterValue.push(val)
          }
        }
      }
    }

    // FILTER SOFT DELETE
    if (input.dinamicModel.SOFT_DELETE) {
      input.filter.push(`A.active = '1' `)
    }

    // PUSH SEARCH TO FILTER DATA
    if (input.searchField.length > 0) {
      input.filter.push(`( ${input.searchField.join(' OR ')})`)
    }

    if (input.searchValue.length > 0) {
      for (let a of input.searchValue) {
        input.filterValue.push(a)
      }
    }

    // CUSTOM QUERY BUILDER
    if (input.originModel.customBuilder instanceof Function) {
      input.CoreException = CoreException
      await input.originModel.customBuilder(input, db)
    }

    input.order = input.orderBy ? input.orderBy : 'A.id'
    input.limit = input.limit ? (input.limit > 5000 ? 5000 : input.limit) : 25
    input.offset = input.offset ? input.offset : 0
    input.sort = input.sort
      ? input.sort.toUpperCase() == 'ASC' || input.sort.toUpperCase() == 'DESC'
        ? input.sort.toUpperCase()
        : 'ASC'
      : 'ASC'
    input.filter = input.filter.length > 0 ? `WHERE ` + input.filter.join(' AND ') : ''
    return input
  },

  process: async function (input, OriginalInput, db) {
    var sql = ` SELECT ${input.queryBuilder.join(', \n')} FROM ${input.primaryTable} A \n 
    ${input.relationBuilder.join(' \n')} ${input.filter} \n 
    ORDER BY ${input.order} ${input.sort} 
    LIMIT ${input.limit} 
    OFFSET ${input.offset}`

    let data = await db.run_select(sql, input.filterValue)
    var sql2 = `SELECT COUNT(A.id) AS record FROM ${input.primaryTable} A \n ${input.relationBuilder.join(' \n')} ${input.filter}`
    let record = await db.row(sql2, input.filterValue)
    return {
      data: data,
      record: record ? record.record : 0,
    }
  },
  validation: {},
}

module.exports = CoreService(service)
