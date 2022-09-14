const { CoreService, CoreException } = require("../../core/CallService")
const router = require("../../models/_index")
const dinamicUpdate = require('./update')

/**
 * Service DINAMIC UPDATE SLAVE
 */

function buildModel (conf, input = [], slaveConf = {}) {
    let result = {
        updateField: [],
        slaveInput: [],
        fileUpdate: [],
    }

    service.validation[`${conf.TABLE_NAME}.*.id`] = 'required|integer'

    // VALIDATION PAYLOAD
    conf.FIELDS.map((item) => {
        if (item.methods.update && item.id !== "id" && item.id != slaveConf.slave_id) {
            let updateConf = item.methods.update
            if (typeof updateConf === "object") {
                if (Array.isArray(updateConf.validation)) {
                    service.validation[`${conf.TABLE_NAME}.*.${item.id}`] = updateConf.validation.join("|")
                }
            }
        }
    })

    input.map((data) => {
        // SET ID VALUE
        let slaveInput = {
            id: data.id
        }
        let fileUpdate = []
        // FIELDS CONFIG 
        conf.FIELDS.map((item) => {
            if (item.methods.update && item.id !== "id") {
                if (!result.updateField.includes(item.id)) {
                    result.updateField.push(item.id)
                }
                let value = ""
                let updateConf = item.methods.update

                if (typeof updateConf === "object") {
                    // TYPE update
                    value = data[item.id]
                    if (updateConf.type === "integer" || updateConf.type === "decimal") {
                        if (data[item.id] == 0) {
                            value = 0
                        } else if (!data[item.id]) {
                            value = updateConf.default
                        } else if (!updateConf.default) {
                            value = updateConf.default
                        }
                    } else if (updateConf.type === "image" || updateConf.type === "file") {
                        fileUpdate.push({
                            id: item.id,
                            filename: value,
                            allowed: updateConf.allowed,
                            path: updateConf.path,
                            image: updateConf.type === 'image' ? true : false
                        })
                    } else {
                        value = data[item.id]
                    }
                    // END TYPE update
                } else {
                    value = data[item.id] ? data[item.id] : null
                }
                slaveInput[item.id] = value
            }
        })
        result.slaveInput.push(slaveInput)
        result.fileUpdate.push(fileUpdate)
    })

    return result
}


const service = {
    transaction: true,
    input: function (request, body) {
        // VALIDATION QUERY PARAM
        this.validation = {
            id: 'required|integer'
        }

        let input = request.body

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

        // CHECK PERMISSION IN MODEL
        if (!input.dinamicModel.ALLOW.updateSlave) {
            throw new CoreException(`Cant update data|Tidak diijinkan mengubah data`)
        }
        if (!input.dinamicModel.SLAVE) {
            throw new CoreException(`Cant slave update data|Tidak diijinkan mengubah multi data`)
        }

        input.updateData = {}
        input.updateField = []
        input.fileUpdate = []
        input.fileRemove = []
        input.fileDelete = []
        input.slaveConf = []

        // PARENT SLAVE
        for (let item of input.dinamicModel.FIELDS) {
            if (item.methods.update && item.id !== 'id') {
                input.updateField.push(item.id)
                let value = ''
                let updateConf = item.methods.update
                if (typeof updateConf === 'object') {
                    // TYPE update
                    value = input[item.id]
                    if (updateConf.type === 'integer' || updateConf.type === 'decimal') {
                        if (input[item.id] == 0) {
                            value = 0
                        } else if (!input[item.id]) {
                            value = updateConf.default
                        } else if (!updateConf.default) {
                            value = updateConf.default
                        }
                    } else if (updateConf.type === 'image' || updateConf.type === 'file') {
                        input.fileUpdate.push({
                            id: item.id,
                            filename: value,
                            allowed: updateConf.allowed,
                            path: updateConf.path,
                            image: updateConf.type === 'image' ? true : false
                        })
                    } else {
                        value = input[item.id]
                    }
                    // VALIDATION PAYLOAD
                    if (Array.isArray(updateConf.validation)) {
                        this.validation[item.id] = updateConf.validation.join('|')
                    }
                    // END TYPE update
                } else {
                    value = input[item.id] ? input[item.id] : null
                }
                input.updateData[item.id] = value
            }
        }

        // SLAVE 
        for (let item of input.dinamicModel.SLAVE) {
            let slaveConf = require(`../../models/.${router[item.route]}.js`)
            if (!slaveConf) {
                throw new CoreException(`Slave not found|slave tidak ditemukan`)
            }
            let slaveModel = slaveConf.model

            // CHECK PERMISSION SLAVE
            if (!slaveModel.ALLOW.update) {
                throw new CoreException(`cant update ${slaveModel.TITLE ? slaveModel.TITLE : ''}|tidak diijinkan mengubah ${slaveModel.TITLE ? slaveModel.TITLE : ''}`)
            }
            this.validation[slaveModel.TABLE_NAME] = 'required|array|minLength:1'
            if (!Array.isArray(input[slaveModel.TABLE_NAME])) {
                throw new CoreException(`Slave data invalid|data tidak valid`)
            }

            // BUILD MODEL
            let child = buildModel(slaveModel, input[slaveModel.TABLE_NAME], item)
            input.slaveConf.push({
                modelConfig: slaveConf,
                dinamicModel: slaveModel,
                updateData: child.slaveInput,
                updateField: child.updateField,
                fileUpdate: child.fileUpdate,
                slave: item,
            })
        }

        return input
    },

    prepare: async function (input, db) {
        return input
    },

    process: async function (input, OriginalInput, db) {
        // UPDATE PARENT
        let parent = await dinamicUpdate.call(input, db)
        if (parent) {
            input.parentData = parent.data
        }

        // INIT RESPONSE
        let response = parent
        // UPDATE SLAVE
        for (let item of input.slaveConf) {
            response.data[item.dinamicModel.TABLE_NAME] = []
            for (let index = 0; index < item.updateData.length; index++) {
                let field = item.updateData[index]
                // SET SLAVE FIELD
                if (item.updateField.includes(item.slave.slave_id)) {
                    field[item.slave.slave_id] = input.parentData[item.slave.id] || null
                }
                input.modelConfig = item.modelConfig
                input.dinamicModel = item.dinamicModel

                input.id = field.id
                delete field.id
                input.updateData = field
                input.updateField = item.updateField
                input.fileUpdate = item.fileUpdate[index]
                input.fileRemove = []
                input.fileDelete = []

                // CALL DINAMIC update SLAVE
                let child = await dinamicUpdate.call(input, db)
                if (child) {
                    response.data[item.dinamicModel.TABLE_NAME].push(child.data)
                }
            }
        }

        return response
    },
    validation: {},
}

module.exports = CoreService(service)
