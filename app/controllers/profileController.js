var passport = require('passport');
var User     = require('../models/User.js');
var Game     = require('../models/Game.js');
var ObjectID = require('mongoose').mongo.ObjectID;

var AuthController = {
  profile_get: function(req, res) {
    User.findOne({username: req.user.username},
    function(err, user) {
      if (err){console.log('profile get err: '+err);}
      Game.find({
            users: {'$nin':[ObjectID(user._id)]},
            stage: 'join',
          })
          .limit(6)
          .exec(function(err, games) {
        if (!games) { games = []; }
        res.render('profile', {
          user: user,
          games: user.games.toJSON(),
          other: games.map(g => {return {name: g.name, code:g.code};}),
        });
      });
    });
  },
};

exports = module.exports = AuthController;
