var mongoose              = require('mongoose');
var PassportLocalStrategy = require('passport-local').Strategy;
var bcrypt                = require('bcrypt-nodejs');
var lang                  = require('../../configs/lang');

var schema = new mongoose.Schema({
  name:     {type:String,required:true,trim:true},
  email:    {type:String              ,trim:true,unique:true},
  username: {type:String,required:true,trim:true,lowercase:true,unique:true},
  password: {type:String,required:true},
  lang:     {type:String,default:'en',enum:Object.keys(lang)},
  created:  {type:Date,  default:Date.now},
});

//schema.index({username: 1});

schema.statics.localStrategy = new PassportLocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
  },

  // @see https://github.com/jaredhanson/passport-local
  function (username, password, done){
    var User = require('./User');
    User.findOne({username: username}, function(err, user){
      if (err) { return done(err); }

      if (!user){
        return done(null, false, { loginmessage: 'User not found.'} );
      }
      if (!user.validPassword(password)){
        return done(null, false, { loginmessage: 'Incorrect password.'} );
      }

      // Don't save password in session
      return done(null, {
        _id:      user._id,
        lang:     user.lang,
        name:     user.name,
        username: user.username,
      });
    });
  }
);

schema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

schema.statics.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

schema.statics.serializeUser = function(user, done){
  done(null, user);
};

schema.statics.deserializeUser = function(obj, done){
  done(null, obj);
};

exports = module.exports = mongoose.model('User', schema);
