/**
 * uDown Bot for Slack!
 */
 var request = require('request');
 var underscore = require('underscore');
 var extend = underscore.extend;

/**
*  Get all of the users for a given string of text
*/
function getUsersFromMessage(text) {
    var stringList = text.split(" ");
    var returnArray = [];
    stringList.forEach(function(string){
        if(string.substring(0,2) == "<@"){
            var user = string.substring(2,11);
            returnArray.push(user);
        }
    });

    return returnArray;
};

function getUserFromAdminToken(token,user,callback) { 
    var options = { method: 'GET',
      url: 'https://slack.com/api/users.info',
      qs: 
       { token: token,
         user: user,
         pretty: '1' 
       },
      json: true };

    request(options, function (error, response, body) {
      if (error){
        callback(error);
      }else{
        callback(null, body.user);
      }
    });
};


function getTeamToken(teamID, callback){
    controller.storage.teams.get(teamID, function(err, team) {
        if(err){
            callback(err);
        }else{
            callback(null, team.token);
        }
    });
};

function getEventById(eventId, callback){
    console.log("Getting an event with id "+eventId);
    controller.storage.events.get(eventId, function(err, event) {
        if(err){
            callback(err);
        }else{
            callback(null, event);
        }
    });
}

function createEvent(event, callback){
    console.log("Creating an event");
    controller.storage.events.save(event,function(err, id){
        console.log('event stored in the database');	
    	if(err){
	    callback(err);
	} else {
	    callback(null, event);
	}
    });
}


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    var uDownBotKitStorge = require('./lib/db/index.js');
 
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
    config.storage = extend({},config.storage,uDownBotKitStorge({ mongoUri: process.env.MONGOLAB_URI }));
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */
//Treat this as an app
var app = require('./lib/apps');
var port = process.env.PORT || 8765; 
var controller = app.configure(port, "23350178224.23361502390", "19938eaef76e57dd971551eb6d32822c", config, onInstallation);


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});


controller.hears(['.$'], 'direct_message', function (bot, message) {
    console.log("TEXT FROM MESSAGE", message);
    var usersFromMessage  = getUsersFromMessage(message.text);

    console.log(message.user);

    getEventById("test", function(error, event){
	console.log(error);
	console.log(event);
    });

    //Get the team token
    getTeamToken(message.team, function(err, token){
        if(err) bot.reply(message, 'Sorry, im having an error!');
        //Get the user object
        getUserFromAdminToken(token, message.user, function(err,user){
            if(err) bot.reply(message, 'Sorry, im having an error!');
            //Save the user
            controller.storage.users.save(user,function(err, id) {
                console.log('user stored in the database');

                usersFromMessage.forEach(function(userFromTest){

                    //Make sure we get the team of this user so we can get the user name and pictures to create the event

                    bot.startPrivateConversation({user: userFromTest}, function(response, convo){
                      convo.say(user.name + " wants to get lunch with you breh! To check the status of this event click this link broski. " + "http://u-down.herokuapp.com/");
                    });
                });

                bot.reply(message, 'I have notified your users about the event');
            }); 
        });
    });



    // controller.storage.users.get(message.user,function(err, user) {
    //     if(!user){
    //         console.log(err);
    //         controller.storage.users.save(message.user,function(err, id) {
    //             console.log('user stored in the database');
    //         });
    //     }else{
    //         console.log("GOT USER!", user);

    //         usersFromMessage.forEach(function(userFromTest){

    //             //Make sure we get the team of this user so we can get the user name and pictures to create the event

    //             bot.startPrivateConversation({user: userFromTest}, function(response, convo){
    //               convo.say(user.user + " wants to get lunch with you breh! To check the status of this event click this link broski. " + "http://u-down.herokuapp.com/");
    //             });
    //         });

    //         bot.reply(message, 'I have notified your users about the event');
    //     }
    // });


});


controller.hears(['.$'], 'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, 'U Down Breh!');
    // persist new users to database
    controller.storage.users.get(message.user,function(err, user) {
	    if (!user) {
		user = {
		   id: message.user,
	    	};
	    	controller.storage.users.save(user,function(err, id) {
	    	    console.log('user stored in the database');
	    	});
	    }
    });
});
