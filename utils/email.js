const nodemailer = require('nodemailer');
const catchAsync = require('./catchAsync');

const sendEmail = async (options) => {
  //1 create a transporter
  const transported = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // host: process.env.EMAIL_HOST,
    // port: process.env.PORT,
    // auth: {
    //   user: process.env.EMAIL_TEST,
    //   pass: process.env.EMAIL_PASS,
    // },
  });

  //define email options
  const mailOptions = {
    from: 'ankitkumar8317@gmail.com',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  //send email
  await transported.sendMail(mailOptions);
  console.log('email');
};

module.exports = sendEmail;
