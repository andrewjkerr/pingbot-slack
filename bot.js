/*

    testbot. whoa.
    now with 100% more Tumblrn magic.

*/

// coffeescript is needed for the slack-client lib
var CoffeeScript = require('coffee-script');

// the offical slack client lib
var slack_client = require('slack-client');

// check for a config file when calling this script, we need it
if (process.argv.length < 3 || process.argv[2] == undefined) {
  console.log('testbot requires a config file passed to it, please see README.');
  process.exit(1);
}

// load bot config
console.log('requiring config in file: ' + process.argv[2]);
var file_name = process.argv[2];
if (file_name.lastIndexOf('/', 0)  === 0) {
  var config_file = file_name;
} else {
  var config_file = './' + process.argv[2];
}

var config = require(config_file);

// primary bot config
var bot_name = config.bot_name;
var bot_trigger = config.bot_trigger;
var teams = config.teams;

// init new instance of the slack real time client
var slack = new slack_client(config.api_token);

slack.on('open', function() {
  console.log(bot_name + ' is online, listening for ' + bot_trigger + ' ...');
  connected = true;
});

slack.on('message', function(message) {

  if (message.type == 'message') {
    // if there is no user, then it's probably not something we need to worry about
    if (message.user == undefined) {
      return;
    }

    // send the incoming message off to be parsed + responded to
    handle_message(message);
  } else {
    return; // do nothing with other types of messages for now
  }
});

// add a trim() method for strings
String.prototype.trim = function() { return this.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); };

// get a random integer between range
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// send a message to the specified channel/group/whatever
// "where" needs to be a channel/group/dm object
function say(with_what, where) {
  // first send typing indicator
  where.sendMessage({"type": "typing"});

  // ok now send the actual message in a little while
  // this fuzziness makes the bot seem almost human
  setTimeout(function() {
    where.sendMessage({'type': 'message', 'text': with_what, 'link_names': 1, 'parse': 'full'});
  }, getRandomInt(500, 1200));
}

function strip_trigger(text) {
  return strip_text(text, bot_trigger);
}

function strip_text(text, to_strip) {
  return text.replace(to_strip + ' ', '');
}

// handle an incoming message object
function handle_message(message_obj) {
  var chatline = message_obj.text.trim();

  if (chatline.lastIndexOf(bot_trigger, 0)  === 0) {
    // where did this message come from??
    var where = slack.getChannelGroupOrDMByID(message_obj.channel);
    process_team_message(strip_trigger(chatline), where);
  }

}

function process_team_message(team, where) {
  // Add member
  if (team.lastIndexOf('add', 0) === 0) {
    // Team has the full text
    process_member_add(team, where);
  } else {
    ping_team(team, where);
  }
}

function ping_team(team, where) {
  if (team in teams) {
    members = teams[team];

    // hacky way to add an @ to every member
    say('Hey @' + members.join(', @') + '!!', where);
  } else {
    say('Whoops, that team doesn\'t exist!', where);
  }
}

function process_member_add(text, where) {
  text = strip_text(text, 'add');
  text_arr = text.split(' ');
  team = text_arr[0];

  if (team in teams) {
    member = text_arr[1];
    add_member(team, member, where);
  } else {
    say ('Hey, that team doesn\'t exist!', where);
  }
}

function add_member(team, member, where) {
  user = slack.getUserByName(text_arr[1]);

  if (user) {
    teams[team].push(member);
    say(member + ' was successfully added to ' + team + '!', where);
  } else {
    say('That user doesn\'t exist!', where);
  }
}

// actually log in and connect!
slack.login();
