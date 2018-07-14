var passport = require('passport');
var Game     = require('../models/Game.js');
var User     = require('../models/User.js');
var Shuffle  = require('shuffle');
var fs       = require('fs');

var deck_dir = '/decks';

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

var GameController = {
  create_get: function(req, res) {
    fs.readdir('public'+deck_dir, function(err, decks) {
      // decks = decks.map(name => deck_dir+name);
      res.render('create', {
        errmessage: req.flash('game'),
        decks:      decks,
      });
    });
  },

  create_post: function(req, res) {
    let deadline = new Date();
    deadline.setDate(deadline.getDate() + req.body.dur);
    deadline.setSeconds(0);
    deadline.setMinutes(0);
    deadline.setUTCHours(0);

    User.findOne({username: req.user.username}, function(err, user) {
      if(err) {
        console.log('create - find user '+err);
        res.redirect('#error-user');
        return;
      }
      Game.create({
        name:        req.body.name,
        users:       [user],
        max_players:  req.body.max,
        duration:     req.body.dur,
        deadline:     deadline,
        card_dirs:    req.body.decks,
        used_cards:   [],
        captionIds:   {},
        captions:     {},
        hands:        {},
      }, function(err, game) {
        if(err) {
          console.log('create - create game '+err);
          res.redirect('#error-game');
          return;
        }
        user.save(err => {if (err) console.log('join save fail: '+err)});
        res.redirect('/game/'+game.code);
      });
    });
  },

  join: function(req, res) {
    let code = req.params.id.toLowerCase();
    User.findOne({username:req.user.username},
    function(err, user) {
      if(err) {console.log('could not find user: '+err);}
      Game.findOne({code: code}, ['users', 'max_players', 'stage', 'name'])
          .populate('users', 'username')
          .exec(function(err, game) {
        if(err) {console.log('find game by id: '+err);}
        if(!game) {
          req.flash('game', 'Game does not exist');
          res.redirect('/create')
          return;
        }
        if(game.stage != 'join') {
          console.log(game);
          res.redirect('/game/'+code);
          return;
        }

        let users = game.users.map(u => u.username);

        if (!users.includes(user.username)
            && (users.length < game.max_players || game.max_players === 0)) {
          game.users.push(user);

          game.save(function(err) {
            if (err) console.log('leave save fail: '+err);
            user.save(function(err) {
              if (err) console.log('join save fail: '+err);
              res.redirect('/game/'+code);
            });
          });
        }
        else {
          res.redirect('/game/'+code);
        }
      });
    });
  },

  leave: function(req, res) {
    let code = req.params.id.toLowerCase();
    User.findOne({username:req.user.username},
    function(err, user) {
      if(err) {console.log('could not find user: '+err);}

      Game.findOne({code: code}, ['users', 'stage'])
          .populate('users', 'username')
          .exec(function(err, game) {
        if(err) {console.log('find game by id: '+err);}
        if(!game) {
          req.flash('game', 'Game does not exist');
          res.redirect('/create')
          return;
        }
        if(game.stage != 'join') {
          res.redirect('/game/'+code);
          return;
        }

        let users = game.users.map(u => u.username);

        if (users.includes(user.username)) {
          game.users.pull(user._id);

          game.save(function(err) {
            if (err) console.log('leave save fail: '+err);
            user.save(function(err) {
              if (err) console.log('join save fail: '+err);
              res.redirect('/game/'+code);
            });
          });
        }
        else {
          res.redirect('/game/'+code);
        }
      });
    });
  },

  caption: function(req, res) {
    let uname = req.user.username;
    let code  = req.params.id.toLowerCase();
    Game.findOne({code: code},
    function(err, game) {
      if(err) {console.log('find game by id: '+err);}
      if(!game) {
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      if(game.stage != 'capt') {
        res.redirect('/game/'+code);
        return;
      }

      game.captions.set(uname, {
        image:  req.body.cardpicker,
        quote:  req.body.quote,
        votes:  {},
        pcards: {},
      });
      game.captionIds.set(game.captions.get(uname).code, uname);

      game.save(function(err) {
        if (err) console.log('caption save fail: '+err);
        res.redirect('/game/'+code);
      });
    });
  },

  guess: function(req, res) {
    let code  = req.params.id.toLowerCase();
    let uname = req.user.username;
    Game.findOne({code: code},
    function(err, game) {
      if(err) {console.log('find game by id: '+err);}
      if(!game) {
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      if(game.stage != 'choice') {
        res.redirect('/game/'+code);
        return;
      }

      for(let key in req.body) {
        let id    = key.split('_')[1];
        let cname = game.captionIds.get(id); // captioner's name
        game.captions.get(cname).pcards.set(uname, req.body[key]);
      }

      game.save(function(err) {
        if (err) console.log('caption guess save fail: '+err);
        res.redirect('/game/'+code);
      });
    });
  },

  vote: function(req, res) {
    let uname = req.user.username;
    let code  = req.params.id.toLowerCase();
    Game.findOne({code: code},
    function(err, game) {
      if(err) {console.log('find game by id: '+err);}
      if(!game) {
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      if(game.stage != 'vote') {
        res.redirect('/game/'+code);
        return;
      }

      for(let key in req.body) {
        let id    = key.split('_')[1];
        let cname = game.captionIds.get(id); // captioner's name
        game.captions.get(cname).votes.set(uname, req.body[key]);
      }

      game.save(function(err) {
        if (err) console.log('vote save fail: '+err);
        res.redirect('/game/'+code);
      });
    });
  },

  buildDeck: function(game) {
    let cards = [];
    for(const dir of game.card_dirs) {
      for(let f of fs.readdirSync('public/'+deck_dir+'/'+dir)) {
        f = deck_dir+'/'+dir+'/'+f;
        if(!game.used_cards.includes(f)) {
          cards.push(f);
        }
      }
    }
    return Shuffle.shuffle({deck: cards});
  },

  updateDeadline_post: function(req, res) {
    let uname = req.user.username;
    let code  = req.params.id.toLowerCase();
    Game.findOne({code: code})
        .populate('users', ['name', 'username'])
        .exec(function(err, game) {
      if(err) {console.log('find game by id: '+err);}
      if(!game) {
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      if(game.users[0].username !== uname) {
        res.redirect('/game/'+code);
        return;
      }
      GameController.updateDeadline(game, true, function() {
        res.redirect('/game/'+code);
      });
    });
  },

  updateDeadline: function(game, save, next) {
    game.deadline = new Date();
    game.deadline.setDate(game.deadline.getDate() + game.duration);
    game.deadline.setSeconds(0);
    game.deadline.setMinutes(0);
    game.deadline.setUTCHours(0);

    if (save) {
      game.save(function(err) {
        if (err) console.log('next save fail: '+err);
        if (typeof next === 'function') {
          return next();
        }
      });
    }
    else if (typeof next === 'function') {
      return next();
    }
  },

  next: function(req, res) {
    let code    = req.params.id.toLowerCase();
    let uname   = req.user.username;
    Game.findOne({code: code})
        .populate('users', ['name', 'username'])
        .exec(function(err, game) {
      if(err) {console.log('find game by id: '+err);}
      if(!game) {
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      if(game.users[0].username !== uname) {
        res.redirect('/game/'+code);
        return;
      }
      if(game.stage === 'join') {
        let players = req.body.players;
        players.push(uname);
        players = game.users.filter(u=>players.includes(u.username));
        if (players.length < 3) {
          res.redirect('/game/'+code);
          return;
        }
        game.users = players;
      }
      GameController.nextStage(game, res.redirect('/game/'+code));
    });
  },

  nextStage: function(game, next) {
    // cards to replenish hand
    let deck = GameController.buildDeck(game);
    let used = game.used_cards;

    switch(game.stage) {
      case 'join':
        let hand_size = game.users.length+1;
        if(hand_size < 4) { // not enough users
          break;
        }
        game.stage = 'capt';
        let hands = game.users.reduce((o,u) => {
          let hand = deck.draw(hand_size);
          o[u.username] = hand;
          used = used.concat(hand);
          return o;
        }, {});
        game.hands = hands;
        game.used_cards = used;
        break;
      case 'capt':
        game.stage = 'choice';
        // remove used card from hand
        /* // Don't take out used card
        for(let entry of game.captions.entries()) {
          let uname = entry[0];
          let iCard = game.hands.get(uname).indexOf(entry[1].image);
          if(iCard != -1) {
            // remove old, add new
            let card = deck.draw();
            game.hands.get(uname).splice(iCard, 1, card);
            used.push(card); // remember card drawn
          }

        }
        // remember used cards
        game.used_cards = used;
        */
        break;
      case 'choice':
        game.stage = 'vote';
        // TODO maybe don't?

        // remove used cards from hand
        for(let entry of game.captions.values()) {
          for(let uname of entry.pcards.keys()) {
            iCard = game.hands.get(uname).indexOf(entry.pcards.get(uname));
            if(iCard != -1) {
              // remove old, add new
              let card = deck.draw();
              game.hands.get(uname).splice(iCard, 1, card);
              used.push(card); // remember card drawn
            }
          }
        }
        // remember used cards
        game.used_cards = used;
        break;
      case 'vote':
      case 'end':
        game.stage = 'end';
        break;
    }

    return GameController.updateDeadline(game, true, next);
  },

  game: function(req, res) {
    let code = req.params.id.toLowerCase();
    let uname = req.user.username;
    Game.findOne({code: code})
        .populate('users', ['name', 'username'])
        .exec(function(err, game) {
      if(err || !game) {
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      let captions = [];
      let selected = {};
      let edit = 'edit' in req.query;

      switch(game.stage) {
        case 'join':
          res.render('setup', {
            gamename:   game.name,
            username:   uname,
            players:    game.users,
            enddate:    game.deadline,
            maxplayers: game.max_players,
            gameid:     code,
          });
          break;
        case 'capt':
          let cap = game.captions.get(uname);
          if(!cap || edit) {
            res.render('choose', {
              gamename: game.name,
              cards:    game.hands.get(uname) || [],
              code:     code,
              root:     deck_dir.replace(/\/?public\/?/, '/'),
              enddate:  game.deadline,
              selected: (cap || new Map()).get('image'),
              caption:  (cap || new Map()).get('quote'),
            });
          }
          else {
            res.render('waiting', {
              gamename: game.name,
              uname:    uname,
              gameid:   code,
              enddate:  game.deadline,
              players:  game.users.map(u => {return {
                name:  u.name,
                uname: u.username,
                stat:  game.captions.get(u.username)
                       ? 'Done'
                       : 'Waiting',
              };}),
            });
          }
          break;
        case 'choice':
          game.captions.forEach((value, key) => {
            captions.push({
              uname:    key,
              selected: value.pcards.get(uname) || "",
              quote:    value.quote,
              id:       value.code,
            });
            for(let u of value.pcards.keys()) {
              if(u in selected) ++selected[u];
              else                selected[u] = 1;
            }
          });
          if((selected[uname]||0) == game.users.length-1 && !edit) {
            res.render('waiting', {
              gamename: game.name,
              uname:    uname,
              gameid:   code,
              enddate:  game.deadline,
              players:  game.users.map(u => {return {
                name:  u.name,
                uname: u.username,
                stat:  (selected[u.username]||0) == game.users.length-1
                       ? 'Done'
                       : 'Waiting',
              };}),
            });
          }
          else {
            res.render('guess', {
              gamename: game.name,
              title:    'Choose Cards',
              action:   '/guess/'+code,
              quotes:   shuffle(captions),
              cards:    game.hands.get(uname),
              uname:    uname,
            });
          }
          break;
        case 'vote':
          game.captions.forEach((value, key) => {
            let cards = [value.image];
            for(let entry of value.pcards.entries()) {
              if(uname !== entry[0]) {
                cards.push(entry[1]);
              }
            }
            captions.push({
              uname:    key,
              selected: value.votes.get(uname) || "",
              cards:    shuffle(cards),
              quote:    value.quote,
              id:       value.code,
            });
            for(let u of value.votes.keys()) {
              if(u in selected) ++selected[u];
              else                selected[u] = 1;
            }
          });
          if((selected[uname]||0) == game.users.length-1&& !edit) {
            res.render('waiting', {
              gamename: game.name,
              uname:    uname,
              gameid:   code,
              enddate:  game.deadline,
              players:  game.users.map(u => {return {
                name:  u.name,
                uname: u.username,
                stat:  (selected[u.username]||0) == game.users.length-1
                       ? 'Done'
                       : 'Waiting',
              };}),
            });
          }
          else {
            res.render('guess', {
              gamename: game.name,
              title:   'Voting',
              action:  '/vote/'+code,
              quotes:  shuffle(captions),
              uname:   uname,
            });
          }
          break;
        case 'end':
          game.captions.forEach((value, key) => {
            let cname = game.users.find(u=>u.username === key).name;
            let cards = [];
            let votes = {};
            for(let entry of value.pcards.entries()) {
              let name = game.users.find(u=>u.username === entry[0]).name;
              cards.push({card:entry[1],cname:name});
            }
            for(let card of value.votes.values()) {
              if(card in votes) ++votes[card];
              else                votes[card] = 1;
            }
            captions.push({
              cname: cname,
              quote: value.quote,
              image: value.image,
              votes: votes,
              cards: cards,
            });
          });
          res.render('results', {gamename: game.name, captions: captions});
          break;
      }
    });
  },
};

exports = module.exports = GameController;
