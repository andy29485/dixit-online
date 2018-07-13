var passport = require('passport');
var User     = require('../models/User.js');
var flash    = require('connect-flash');

var AuthController = {
  // Login a user
  login: function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }

      if (!user) { return res.redirect('/'); }

      req.logIn(user, function(err) {
        if (err) { return next(err); }

        return res.redirect('/profile');
      });
    })(req, res, next);
  },

  // Log out a user
  logout: function(req, res) {
    req.logout();
    res.end();
  },

  register: function(req, res) {
    err = false;
    if (req.body.password != req.body.password2) {
      req.flash('regerror', 'Passwords do not match.');
      err = true;
    }
    if (req.body.password.length < 4) {
      req.flash('regerror', 'Passwords must be at least 4 chars');
      err = true;
    }
    if (req.body.username.length < 3) {
      req.flash('regerror', 'Username must be at least 3 characters');
      err = true;
    }
    if (err) {
      res.redirect('/?register');
      return;
    }
    User.create({
         name:     req.body.name,
         username: req.body.username,
         password: User.generateHash(req.body.password),
    }, function(err){
      if (err) {
        console.log(err);
        req.flash('regerror', 'username already exists');
        res.redirect('/?register');
        return;
      }

      res.redirect('/');
    });
  },
};

exports = module.exports = AuthController;
