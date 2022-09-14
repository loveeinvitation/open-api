const nodemailer = require("nodemailer")

async function sendEmail(data) {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: false,
        auth: {
            user: "",
            pass: ""
        },
        logger: false,
        debug: false
    })

    let message = {
        from: '"' + process.env.APP_NAME + '" <noreply@readymix-business.com>', // sender address
        to: data.email,
        subject: data.subject ? data.subject : 'RBS',
        text: data.text,
        html: data.html,
    }

    transporter.sendMail(message, (error, info) => {
        if (error) {
            console.log('Send Email failed')
            console.log(error)
            return transporter.close()
        }else{
            console.log(info)
        }
    })
    transporter.close()
    return
}

module.exports = { sendEmail }