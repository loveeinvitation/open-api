const { CoreService, CoreException } = require("../../core/CallService")
const router = require("../../models/_index")
const { Global } = require("../../util/globalFunction")
const dinamicCreate = require('./create')

/**
 * Service DINAMIC CREATE SLAVE
 */

const service = {
    transaction: true,
    validation: {},
    input: function (request, body) {
        // VALIDATION QUERY PARAM
        this.validation = {}

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
        if (!input.dinamicModel.ALLOW.createSlave) {
            throw new CoreException(`Cant add data|Tidak diijinkan menambahkan data`)
        }
        if (!input.dinamicModel.SLAVE) {
            throw new CoreException(`Cant slave add data|Tidak diijinkan menambahkan multi data`)
        }

        input.createData = {}
        input.createField = []
        input.fileRemove = []
        input.slaveConf = []

        // PARENT 
        for (let item of input.dinamicModel.FIELDS) {
            if (item.methods.create && item.id !== "id") {
                input.createField.push(item.id)
                let value = ""
                let createConf = item.methods.create
                if (typeof createConf === "object") {
                    // TYPE CREATE
                    value = input[item.id]
                    if (createConf.type === "integer" || createConf.type === "decimal") {
                        if (input[item.id] == 0) {
                            value = 0
                        } else if (!input[item.id]) {
                            value = createConf.default
                        } else if (createConf.default) {
                            value = createConf.default
                        }
                    } else if (
                        createConf.type === "image" ||
                        createConf.type === "file"
                    ) {
                        if (value) {
                            let path = `tmp/${value}`
                            if (!fs.existsSync(path)) {
                                throw new CoreException("File not found|file tidak ditemukan")
                            }
                            let ext = value.split(".")
                            let extensi = ext[ext.length - 1]
                            if (Array.isArray(createConf.allowed)) {
                                if (!createConf.allowed.includes(extensi)) {
                                    Global.deleteFile(`tmp / ${value}`)
                                    throw new CoreException(
                                        `file format not allowed | Format file tidak diijinkan`
                                    )
                                }
                            }
                            input.fileRemove.push({
                                filename: value,
                                path: createConf.path,
                                image: createConf.type === "image" ? true : false,
                            })
                        }
                    } else {
                        value = input[item.id]
                    }
                    // VALIDATION PAYLOAD
                    if (Array.isArray(createConf.validation)) {
                        this.validation[item.id] = createConf.validation.join("|")
                    }
                    // END TYPE CREATE
                } else {
                    value = input[item.id] ? input[item.id] : null
                }
                input.createData[item.id] = value
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
            // if (!slaveModel.ALLOW.create) {
            //     throw new CoreException(`cant add ${slaveModel.TITLE ? slaveModel.TITLE : ''}|tidak diijinkan menambahkan ${slaveModel.TITLE ? slaveModel.TITLE : ''}`)
            // }
            this.validation[slaveModel.TABLE_NAME] = 'required|array|minLength:1'
            if (!Array.isArray(input[slaveModel.TABLE_NAME])) {
                throw new CoreException(`Slave data invalid|data tidak valid`)
            }

            // BUILD MODEL
            let child = this.buildModel(slaveModel, input[slaveModel.TABLE_NAME], item)
            input.slaveConf.push({
                modelConfig: slaveConf,
                dinamicModel: slaveModel,
                createField: child.createField,
                createData: child.slaveInput,
                fileRemove: child.fileRemove,
                slave: item
            })
        }
        return input
    },

    prepare: async function (input, db) {
        return input
    },

    process: async function (input, OriginalInput, db) {
        // INSERT PARENT
        let parent = await dinamicCreate.call(input, db)
        if (parent) {
            input.parentData = parent.data
        }

        // INIT RESPONSE
        let response = parent

        // INSERT SLAVE
        for (let item of input.slaveConf) {
            response.data[item.dinamicModel.TABLE_NAME] = []
            for (let index = 0; index < item.createData.length; index++) {
                let field = item.createData[index]

                // SET SLAVE FIELD
                if (item.createField.includes(item.slave.slave_id)) {
                    field[item.slave.slave_id] = input.parentData[item.slave.id] || null
                }
                input.createData = field
                input.modelConfig = item.modelConfig
                input.dinamicModel = item.dinamicModel
                input.createField = item.createField
                input.fileRemove = item.fileRemove[index]
                // CALL DINAMIC CREATE SLAVE
                let child = await dinamicCreate.call(input, db)
                if (child) {
                    response.data[item.dinamicModel.TABLE_NAME].push(child.data)
                }
            }
        }
        return response
    },
    buildModel: function (conf, input = [], slaveConf = {}) {
        let result = {
            createField: [],
            fileRemove: [],
            slaveInput: [],
        }

        // VALIDATION PAYLOAD
        conf.FIELDS.map((item) => {
            if (item.methods.create && item.id !== "id" && item.id != slaveConf.slave_id) {
                let createConf = item.methods.create
                if (typeof createConf === "object") {
                    if (Array.isArray(createConf.validation)) {
                        this.validation[`${conf.TABLE_NAME}.*.${item.id}`] = createConf.validation.join("|")
                    }
                }
            }
        })

        input.map((data) => {
            let slaveInput = {}
            let fileRemove = []
            conf.FIELDS.map((item) => {
                if (item.methods.create && item.id !== "id") {
                    if (!result.createField.includes(item.id)) {
                        result.createField.push(item.id)
                    }
                    let value = ""
                    let createConf = item.methods.create

                    if (typeof createConf === "object") {
                        // TYPE CREATE
                        value = data[item.id]
                        if (createConf.type === "integer" || createConf.type === "decimal") {
                            if (data[item.id] == 0) {
                                value = 0
                            } else if (!data[item.id]) {
                                value = createConf.default
                            } else if (createConf.default) {
                                value = createConf.default
                            }
                        } else if (createConf.type === "image" || createConf.type === "file") {
                            if (value) {
                                let path = `tmp/${value}`
                                if (!fs.existsSync(path)) {
                                    throw new CoreException("File not found|file tidak ditemukan")
                                }
                                let ext = value.split(".")
                                let extensi = ext[ext.length - 1]
                                if (Array.isArray(createConf.allowed)) {
                                    if (!createConf.allowed.includes(extensi)) {
                                        Global.deleteFile(`tmp/${value}`)
                                        throw new CoreException(`file format not allowed | Format file tidak diijinkan`)
                                    }
                                }
                                fileRemove.push({
                                    filename: value,
                                    path: createConf.path,
                                    image: createConf.type === "image" ? true : false,
                                })
                            }
                        } else {
                            value = data[item.id]
                        }
                        // END TYPE CREATE
                    } else {
                        value = data[item.id] ? data[item.id] : null
                    }
                    slaveInput[item.id] = value
                }
            })
            result.slaveInput.push(slaveInput)
            result.fileRemove.push(fileRemove)
        })

        return result
    }
}

module.exports = CoreService(service)
