var passport = require('passport');
var User     = require('../models/User.js');
var Game     = require('../models/Game.js');
var ObjectID = require('mongoose').mongo.ObjectID;

const perPage = 20;

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
      Game.find({users: ObjectID(user._id), stage: {'$ne': 'end'}})
          .limit(6)
          .sort({name: 'asc'})
          .populate('users')
          .exec(function(err, active) {
        if (!active) { active = []; }
        Game.find({
              users: {'$nin':[ObjectID(user._id)]},
              stage: 'join',
              '$or': [
                {max_players: 0},
                {'$where': 'this.users.length < this.max_players'},
              ],
            })
            .limit(6)
            .sort({name: 'asc'})
            .populate('users')
            .exec(function(err, other) {
          if (!other) { other = []; }
          Game.find({users: ObjectID(user._id), stage: 'end'})
              .limit(6)
              .sort({name: 'asc'})
              .populate('users')
              .exec(function(err, archived) {
            if (!archived) { archived = []; }

            res.render('profile', {
              user:     user,
              games:    active  .map(ProfileController.info),
              other:    other   .map(ProfileController.info),
              archived: archived.map(ProfileController.info),
            });
          });
        });
      });
    });
  },

  active: function(req, res) {
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {return console.log('search user: '+err);}

      let query = {users: ObjectID(user._id), stage: {'$ne': 'end'}};

      Game.find(query)
          .limit(perPage)
          .skip(perPage * pageNum)
          .sort({name: 'asc'})
          .populate('users')
          .exec(function(err, games) {
        if (err) {return console.log('search games: '+err);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {return console.log('search count: '+err);}

          res.render('search', {
            user:  user,
            games: games.map(ProfileController.info),
            page:  pageNum+1,
            count: Math.floor(count/perPage)+1,
            path:  'active',
            title: 'Your Active',
          });
        });
      });
    });
  },

  search: function(req, res) {
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {return console.log('search user: '+err);}

      let query = {
        users: {'$nin':[ObjectID(user._id)]},
        stage: 'join',
        '$or': [
          {max_players: 0},
          {'$where': 'this.users.length < this.max_players'},
        ],
      };

      Game.find(query)
          .limit(perPage)
          .skip(perPage * pageNum)
          .sort({name: 'asc'})
          .populate('users')
          .exec(function(err, games) {
        if (err) {return console.log('search games: '+err);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {return console.log('search count: '+err);}

          res.render('search', {
            user:    user,
            games:   games.map(ProfileController.info),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'search',
            title:   'Joinable',
            timetag: 'Stage End Date',
          });
        });
      });
    });
  },

  archive: function(req, res) {
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {return console.log('search user: '+err);}

      let query = {
        users: ObjectID(user._id),
        stage: 'end',
      };

      Game.find(query)
          .limit(perPage)
          .skip(perPage * pageNum)
          .sort({name: 'asc'})
          .populate('users')
          .exec(function(err, games) {
        if (err) {return console.log('search games: '+err);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {return console.log('search count: '+err);}

          res.render('search', {
            user:    user,
            games:   games.map(ProfileController.info),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'archive',
            title:   'Your Archived',
            timetag: 'Game End Date',
          });
        });
      });
    });
  },
};

exports = module.exports = ProfileController;
