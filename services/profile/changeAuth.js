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
        let checkAuth = await db.row(`SELECT*FROM users WHERE id != ? AND (username = ? OR email = ? OR phone = ?)`, [input.session.user_id, input.username, input.email, input.phone])
        if (checkAuth) {
            if (checkAuth.email == input.email) {
                throw new CoreException(`Email has been registered|email telah terdaftar`)
            }
            if (checkAuth.phone == input.phone) {
                throw new CoreException(`phone number has been registered|nomor telepon telah terdaftar`)
            }
            if (checkAuth.username == input.username) {
                throw new CoreException(`username has been registered|username telah terdaftar`)
            }
            throw new CoreException(`Change auth failed|ubah autentikasi gagal`)
        }

        var sql = `SELECT id,password FROM users WHERE id = ? `
        let user = await db.row(sql, [input.session.user_id])
        if (!user) {
            throw new CoreException("User not found | Pengguna tidak ditemukan")
        }
        if (!bcrypt.compareSync(input.password, user.password)) {
            throw new CoreException("Password incorrect | Kata sandi salah")
        }

        return input
    },

    process: async function (input, OriginalInput, db) {
        let update = await db.run_update(`users`, {
            email: input.email,
            phone: input.phone,
            username: input.username
        }, {
            id: input.session.user_id
        })

        if (update) {
            return {
                message: "changed authentication successfully"
            }
        } else {
            throw new CoreException("Change password failed | Kata sandi gagal diperbarui")
        }
    },

    validation: {
        password: 'required',
        email: 'required|email',
        phone: 'required|phone',
        username: 'required',
    }
}


module.exports = CoreService(service)