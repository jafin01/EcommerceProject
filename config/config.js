const dotenv = require('dotenv');
dotenv.config({ path: "config.env" })

module.exports={
    
    ServiceID : process.env.TWILIO_SERVICE_SID,
    accountSID : process.env.TWILIO_ACCOUNT_SID,
    authTocken : process.env.TWILIO_AUTH_TOCKEN

}