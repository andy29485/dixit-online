var pug        = require('pug');
var nodemailer = require('nodemailer');
var account    = require('../../configs/email-auth.js');

const compiledFunction = pug.compileFile(__dirname+'/../../views/email.pug');

exports = module.exports = function(users, options) {
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
    subject: options.t('subject', options.game.name),
    html:    compiledFunction(options),
  };

  if(bcc) {
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
    });
  }
};
