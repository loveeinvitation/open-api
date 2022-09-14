const { CoreService, CoreException } = require('../../core/CallService')
const router = require('../../models/_index')

/*
 * Service DINAMIC DELETE
 */

const service = {
    transaction: false,
    input: function (request) {
        // VALIDATION QUERY PARAM
        this.validation = {
            id: 'required|integer',
            limit: 'integer|min:0',
            offset: 'integer|min:0',
        }
        let input = request.query
        input.id = request.params.id

        // DEFINE PATH PARAM 
        const route = request.params.model

        // UNDEFINED MODEL
        if (!router[route]) {
            throw new CoreException(`Page not found|Halaman tidak ditemukan`, {}, 404)
        }

        // DEFINE MODEL
        const model = require(`../../models/.${router[route]}.js`)
        input.modelConfig = model
        input.dinamicModel = model.model
        this.transaction = model.model.TRANSACTION ? model.model.TRANSACTION : false

        // CHECK PERMISSION IN MODEL
        if (!input.dinamicModel.ALLOW.delete) {
            throw new CoreException(`Cant delete data|Tidak diijinkan menghapus data`)
        }

        input.queryBuilder = []
        input.relationBuilder = []
        input.filter = [`A.id = ?`]
        input.filterValue = [input.id]

        // BUILDER QUERY
        for (let item of input.dinamicModel.FIELDS) {
            if (item.methods.view) {
                let viewConf = item.methods.view
                if (typeof viewConf === 'object') {
                    // TYPE VIEW
                    if (viewConf.type === 'lookup') {
                        input.relationBuilder.push(` LEFT JOIN ${viewConf.relation_table} rel_${item.id} ON rel_${item.id}.${viewConf.relation_field} = A.${item.id} `)
                        if (Array.isArray(viewConf.relation_display)) {
                            for (let a of viewConf.relation_display) {
                                input.queryBuilder.push(`rel_${item.id}.${a} AS ${item.id}_${a}`)
                            }
                        }
                    }
                    else if (viewConf.type === 'datetime') {
                        input.queryBuilder.push(`to_char(A.${item.id},'YYYY-MM-DD hh24:MI:ss') AS ${item.id}`)
                    }
                    else if (viewConf.type === 'date') {
                        input.queryBuilder.push(`to_char(A.${item.id},'YYYY-MM-DD') AS ${item.id}`)
                    } else if (viewConf.type === 'image' || viewConf.type === 'file') {
                        input.queryBuilder.push(`A.${item.id},CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/public/${viewConf.path}/',A.${item.id}) ELSE '' END AS ${item.id}_preview`)
                        if (viewConf.type === 'image') {
                            input.queryBuilder.push(` CASE WHEN A.${item.id} IS NOT NULL AND A.${item.id} !='' THEN CONCAT('${process.env.BASE_URL}/public/${viewConf.path}/thumbnail_',A.${item.id}) ELSE '' END AS ${item.id}_thumbnail`)
                        }
                    } else {
                        input.queryBuilder.push(`A.${item.id}`)
                    }
                    // END TYPE VIEW
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
                if (item.value === 'current_corporate_id') { input.filterValue.push(input.currentCorporateId) }
                else if (item.value === 'current_user_id') { input.filterValue.push(input.currentUserId) }
            }
        }

        // VALIDATION DATA
        if (Array.isArray(input.dinamicModel.VALIDATION_DATA)) {
            for (let item of input.dinamicModel.VALIDATION_DATA) {
                for (let a of item.validation) {
                    let val = ""
                    if (a.value === 'current_value') { val = input[item.id] }
                    else if (a.value === 'current_corporate_id') { val = input.currentCorporateId }
                    else if (a.value === 'current_user_id') { val = input.currentUserId }
                    else if (a.value === 'parent_value') { val = input[a.parent_id] }
                    else { val = a.value }
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

        input.filter = input.filter.length > 0 ? `WHERE ` + input.filter.join(" AND ") : ""

        // CHECK AVAILABILITY DATA
        var sql = ` SELECT A.* FROM ${input.primaryTable} A \n
                    ${input.relationBuilder.join(' \n')} 
                    ${input.filter} LIMIT 1`
        input.primaryData = await db.row(sql, input.filterValue)
        if (!input.primaryData) {
            throw new CoreException(`Data not found|data tidak ditemukan`)
        }

        return input
    },

    process: async function (input, OriginalInput, db) {
        // BEFORE DELETE
        if (input.modelConfig.beforeDelete instanceof Function) {
            input.CoreException = CoreException
            await input.modelConfig.beforeDelete(input, db)
        }

        // HANDLE SOFT DELETE
        if (input.dinamicModel.SOFT_DELETE) {
            await db.run_update(`${input.primaryTable}`, { active: '0' }, { id: input.id })
        } else {
            await db.run_delete(`${input.primaryTable}`, { id: input.id })
        }

        // AFTER DELETE
        if (input.modelConfig.afterDelete instanceof Function) {
            input.CoreException = CoreException
            await input.modelConfig.afterDelete(input, db)
        }

        return {
            message: 'Delete data successfully',
            data: input.primaryData
        }
    },
    validation: {}
}


module.exports = CoreService(service)