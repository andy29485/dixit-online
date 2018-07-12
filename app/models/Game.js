var mongoose   = require('mongoose');
var Hashids    = require('hashids');
var userSchema = require('./User.js').prototype.schema;

var hashids8 = new Hashids('secret seed', 8, 'abcdefghijklmnopqrstuvwxyz');
var randId8  = () => hashids8.encode(Date.now()%410338672);
var hashidsF = new Hashids('secret seed',15, 'abcdefghijklmnopqrstuvwxyz');
var randIdF  = () => hashidsF.encode(Date.now()%168377826559400860);

var captionSchema = new mongoose.Schema({
  image:    String,
  quote:    String,
  code: {
    type:      String,
    required:  true,
    lowercase: true,
    default:   randIdF,
    unique:    true
  },
  pcards: { // player -> their card
    type: Map,
    of:   String,
  },
  votes: { // voter -> image name
    type: Map,
    of:   String,
  },
});

let stages = ['join', 'capt', 'choice', 'vote', 'end'];

var gameSchema = new mongoose.Schema({
  users:      [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  code: {
    type:      String,
    required:  true,
    lowercase: true,
    default:   randId8,
    unique:    true
  },
  max_players: {type:Number, min:0},
  stage:       {type:String, enum:stages, default:'join'},
  duration:    {type:Number, min:1, max:14},
  deadline:    Date,
  card_dirs:  [String],
  used_cards: [String],
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
  }
});

exports = module.exports = mongoose.model('Game', gameSchema);
