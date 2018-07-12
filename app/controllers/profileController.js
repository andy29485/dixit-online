var passport = require('passport');
var User     = require('../models/User.js');

var AuthController = {
  profile_get: function(req, res) {
    User.findOne({username: req.user.username},
    ['name', 'games'],
    function(err, user) {
      if (err){console.log('profile get err: '+err);}
      res.render('profile', {
        user: user,
        games: user.games,
      });
    });
  },
};

exports = module.exports = AuthController;
