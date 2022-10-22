const config = require('../../config/config')
const client = require("twilio")(config.accountSID, config.authTocken);

module.exports = {
  sendOtp: (phone) => {
    console.log("started to send");

    //   phone = "+91" + phone;
    console.log(phone);
    client.verify
      .services(config.ServiceID)
      .verifications.create({
        to: `+91${phone}`,
        channel: "sms"
      })
      .then((data) => {
        console.log(`otp Sending successfully to ${phone}`);
      });
  },
  veriOtp: (otpval, phone) => {
    return new Promise(async (res, rej) => {
      phone = "+91" + phone;
      console.log(phone);
      var OTP = "";
      var otpverify;

      otpval.forEach((val) => {
        OTP += val;
      });
      console.log(OTP);
      // chcking the otp

      if (OTP.length == 6) {
        await client.verify
          .services(config.ServiceID)
          .verificationChecks.create({
            to: phone,
            code: OTP,
          })
          .then((data) => {
            console.log(data);
            if (data.status == "approved") {
              otpverify = true;
            } else {
              otpverify = false;
            }
          });
      } else {
        otpverify = false;
      }
      console.log(otpverify);
      res(otpverify);
    });
  },
};