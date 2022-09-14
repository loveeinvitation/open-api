const { CoreService, CoreException } = require('../../core/CallService')
const bcrypt = require('bcryptjs')

/**
 * CHANGE PASSWORD
 */

const service = {
    transaction: false,
    task: null,
    input: function (request) {
        return request.body
    },

    prepare: async function (input, db) {
        if (input.password != input.retype_password) {
            throw new CoreException("Password didn't match | Kata sandi tidak sama")
        }
        var sql = `SELECT id,password FROM users WHERE id = ? `
        let user = await db.row(sql, [input.session.user_id])
        if (!user) {
            throw new CoreException("User not found | Pengguna tidak ditemukan")
        }
        if (!bcrypt.compareSync(input.current_password, user.password)) {
            throw new CoreException("Password incorrect | Kata sandi salah")
        }

        return input
    },

    process: async function (input, OriginalInput, db) {
        let new_password = bcrypt.hashSync(input.password)
        let update = await db
            .update({ password: new_password })
            .into("users")
            .where({
                id: input.session.user_id
            })
            .returning('*')

        if (update) {
            return {
                message: "Your password has been changed successfully"
            }
        } else {
            throw new CoreException("Change password failed | Kata sandi gagal diperbarui")
        }
    },

    validation: {
        current_password: 'required',
        password: 'required|minLength:8',
        retype_password: 'required',
    }
}


module.exports = CoreService(service)