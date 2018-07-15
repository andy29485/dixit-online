#!/usr/bin/env node
var express      = require("express");
var passport     = require('passport');
var session      = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var User         = require('./app/models/User.js');
var auth         = require('./app/controllers/authController.js');
var game         = require('./app/controllers/gameController.js');
var profile      = require('./app/controllers/profileController.js');
var flash        = require('connect-flash');
var mongoose     = require('mongoose');
var MongoStore   = require('connect-mongo')(session);

var app = express();

mongoose.connect('mongodb://localhost/dixit', {autoIndex: false});

passport.use(User.localStrategy);
passport.serializeUser(User.serializeUser);
passport.deserializeUser(User.deserializeUser);

app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'secret tunnel of love',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
}));

app.use(flash());
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

var LoggedIn = require('connect-ensure-login').ensureLoggedIn;

app.disable('x-powered-by');
app.set('port', process.env.PORT || 3000);

app.get('/', function(req, res) {
  if(req.user) {
    res.redirect('/profile');
    return;
  }

  res.render('index', {
    regmessage:   req.flash('regerror'),
    loginmessage: req.flash('error'),
  });
});

app.post('/login',    auth.login);
app.post('/logout',   auth.logout_post);
app.post('/register', auth.register);
app.get( '/logout',   auth.logout_get);

app.get('/profile', LoggedIn('/'), profile.profile_get);

app.get('/search',        LoggedIn('/'), profile.search);
app.get('/search/:page',  LoggedIn('/'), profile.search);
app.get('/archive',       LoggedIn('/'), profile.archive);
app.get('/archive/:page', LoggedIn('/'), profile.archive);
app.get('/active',        LoggedIn('/'), profile.active);
app.get('/active/:page',  LoggedIn('/'), profile.active);

app.post('/create',      LoggedIn('/'), game.create_post);
app.get( '/create',      LoggedIn('/'), game.create_get);
app.get( '/game/:id',    LoggedIn('/'), game.game);
app.post('/extend/:id',  LoggedIn('/'), game.updateDeadline_post);
app.post('/next/:id',    LoggedIn('/'), game.next);
app.post('/join/:id',    LoggedIn('/'), game.join);
app.post('/leave/:id',   LoggedIn('/'), game.leave);
app.post('/caption/:id', LoggedIn('/'), game.caption);
app.post('/guess/:id',   LoggedIn('/'), game.guess);
app.post('/vote/:id',    LoggedIn('/'), game.vote);

app.listen(app.get('port'), function() {
  console.log('experss started: http://localhost:'+app.get('port'));
});
