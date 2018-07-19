var mongoose   = require('mongoose');
var Hashids    = require('hashids');
var userSchema = require('./User.js').prototype.schema;
var NumberInt  = mongoose.mongo.NumberInt;

var hashids8 = new Hashids('secret seed', 8, 'abcdefghijklmnopqrstuvwxyz');
var randId8  = () => hashids8.encode(Date.now()%410338672);
var hashidsF = new Hashids('secret seed',15, 'abcdefghijklmnopqrstuvwxyz');
var randIdF  = () => hashidsF.encode(Date.now()%168377826559400860);

var captionSchema = new mongoose.Schema({
  image:    String,
  quote:    String,
  explain:  String,
  code: {
    type:      String,
    required:  true,
    lowercase: true,
    default:   randIdF,
    unique:    true
  },
  lookup: { // card -> username
    type: Map,
    of:   String,
  },
  pcards: { // player -> their card
    type: Map,
    of:   String,
  },
  votes: { // voter -> image name
    type: Map,
    of:   String,
  },
  scores: { // username -> round score (int)
    type: Map,
    of:   NumberInt,
  },
});

let stages = ['join', 'capt', 'choice', 'vote', 'end'];

var gameSchema = new mongoose.Schema({
  name:        String,
  users:      [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  code: {
    type:      String,
    required:  true,
    lowercase: true,
    default:   randId8,
    unique:    true
  },
  max_players: {type:Number, min:0},
  extra_cards: {type:Number, min:0, default: 1},
  stage:       {type:String, enum:stages, default:'join'},
  scoring:     {type:String, enum:['orig','v2','rus'], default:'orig'},
  duration:    {type:Number, min:1, max:14},
  deadline:    Date,
  card_dirs:  [String],
  captionIds: { // caption._id -> username
    type: Map,
    of:   String,
  },
  captions: { // username -> {image, }
    type: Map,
    of:   captionSchema,
  },
  hands: { // username -> array of cards
    type: Map,
    of:  [String],
  },
  scores: { // username -> total score (int)
    type: Map,
    of:   NumberInt,
  },
});

exports = module.exports = mongoose.model('Game', gameSchema);
