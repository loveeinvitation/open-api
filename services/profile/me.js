const { CoreService, CoreException } = require('../../core/CallService')


/**
 * Service My Profile
 */

const service = {
    input: function (request) {
        return request.query
    },

    prepare: async function (input, db) {
        return input
    },

    process: async function (input, OriginalInput, db) {
        var sql = ` SELECT A.name, A.phone, A.email, A.gender,A.photo,to_char(A.birth_date,'YYYY-MM-DD') AS birth_date,
                    A.religion_id,A.province_id,A.city_id,A.district_id,A.sub_district_id,A.birth_place_id,
                    B.name AS religion_name, C.name AS province_name, D.name AS city_name, E.name AS district_name,
                    F.name AS sub_district_name, G.name AS birth_place_name, 
                    CASE WHEN A.active ='1' THEN TRUE ELSE FALSE END AS active,
                    CASE WHEN A.verified ='1' THEN TRUE ELSE FALSE END AS verified,
                    to_char(A.created_at,'YYYY-MM-DD') AS registered_at
                    FROM users A
                    LEFT JOIN religion B ON B.id = A.religion_id
                    LEFT JOIN province C ON C.id = A.province_id
                    LEFT JOIN city D ON D.id = A.city_id
                    LEFT JOIN district E ON E.id = A.district_id
                    LEFT JOIN sub_district F ON F.id = A.sub_district_id
                    LEFT JOIN city G ON G.id = A.birth_place_id
                    WHERE A.id = ? LIMIT 1`

        let profile = await db.row(sql, [input.session.user_id])
        if (profile) {
            profile.photo_preview = profile.photo ? `${process.env.BASE_URL}/public/users/${profile.photo}` : ''
        }
        return profile
    },
    validation: {

    }
}


module.exports = CoreService(service)