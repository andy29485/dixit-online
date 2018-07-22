var passport = require('passport');
var User     = require('../models/User.js');
var Game     = require('../models/Game.js');
var ObjectID = require('mongoose').mongo.ObjectID;

const perPage = 20;

var ProfileController = {
  info: function(g, t) {
    return {
      name:   g.name,
      code:   g.code,
      stage:  t('stages')[g.stage],
      admin:  g.users[0].name,
      adminu: g.users[0].username,
      max:    g.max_players,
      joined: g.users.length,
      date:   g.deadline,
    };
  },

  settings_get: function(req, res) {
    User.findOne({username: req.user.username}, function(err, user) {
      res.cookie('lang', req.user.lang = user.lang);
      res.render('settings', {
        user: user,
        badsetmessage:  req.flash('badsetmessage'),
        goodsetmessage: req.flash('goodsetmessage'),
      });
    });
  },

  settings_post: function(req, res) {
    User.findOne({username: req.user.username}, function(err, user) {
      if(req.body.name &&  req.body.name !== user.name) {
        req.flash('goodsetmessage', 'name_updated');
        req.user.name = user.name = req.body.name;
      }

      if(req.body.lang && req.body.lang !== user.lang) {
        req.flash('goodsetmessage', 'lang_updated');
        res.cookie('lang', req.user.lang = user.lang = req.body.lang);
      }

      // User wishes to change their email
      if(req.body.email && req.body.email !== user.email) {
        req.flash('goodsetmessage', 'email_updated');
        user.email = req.body.email;
      }

      // User wishes to change the password
      if(req.body.oldpass || req.body.password || req.body.password2) {
        if(!req.body.oldpass) {
          req.flash('badsetmessage', 'password_missing');
        }
        else if(!user.validPassword(req.body.oldpass)) {
          req.flash('badsetmessage', 'password_incorect');
        }
        else if(req.body.password !== req.body.password2) {
          req.flash('badsetmessage', 'pass_missmatch');
        }
        else {
          req.flash('goodsetmessage', 'password_updated');
          user.password = User.generateHash(req.body.password);
        }
      }

      user.save(function(err) {
        if (err) {
          console.log('settings save fail: '+err);
          req.flash('badsetmessage');
          req.flash('badsetmessage', req.t('settings_save_error'));
        }
      });

      res.redirect('/settings');
    });
  },

  profile_get: function(req, res) {
    User.findOne({username: req.params.username||req.user.username},
    function(err, user) {
      if (err || !user) {
        console.log('profile get err: '+err);
        return res.sendStatus(404);
      }
      res.cookie('lang', req.user.lang = user.lang);

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
              user:       user,
              uname:      req.user.username,
              games:      active  .map(g=>ProfileController.info(g, req.t)),
              other:      other   .map(g=>ProfileController.info(g, req.t)),
              archived:   archived.map(g=>ProfileController.info(g, req.t)),
              errmessage: req.flash('game'),
            });
          });
        });
      });
    });
  },

  active: function(req, res) {
    if(isNaN(req.params.page||0)) {
      return res.sendStatus(404);
    }
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err || !user){
        console.log('search user: '+err);
        return res.sendStatus(404);
      }
      res.cookie('lang', req.user.lang = user.lang);

      let query = {users: ObjectID(user._id), stage: {'$ne': 'end'}};

      Game.find(query)
          .limit(perPage)
          .skip(perPage * pageNum)
          .sort({name: 'asc'})
          .populate('users')
          .exec(function(err, games) {
        if(err){console.log('search games: '+err);return res.sendStatus(404)}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if(err){console.log('search count: '+err);return res.sendStatus(404)}

          res.render('search', {
            user:    user,
            games:   games.map(g=>ProfileController.info(g, req.t)),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'active',
            title:   req.t('active_games'),
            timetag: req.t('end_date_stage'),
          });
        });
      });
    });
  },

  search: function(req, res) {
    if(isNaN(req.params.page||0)) {
      return res.sendStatus(404);
    }
    let pageNum = (req.params.page || 1) - 1;

    User.findOne({username: req.user.username},
    function(err, user) {
      if (err || !user){
        console.log('search user: '+err);
        return res.sendStatus(404);
      }
      res.cookie('lang', req.user.lang = user.lang);

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
        if(err){console.log('search games: '+err);return res.sendStatus(404)}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if(err){console.log('search count: '+err);return res.sendStatus(404)}

          res.render('search', {
            user:    user,
            games:   games.map(g=>ProfileController.info(g, req.t)),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'search',
            title:   req.t('joinable_games'),
            timetag: req.t('end_date_join'),
          });
        });
      });
    });
  },

  archive: function(req, res) {
    let uname   = req.params.uname||req.user.username;
    let pageNum = 0;
    if(isNaN(req.params.page||0)) {
      uname = req.params.page
    }
    else {
      pageNum = (req.params.page || 1) - 1;
    }

    User.findOne({username: uname},
    function(err, user) {
      if (err || !user){
        console.log('search user: '+err);
        return res.sendStatus(404);
      }
      res.cookie('lang', req.user.lang = user.lang);

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
        if(err){console.log('search games: '+err);return res.sendStatus(404)}
        if (!games) { games = []; }

        Game.count(query, function(err, count) {
          if(err){console.log('search count: '+err);return res.sendStatus(404)}

          res.render('search', {
            user:    user,
            games:   games.map(g=>ProfileController.info(g, req.t)),
            page:    pageNum+1,
            count:   Math.floor(count/perPage)+1,
            path:    'archive',
            title:   req.t('archived_games'),
            timetag: req.t('end_date_end'),
          });
        });
      });
    });
  },

  delete: function(req, res) {
    User.findOne({username: req.user.username},
    function(err, user) {
      if (err || !user){
        console.log('search user: '+err);
        return res.sendStatus(404);
      }
      res.cookie('lang', req.user.lang = user.lang);

      let query = {
        'users.0': ObjectID(user._id),
        'stage':   {'$ne': 'end'},
        'code':    req.params.id,
      };

      Game.find(query)
          .remove()
          .exec(function(err) {
        if(err) {console.log(err); return res.sendStatus(404);}
        return res.redirect('back');
      });

    });
  },
};

exports = module.exports = ProfileController;
