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
            users: ObjectID(user._id),
          })
          .exec(function(err, active) {
        if (!active) { active = []; }
        Game.find({
              users: {'$nin':[ObjectID(user._id)]},
              stage: 'join',
            })
            .limit(6)
            .populate('users')
            .exec(function(err, other) {
          if (!other) { other = []; }
          let info = function(g) { return {
            name:   g.name,
            code:   g.code,
            admin:  g.users[0].name,
            max:    g.max_players,
            joined: g.users.length,
            date:   g.deadline.toISOString().replace(/[A-Z]/g, ' '),
          };}
          res.render('profile', {
            user:  user,
            games: active.map(info),
            other: other .map(info),
          });
        });
      });
    });
  },
};

exports = module.exports = AuthController;
