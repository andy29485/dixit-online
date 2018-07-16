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
        req.flash('goodsetmessage', req.t('name_updated'));
        user.name = req.body.name;
      }

      if(req.body.lang && req.body.lang !== user.lang) {
        req.flash('goodsetmessage', req.t('lang_updated'));
        user.lang = req.body.lang;
      }

      // User wishes to change their email
      if(req.body.email && req.body.email !== user.email) {
        req.flash('goodsetmessage', req.t('email_updated'));
        user.email = req.body.email;
      }

      // User wishes to change the password
      if(req.body.oldpass || req.body.password || req.body.password2) {
        if(!req.body.oldpass) {
          req.flash('badsetmessage', req.t('password_missing'));
        }
        else if(!user.validPassword(req.body.oldpass)) {
          req.flash('badsetmessage', req.t('password_incorect'));
        }
        else if(req.body.password !== req.body.password2) {
          req.flash('badsetmessage', req.t('pass_missmatch'));
        }
        else {
          req.flash('goodsetmessage', req.t('password_updated'));
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
        return res.status(404).send();
      }

      req.session.lang = req.user.lang;

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
              uname:    req.user.username,
              games:    active  .map(g=>ProfileController.info(g, req.t)),
              other:    other   .map(g=>ProfileController.info(g, req.t)),
              archived: archived.map(g=>ProfileController.info(g, req.t)),
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
