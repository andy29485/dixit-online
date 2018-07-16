var passport = require('passport');
var User     = require('../models/User.js');
var Game     = require('../models/Game.js');
var ObjectID = require('mongoose').mongo.ObjectID;
var lang     = require('../../configs/lang');

const perPage = 20;

var ProfileController = {
  info: function(g, l) {
    return {
      name:   g.name,
      code:   g.code,
      stage:  lang[l].stages[g.stage],
      admin:  g.users[0].name,
      adminu: g.users[0].username,
      max:    g.max_players,
      joined: g.users.length,
      date:   g.deadline,
    };
  },

  settings_get: function(req, res) {
    // TODO
  },

  settings_post: function(req, res) {
    // TODO
  },

  profile_get: function(req, res) {
    User.findOne({username: req.params.username||req.user.username},
    function(err, user) {
      if (err || !user) {
        console.log('profile get err: '+err);
        return res.status(404).send();
      }
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
              lang:     lang[user.lang],
              uname:    req.user.username,
              games:    active  .map(g=>ProfileController.info(g,user.lang)),
              other:    other   .map(g=>ProfileController.info(g,user.lang)),
              archived: archived.map(g=>ProfileController.info(g,user.lang)),
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
      if (err) {console.log('search user: '+err); return res.send(404);}

      let query = {users: ObjectID(user._id), stage: {'$ne': 'end'}};

      Game.find(query)
          .limit(perPage)
          .skip(perPage * pageNum)
          .sort({name: 'asc'})
          .populate('users')
          .exec(function(err, games) {
        if (err) {console.log('search games: '+err); return res.send(404);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {console.log('search count: '+err); return res.send(404);}

          res.render('search', {
            user:    user,
            lang:    lang[user.lang],
            games:   games.map(g=>ProfileController.info(g,user.lang)),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'active',
            title:   lang[user.lang].active_games,
            timetag: lang[user.lang].end_date_stage,
          });
        });
      });
    });
  },

  search: function(req, res) {
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {console.log('search user: '+err); return res.send(404);}

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
        if (err) {console.log('search games: '+err); return res.send(404);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {console.log('search count: '+err); return res.send(404);}

          res.render('search', {
            user:    user,
            lang:    lang[user.lang],
            games:   games.map(g=>ProfileController.info(g,user.lang)),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'search',
            title:   lang[user.lang].joinable_games,
            timetag: lang[user.lang].end_date_join,
          });
        });
      });
    });
  },

  archive: function(req, res) {
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {console.log('search user: '+err); return res.send(404);}

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
        if (err) {console.log('search games: '+err); return res.send(404);}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if (err) {console.log('search count: '+err); return res.send(404);}

          res.render('search', {
            user:    user,
            lang:    lang[user.lang],
            games:   games.map(g=>ProfileController.info(g,user.lang)),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'archive',
            title:   lang[user.lang].archived_games,
            timetag: lang[user.lang].end_date_end,
          });
        });
      });
    });
  },

  delete: function(req, res) {
    User.findOne({username: req.user.username},
    function(err, user) {
      if (err) {console.log('search user: '+err); return res.send(404);}

      let query = {
        'users.0': ObjectID(user._id),
        'stage':   {'$ne': 'end'},
        'code':    req.params.id,
      };

      Game.find(query)
          .remove()
          .exec(function(err) {
        if(err) {console.log(err); return res.send(404);}
        return res.redirect('back');
      });

    });
  },
};

exports = module.exports = ProfileController;
