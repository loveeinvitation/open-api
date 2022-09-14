const { CoreService, CoreException } = require('../../core/CallService')


/**
 * Service Template Service
 */

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
        var sql = ` QUERY `
        let data = await db.row(sql, [input.session.user_id]) // RETURN OBJECT

        // let data = await db.run_select(sql, [input.session.user_id]) // RETURN ARRAY 

        return {
            data: data
        }
        // ATAU 
        return data


    },
    validation: {

    }
}


module.exports = CoreService(service)