var passport = require('passport');
var Game     = require('../models/Game.js');
var User     = require('../models/User.js');
var Email    = require('../models/Email.js');
var Shuffle  = require('shuffle');
var crypto   = require('crypto');
var fs       = require('fs');

var deck_dir = '/decks';
var auto_transition = 15;

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

function hash(obj) {
  let c = crypto.createHash('md5');
  c.update(obj);
  return c.digest('hex');
}

function sortCards(array, extra) {
  array = [... array];

  array.sort((a,b) => {
    a = JSON.stringify(a.uname||a) + extra;
    b = JSON.stringify(b.uname||b) + extra;
    return hash(a) > hash(b);
  });

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
    deadline.setDate(deadline.getDate() + Number(req.body.dur)||2);
    deadline.setSeconds(0);
    deadline.setMinutes(0);
    deadline.setUTCHours(0);

    User.findOne({username: req.user.username}, function(err, user) {
      if(err) {
        console.log('create - find user '+err);
        res.redirect('#error-user');
        return;
      }
      res.cookie('lang', req.user.lang = user.lang);

      Game.create({
        name:        req.body.name,
        users:       [user],
        max_players:  req.body.max,
        extra_cards:  req.body.extra,
        scoring:      req.body.scoring,
        duration:     req.body.dur,
        deadline:     deadline,
        card_dirs:    req.body.decks,
        captionIds:   {},
        captions:     {},
        hands:        {},
        scores:       {},
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
      res.cookie('lang', req.user.lang = user.lang);

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
      res.cookie('lang', req.user.lang = user.lang);

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
      if(!game||err) {
        if(err) console.log('find game by id: '+err);
        req.flash('game', 'Game does not exist');
        res.redirect('/create')
        return;
      }
      if(game.stage != 'capt') {
        res.redirect('/game/'+code);
        return;
      }

      game.captions.set(uname, {
        image:   req.body.cardpicker,
        quote:   req.body.quote,
        explain: req.body.explain,
        lookup:  {},
        votes:   {},
        pcards:  {},
        scores:  {},
      });
      game.captions.get(uname).set(req.body.cardpicker, uname)
      game.captionIds.set(game.captions.get(uname).code, uname);

      if(!game.done_users) {
        game.done_users = [uname]
      }
      else if(!game.done_users.includes(uname)) {
        game.done_users.push(uname);
      }
      if(game.done = (game.captions.size === game.users.length)) {
        game.deadline = new Date();
        game.deadline.setMinutes(game.deadline.getMinutes() + auto_transition);
      }

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
        let id      = key.split('_')[1];
        let cname   = game.captionIds.get(id); // captioner's name
        let caption = game.captions.get(cname);
        caption.pcards.set(uname, req.body[key]);
        caption.lookup.set(req.body[key].replace(/\./g,'_'), uname);
      }

      let done = [];
      for(let [u,c] of game.captions.entries()) {
        done.push(u===uname || c.pcards.has(uname))
      }
      if (done.length>0 && done.every(x=>x)) {
        if(!game.done_users) {
          game.done_users = [uname]
        }
        else if(!game.done_users.includes(uname)) {
          game.done_users.push(uname);
        }
        if(game.done = (game.captions.size === game.users.length)) {
          game.deadline = new Date();
          game.deadline.setMinutes(game.deadline.getMinutes()+auto_transition);
        }
      }
      else {
        req.flash('messages', 'choices_saved');
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

      let done = [];
      game.captions.forEach(c => {
        done.push(c.votes.has(uname))
      });
      if (done.length>0 && done.every(x=>x)) {
        if(!game.done_users) {
          game.done_users = [uname]
        }
        else if(!game.done_users.includes(uname)) {
          game.done_users.push(uname);
        }
        if(game.done = (game.captions.size === game.users.length)) {
          game.deadline = new Date();
          game.deadline.setMinutes(game.deadline.getMinutes() + auto_transition);
        }
      }
      else {
        req.flash('messages', 'choices_saved');
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
        cards.push(f);
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
    if(game.stage !== 'end') {
      game.deadline = new Date();
      game.deadline.setDate(game.deadline.getDate() + game.duration);
      game.deadline.setSeconds(0);
      game.deadline.setMinutes(0);
      game.deadline.setUTCHours(0);
    }

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

  sendMail: function(game, t) {
    let usergroups = {};
    for(let user of game.users) {
      if(!usergroups[user.lang]) {
        usergroups[user.lang] = [user];
      }
      else {
        usergroups[user.lang].push(user);
      }
    }

    for(let lang of Object.keys(usergroups)) {
      Email(usergroups[lang], {
        lang: lang,
        game: game,
        t:    t,
      });
    }
  },

  genResults: function(game) {
    let captions = [];
    let hands    = [];
    let scores   = [];
    game.captions.forEach((caption, key) => {
      let cname = game.users.find(u=>u.username === key).name;
      let cards = [];
      let votes = {};
      let score = {};

      caption.votes.forEach((card, key) => {
        let cname = game.users.find(u=>u.username === key).name;
        if(card in votes) votes[card].push(cname);
        else              votes[card] = [cname];
      });
      for(let entry of caption.scores.entries()) {
        score[entry[0]] = entry[1];
      }

      cards.push({
        card:  caption.image,
        uname: key,
        cname: cname,
        votes: votes[caption.image],
        quote: caption.quote,
        expl:  caption.explain,
        score: score[key],
      });

      for(let entry of caption.pcards.entries()) {
        let name = game.users.find(u=>u.username === entry[0]).name;
        let vote = caption.lookup.get(
          caption.votes.get(entry[0]).replace(/\./g,'_')
        );
        if(vote) {
          vote = {
            card: caption.pcards.get(vote),
            cname: game.users.find(u=>u.username === vote).name,
            dealer: vote === entry[0],
          }
        }
        else {
          vote = {cname: cname, card: caption.image, dealer:true}
        }
        cards.push({
          card:  entry[1],
          uname: entry[0],
          cname: name,
          vote:  vote,
          votes: votes[entry[1]],
          score: score[entry[0]],
        });
      }
      captions.push({
        uname:   key,
        cname:   cname,
        quote:   caption.quote,
        explain: caption.explain,
        cards:   cards,
      });
    });
    game.hands.forEach((hand, key) => {
      hands.push({
        cname: game.users.find(u=>u.username === key).name,
        uname: key,
        cards: hand,
      });
    });
    for(let user of game.users) {
      scores.push({
        cname: user.name,
        uname: user.username,
        score: game.scores.get(user.username),
      });
    }
    game.results = {
      captions: captions,
      hands:    hands,
      scores:   scores,
    };
  },

  next: function(req, res) {
    let code    = req.params.id.toLowerCase();
    let uname   = req.user.username;
    Game.findOne({code: code})
        .populate('users', ['name', 'username', 'email', 'lang'])
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

      let deck = GameController.buildDeck(game);

      if(game.stage === 'join') {
        let players = req.body.players;
        players.push(uname);
        players = game.users.filter(u=>players.includes(u.username));
        if (players.length < 3) {
          req.flash('starterr', req.t('lacking_players'));
          res.redirect('/game/'+code);
          return;
        }
        // cards_needed = players.length*(players.length+game.extra_cards)
        // max_players = floor((sqrt(4*deck.length+game.extra_cards)-1)/2)
        if (players.length*(players.length+game.extra_cards) > deck.length) {
          req.flash('starterr', req.t('too_many_players'));
          res.redirect('/game/'+code);
          return;
        }
        game.users = players;
      }
      GameController.nextStage(game, req.t, deck, res.redirect('/game/'+code));
    });
  },

  nextStage: function(game, t, deck, next) {
    // if game is not done, don't move on
    if(game.stage !== 'join' && !game.done) {
      if (typeof next === 'function') {
        return next();
      }
      return;
    }

    // cards to replenish hand
    if(!deck) {
      deck = GameController.buildDeck(game);
    }

    switch(game.stage) {
      case 'join':
        let hand_size = game.users.length+game.extra_cards;
        if(hand_size < 4) { // not enough users
          break;
        }
        game.stage = 'capt';
        let hands = game.users.reduce((o,u) => {
          let hand = deck.draw(hand_size);
          o[u.username] = hand;
          return o;
        }, {});
        game.hands = hands;
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
        // maybe don't?

        /* yep, don't
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
        */
        break;
      case 'vote':
        let totalscores = {}; // user -> total score(int)

        for(let entry of game.captions.entries()) {
          let uname   = entry[0];
          let caption = entry[1];
          let votes   = new Object(); // card -> num votes
          let scores  = new Object(); // user -> round score(int)

          for(let vote of caption.votes.values()) {
            votes[vote] = (votes[vote]|0) + 1;
          }

          if( (votes[caption.image] === game.users.length-1)
            ||((votes[caption.image]||0) === 0)) {
            // every one voted for dealer OR no one did
            scores[uname] = 0;
            for(let user of caption.pcards.keys()) {
              scores[user] = 2;
              if(game.scoring !== 'rus') {
                scores[user] += (votes[caption.pcards.get(user)]|0);
              }
            }
          } else {
            scores[uname] = 3;
            for(let user of caption.pcards.keys()) {
              let bonus = votes[caption.pcards.get(user)]|0;
              if(caption.votes.get(user) === caption.image) {
                let truncate = ((game.scoring === 'rus') && (bonus > 3));
                scores[user] = 3 + (truncate ? 3 : bonus);
              } else if(game.scoring === 'v2') {
                scores[user] = (scores[user]|0) + bonus;
              }
            }
          }
          for(user in scores) {
            totalscores[user] = (totalscores[user]|0) + scores[user];
          }
          console.log(votes, scores);
          caption.scores = scores;
          console.log(caption.scores);
        }
        console.log(game.captions);
        game.scores = totalscores;
        game.stage = 'end';
        GameController.genResults(game);
        break;
      case 'end':
        return;
    }

    game.done_users = [];
    game.done = false;
    GameController.sendMail(game, t);
    return GameController.updateDeadline(game, true, next);
  },

  advance: function(t) {
    Game.findOne({deadline: {$lt: new Date()}, done:true})
        .exec(function(err, games) {
      if(err || !games) {
        games = [];
      }
      else if(!Array.isArray(games)) {
        games = [games];
      }

      for(let game of games) {
        GameController.nextStage(game, t, null, null);
      }
    });
    setTimeout(function() {
        GameController.advance(t);
    }, 1800000); // once every 30 min (1800000 = 30*60*1000)
  },

  game: function(req, res) {
    let code = req.params.id.toLowerCase();
    let user = req.user;
    let uname = user.username;
    Game.findOne({code: code})
        .populate('users', ['name', 'username', 'email', 'lang'])
        .exec(function(err, game) {
      if(err || !game) {
        req.flash('game', res.t('game_not_exists'));
        res.redirect('/create');
        return;
      }
      if(!['join','end'].includes(game.stage) &&
         !game.users.map(u=>u.username).includes(uname)
      ) {
        req.flash('game', res.t('not_in_game'));
        res.redirect('/profile');
        return;
      }
      let done = [];
      game.captions.forEach(c => {
        if(game.stage === 'choice') {
          done.push(c.pcards.size === game.users.length-1)
        }
        else if(game.stage === 'vote') {
          done.push(c.votes.size === game.users.length-1)
        }
      });

      if(game.deadline < new Date() && game.done) {
        GameController.nextStage(game, req.t, null, null);
      }

      let captions = [];
      let selected = {};
      let hands  = [];
      let scores = [];
      let edit   = 'edit' in req.query;

      switch(game.stage) {
        case 'join':
          res.render('setup', {
            username:   uname,
            gamename:   game.name,
            players:    game.users,
            enddate:    game.deadline,
            maxplayers: game.max_players,
            starterr:   req.flash('starterr'),
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
              explain:  (cap || new Map()).get('explain'),
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
                stat:  !!game.captions.get(u.username),
              };}),
            });
          }
          break;
        case 'choice':
          game.captions.forEach((value, key) => {
            let cname = game.users.find(u=>u.username === key).name;
            if(uname !== key){
              captions.push({
                uname:    key,
                cname:    cname,
                selected: value.pcards.get(uname) || "",
                quote:    value.quote,
                id:       value.code,
              });
            }
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
                stat:  (selected[u.username]||0) === game.users.length-1,
              };}),
            });
          }
          else {
            res.render('guess', {
              gamename: game.name,
              help_msg: req.t('guess_help'),
              title:    req.t('stages.choice'),
              action:   '/guess/'+code,
              quotes:   sortCards(captions, game.name),
              messages: req.flash('messages'),
              enddate:  game.deadline,
              cards:    game.hands.get(uname),
              uname:    uname,
            });
          }
          break;
        case 'vote':
          let own_row = null;
          game.captions.forEach((value, key) => {
            let cards = [value.image];
            let cname = game.users.find(u=>u.username === key).name;
            let own_card = null;
            for(let entry of value.pcards.entries()) {
              if(uname === entry[0]) {
                own_card = entry[1];
              }
              else {
                cards.push(entry[1]);
              }
            }
            cards = sortCards(cards, game.name);
            if(own_card !== null) {
              cards.unshift(own_card);
            }
            let caption = {
              uname:    key,
              cname:    cname,
              selected: value.votes.get(uname) || "",
              cards:    cards,
              quote:    value.quote,
              id:       value.code,
            };
            if(caption.uname == uname) {
              own_row = caption;
            }
            else {
              captions.push(caption);
            }
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
                stat:  (selected[u.username]||0) === game.users.length-1,
              };}),
            });
          }
          else {
            captions = sortCards(captions, game.name);
            if(own_row !== null) {
              captions.unshift(own_row);
            }
            res.render('guess', {
              gamename:  game.name,
              help_msg:  req.t('vote_help'),
              title:     req.t('stages.vote'),
              action:    '/vote/'+code,
              enddate:   game.deadline,
              messages:  req.flash('messages'),
              quotes:    captions,
              uname:     uname,
              dis_first: true,
            });
          }
          break;
        case 'end':
          if(!game.results) {
            GameController.genResults(game);
            game.save(function(err) {
              if (err) console.log('results next save fail: '+err);
            });
          }
          res.render('results', {
            uname:    uname,
            gamename: game.name,
            captions: game.results.captions,
            hands:    game.results.hands,
            scores:   game.results.scores,
          });
          break;
      }
    });
  },
};

exports = module.exports = GameController;
