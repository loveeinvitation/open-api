const { OAuth2Client } = require('google-auth-library');
async function verify(idToken = '') {
    const client = new OAuth2Client(process.env.googleClientId);
    return await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.googleClientId,
    })
        .then((res) => {
            return res.getPayload()
        })
        .catch((err) => {
            console.log('Error verify o2Atuh ', err)
            return
        })
}
module.exports = { verify }