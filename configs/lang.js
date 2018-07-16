exports = module.exports = {
  en: {
    title:        'Dixit Online',
    profile:      'Profile',
    logout:       'Logout',
    profile_head: "'s Profile",
    create_new:   'Create New Game',

    // Game Table Titles / misc
    active_games:   'Active Games',
    joinable_games: 'Joinable Games',
    archived_games: 'Archived Games',
    none_found:     'None Found',     // for empty table
    more_results:   'more results',   // in profile, when more than 5
    first_page:     'First',
    last_page:      'Last',
    no_limit:       'No Limit',       // Max players === 0
    admin_tag:      '(admin)',
    max_players:    'Max players',

    // Game Table Headers
    game_name:         'Game Name',
    stage:             'Stage',
    admin:             'Admin',
    players_and_limit: 'Players in Game / Limit',
    delete:            'Delete',

    // Game End Date Description
    end_date_join:     'Sign Up Before',      // joining
    end_date_join_alt: 'Registration Closes', // joining
    end_date_stage:    'Stage End Date',      // all others
    end_date_end:      'Game End Date',       // results

    // Buttons
    join_button:     'Join Game',
    leave_button:    'Leave Game',
    next_button:     'Next',
    edit_button:     'Edit',
    deadline_button: 'Extend Deadline',
    start_button:    'End Setup',
    submit_button:   'Submit',

    // Table Headers
    header_number:         '#',
    header_name:           'Name',
    header_status:         'Status',
    header_players_list:   'Players in Game',
    header_include_player: 'Include',

    // Joining / Waiting
    game_full:        'Player Limit Reached',
    game_full_long:   "Joining Deadline Reached, new users can't join game",
    deadline_reached: 'Deadline Reached, click to extend',
    lacking_players:  'Not Enough People',
    status_waiting:   'Waiting',
    status_done:      'Done',

    // Captioning form
    caption:     'Caption',
    explanation: 'Explanation',

    // Game Stages
    stages: {
      join:   'Joining',
      wait:   'Waiting',
      capt:   'Captioning',
      choice: 'Choosing Cards',
      vote:   'Voting',
      end:    'Ended',
    },
  },
  ru: {
    // TODO
  },
}

function debug(obj) {
  for(let key in obj) {
    switch(typeof obj[key]) {
      case 'object':
        debug(obj[key]);
        break;
      case 'string':
        obj[key] = '{' + obj[key] + '}'
        break;
      default:
        console.log(typeof obj[key]);
    }
  }
}

debug(exports);
