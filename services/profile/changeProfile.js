const { CoreService, CoreException } = require('../../core/CallService')
const UserProfile = require("./me")
const fs = require('fs')
const { Global } = require('../../util/globalFunction')

/**
 * Service NODEJS
 */

const service = {
    input: function (request) {
        return request.body
    },

    prepare: async function (input, db) {
        let usersCheck = await db.row(`SELECT*FROM users where id = ? `, [input.session.user_id])
        input.last_photo = usersCheck.photo
        return input
    },

    process: async function (input, OriginalInput, db) {
        if (input.photo) {
            let dir = 'public/users/'
            if (!fs.existsSync(dir)) {
                await fs.mkdirSync(dir)
            }
            fs.renameSync(`tmp/${input.photo}`, `${dir}${input.photo}`)
        }

        await db.run_update(`users`, {
            name: input.name,
            gender: input.gender,
            birth_date: input.birth_date,
            birth_place_id: input.birth_place_id,
            province_id: input.province_id,
            city_id: input.city_id,
            district_id: input.district_id,
            sub_district_id: input.sub_district_id,
            religion_id: input.religion_id,
            address: input.address,
            photo: input.photo ? input.photo : input.last_photo,
            updated_at: Global.currentDateTime(),
            updated_by: input.session.user_id
        },
            {
                id: input.session.user_id
            }
        )
        let me = UserProfile.call(input, db)
        return me
    },
    validation: {
        name: 'required',
        gender: 'string|maxLength:1',
        birth_date: 'date',
        birth_place_id: 'integer',
        province_id: 'integer',
        city_id: 'integer',
        district_id: 'integer',
        sub_district_id: 'integer',
        religion_id: 'integer',

    }
}


module.exports = CoreService(service)