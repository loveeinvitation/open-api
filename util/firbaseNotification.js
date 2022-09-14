const admin = require("firebase-admin")
const { database } = require("../core/CallService")
const serviceAccount = require("../firebase.json")
const { Global } = require("./global-function")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://taptap-presensi.com/"
})

async function pushNotification (data, db, dataUser = '') {

    let token = ''
    let name = ''
    if (data.recipient_id) {
        if (!dataUser) {
            let sql = `SELECT A.id, A.name, B.firebase_token FROM users A
                LEFT JOIN api_token B ON B.user_id = A.id
                WHERE A.id = ? 
                LIMIT 1`
            dataUser = await database.raw(sql, data.recipient_id)
            .then((row)=>{
                return row.rows[0]
            })
            .catch((err)=>{
                console.log(err)
                return
            })
        }
        if (dataUser) {
            if (dataUser.firebase_token) {
                token = dataUser.firebase_token
                name = dataUser.name
            }
        }
        if (!data.unsave) {
            let insertNotification = {
                user_id: data.recipient_id,
                title: data.title,
                description: data.body,
                status: 'N',
                created_by: data.sender_id,
                created_at: Global.CurrentDateTime()
            }
            if (data.data) {
                insertNotification.data = JSON.stringify(data.data)
            }
            database.insert(insertNotification).into(`notification`)
                .catch((err) => {
                    console.log('error', err)
                })
        }
    }

    if (token) {
        var payload = {
            notification: {
                title: data.title,
                body: data.body,
                data: data.data ? JSON.stringify(data.data) : ''
            }
        }

        var options = {
            priority: "high",
            timeToLive: 60 * 60 * 24
        }

        admin.messaging().sendToDevice(token, payload, options)
            .then(function (response) {
                if (response.failureCount) {
                    console.log(`FAILED PUSH NOTIFICATION TO ${ name }`)
                }

                if (response.successCount) {
                    console.log(`SUCCESS PUSH NOTIFICATION TO ${ name }`)
                }
                // console.log("Successfully push notification:", response)
            })
            .catch(function (error) {
                console.log("Error push notification:", error)
            })
    }
}

module.exports = { pushNotification }