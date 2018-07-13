var passport = require('passport');
var User     = require('../models/User.js');
var Game     = require('../models/Game.js');
var ObjectID = require('mongoose').mongo.ObjectID;

var ProfileController = {
  info: function(g) {
    return {
      name:   g.name,
      code:   g.code,
      stage:  {
        join:   'Joining',
        capt:   'Captioning',
        choice: 'Choosing Cards',
        vote:   'Voting',
        end:    'Ended',
      }[g.stage],
      admin:  g.users[0].name,
      max:    g.max_players,
      joined: g.users.length,
      date:   g.deadline,
    };
  },

  profile_get: function(req, res) {
    User.findOne({username: req.user.username},
    function(err, user) {
      if (err){console.log('profile get err: '+err);}
      Game.find({
            users: ObjectID(user._id),
          })
          .sort({name: 'asc'})
          .populate({path: 'users', options: { limit: 1 }})
          .exec(function(err, active) {
        if (!active) { active = []; }
        Game.find({
              users: {'$nin':[ObjectID(user._id)]},
              stage: 'join',
            })
            .limit(6)
            .sort({name: 'asc'})
            .populate({path: 'users', options: { limit: 1 }})
            .exec(function(err, other) {
          if (!other) { other = []; }

          res.render('profile', {
            user:  user,
            games: active.map(ProfileController.info),
            other: other .map(ProfileController.info),
          });
        });
      });
    });
  },

  search: function(req, res) {
    let perPage = 20;
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {return console.log('search user: '+err);}

      let query = {
        users: {'$nin':[ObjectID(user._id)]},
        stage: 'join',
      };

      Game.find(query)
          .limit(perPage)
          .skip(perPage * pageNum)
          .sort({name: 'asc'})
          .populate({path: 'users', options: { limit: 1 }})
          .exec(function(err, games) {
        if (err) {return console.log('search games: '+err);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {return console.log('search count: '+err);}

          res.render('search', {
            user:  user,
            games: games.map(ProfileController.info),
            page:  pageNum+1,
            count: count+1,
          });
        });
      });
    });
  },
};

exports = module.exports = ProfileController;
