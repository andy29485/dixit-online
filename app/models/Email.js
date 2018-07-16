var nodemailer = require('nodemailer');
var account    = require('../../configs/email-auth.js');

exports = module.exports = function(users, subject, message) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: account.service,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  let bcc = users.map(u=>u.email).filter(u=>u).join(', ');

  // setup email data with unicode symbols
  let mailOptions = {
    from:    '"'+account.name+'" <'+account.address+'>',
    bcc:     bcc,
    subject: subject,
    html:    message
  };

  console.log(mailOptions);

  if(bcc) {
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
    });
  }
};
