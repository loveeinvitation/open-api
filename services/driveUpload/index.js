const { CoreService, CoreException } = require('../../core/CallService')

const service = {
    input: function (request) {
        // return request.query  || INPUT FROM  PARAMS ATAU PATH PARAMS
        return request.body // INPUT FROM BODY
    },

    prepare: async function (input, db) {
        //  KONTENT || ATAU KOSONGI AJA
        return input
    },

    process: async function (input, OriginalInput, db) {
        const data = ''
        return { data: data }
    },
    validation: {}
}


module.exports = CoreService(service)