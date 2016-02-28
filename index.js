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

function makeid(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 12; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

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
            console.log("TEAM", team);
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

function sayYesToEvent(eventId, userId, callback){
    console.log("EVENTID", eventId);
    console.log("USERID", userId);
    controller.storage.events.get(eventId, function(err, event) {
        if(err){
            callback(err);
        }else{
            console.log("EVENT", event);
            event.invited.forEach(function(userInvited, key){
                console.log("USERRRRR", userInvited);
                if(userInvited == userId){
                    event.attending.push(userInvited);
                    createEvent(event, function(err,id){
                        if(err){
                            callback(err);
                        }else{
                            callback(null, id);
                        }
                    });
                }
            });
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
	    callback(null, id);
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
                convo.say("Hey! I'm a bot that likes to organize events");
                convo.say('Just shoot me a message and I can help you plan an event!');
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


// just a simple way to make sure we don't
// connect to the RTM twice for the same team
// var _bots = {};
// function trackBot(bot) {
//   _bots[bot.config.token] = bot;
// }

// controller.on('create_bot',function(bot,config) {

//   if (_bots[bot.config.token]) {
//     // already online! do nothing.
//   } else {
//     bot.startRTM(function(err) {

//       if (!err) {
//         trackBot(bot);
//       }

//       bot.startPrivateConversation({user: config.createdBy},function(err,convo) {
//         if (err) {
//           console.log(err);
//         } else {
//           convo.say('I am a bot that has just joined your team');
//           convo.say('You must now /invite me to a channel so that I can be of use!');
//         }
//       });

//     });
//   }

// });

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


//On inital open make sure we save the user if its the first time we are taking to them
controller.on('direct_message', function (bot, message) {
    console.log("MESSAGE", message);
    getTeamToken(message.team, function(err, token){
        if(err) bot.reply(message, 'Sorry, im having an error!');
        getUserFromAdminToken(token, message.user, function(err,user){
            //Always Update user
            controller.storage.users.save(user,function(err, id) {
                console.log("Saved User");
            }); 
        });
    });
});

    getEventById("test", function(error, event){
	console.log(error);
	console.log(event);
    });

var askIfTheyWantToMakeAnEvent = function(response, convo) {
    
    var bot = this.bot; 
    getTeamToken(convo.source_message.team, function(err, token){
        if(err) bot.reply(message, 'Sorry, im having an error!');
        //Get the user object
        getUserFromAdminToken(token, convo.source_message.user, function(err,user){
            if(err)bot.reply(message, 'Sorry, im having an error!');
            convo.ask('Hey! ' + user.name + " do you want me to organize an event?", function(response, convo) {
                if(["yes","yea","yup","yep","ya","sure","ok","y","yeah","yah"].indexOf(response.text.toLowerCase()) > -1){
                    askPlace(response, convo, bot, user.name);
                    convo.next();                   
                }else if(["no","nah","nope", "no"].indexOf(response.text.toLowerCase()) > -1){
                    convo.say('Okay for sure! Just holler if you want to!');
                    convo.next();
                }
                else{
                    convo.say('Sorry didnt get you! Lets Try Some other time.');
                    convo.next();
                }
            });
        });
    });
}

var tryAgain = function(response, convo) {
    askIfTheyWantToMakeAnEvent(response, convo);
    convo.next();
}

var askPlace = function(response, convo, bot, userName) {
  convo.ask('Where?', function(response, convo) {
    convo.say('Awesome')
    askWho(response, convo, bot, userName);
    convo.next();
  });
}

var askWho = function(response, convo, bot, userName) {
  convo.ask('Who Would You like to Invite?', function(response, convo) {
    var users = getUsersFromMessage(response.text);
    if(users.length > 0){
        convo.say('Cool')
        askWhen(response, convo, bot, userName);
        convo.next();
    }else{
        convo.say('Sorry didnt see any invites! Try Again');
        convo.next();
    }
  });
}

var askWhen = function(response, convo, bot, userName) {
  convo.ask('What time should I set this event to?', function(response, convo) {

    //Extract the responses
    var responses = convo.extractResponses();
    var place = responses['Where?'];
    var time = responses['What time should I set this event to?'];
    var who = getUsersFromMessage(responses['Who Would You like to Invite?']);
    var team = response.team;


    var event = {
        id: makeid(),
        name: place + "@" + time,
        location: place,
        time: time,
        attending:[response.user],
        invited: who,
        teamID: team
    };

    createEvent(event, function(err, id){
        console.log("ID", id);
        who.forEach(function(user){
            //Send 
            //Make sure we get the team of this user so we can get the user name and pictures to create the event
            // bot.startPrivateConversation({user: user}, function(response, convo){
            //   console.log("hit");
            //   convo.say(userName + " wants to go to " + place + " at " + time);
            //   convo.say("U Down?");
            //   convo.say("To Check the status of this go to http://u-down.herokuapp.com/" + id.id); 
            // });

              // start a conversation to handle this response.
              bot.startPrivateConversation({user: user},function(err,convo) {
                console.log("TEAMID", event.teamID);
                getTeamToken(event.teamID, function(err, token){
                    if(err) bot.reply(message, 'Sorry, im having an error!');
                    //Get the user object
                    getUserFromAdminToken(token, user, function(err,userObj){
                        if(err) bot.reply(message, 'Sorry, im having an error!');
                        //Save the user
                        console.log("USER", userObj);
                        controller.storage.users.save(userObj,function(err, id) {
                            console.log('user stored in the database', userObj.id);
                bot.utterances.yes = new RegExp(/^(yes|yea|yup|yep|ya|sure|ok|y|yeah|yah|down|i'm down|imdown|im down)/i);
                bot.utterances.no = new RegExp(/^(no|nah|nope|n|not down|notdown|naww|naw)/i);

                controller.storage.users.get(userObj.id,function(err, userNameId) {
                    if(err){
                        console.log("ERR", err)
                    }else{
                        console.log(userNameId);
                        convo.say("Hey " + userNameId.name + "! " + userName + " wants to go to " + place + " at " + time);
                        convo.say("To Check the status of this go to http://u-down.herokuapp.com/id/" + event.id);
                        convo.ask("U Down? ",[
                          {
                            pattern: 'done',
                            callback: function(response,convo) {
                              convo.say('OK you are done!');
                              convo.next();
                            }
                          },
                          {
                            pattern: bot.utterances.yes,
                            callback: function(response,convo) {
                              sayYesToEvent(event.id, response.user, function(err, response){
                                    if(err){
                                        convo.say('Sorry! I had an error updating the event!');
                                        convo.next();
                                    }else{
                                        convo.say('Great! I will put you down as going!');
                                        convo.next();
                                    }
                              });
                            }
                          },
                          {
                            pattern: bot.utterances.no,
                            callback: function(response,convo) {
                              convo.say('No Problem, I will put you down as a no.');
                              convo.next();
                            }
                          },
                          {
                            default: true,
                            callback: function(response,convo) {
                              // just repeat the question
                              convo.repeat();
                              convo.next();
                            }
                          }
                        ]);
                    }
                });

                        }); 
                    });
                });
              });
        });

        convo.say('Sweet I have sent the event!');
        convo.say("To Check the status of this go to http://u-down.herokuapp.com/id/" + event.id); 
        convo.next();
    });
  });
}

// var askWhereDeliver = function(response, convo) {
//   convo.ask('So where do you want it delivered?', function(response, convo) {
//     convo.say('Ok! Good bye.');
//     convo.next();
//   });
// }

controller.hears(["^hey(.*)","^hello(.*)","^hi(.*)","^h(.*)"],['direct_message','direct_mention','mention','ambient'],function(bot,message) {

    this.bot = bot;
    bot.startConversation(message, askIfTheyWantToMakeAnEvent.bind(this));
    console.log(bot.utterances.no);
});

controller.hears(['.$'], 'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, 'Sorry didnt get you!');
    bot.startConversation(message, askIfTheyWantToMakeAnEvent.bind(this));
});

// controller.storage.teams.all(function(err,teams) {

//   if (err) {
//     throw new Error(err);
//   }

//   // connect all teams with bots up to slack!
//   for (var t  in teams) {
//     console.log("TEAM", teams[t]);
//     if (teams[t].bot) {
//       var bot = controller.spawn(teams[t]).startRTM(function(err) {
//         if (err) {
//           console.log('Error connecting bot to Slack:',err);
//         } else {
//           console.log("tracking");
//           trackBot(bot);
//         }
//       });
//     }
//   }

// });


// controller.hears(['dbdbhdhfs'], 'direct_message', function (bot, message) {
//     console.log("TEXT FROM MESSAGE", message);
//     var usersFromMessage  = getUsersFromMessage(message.text);



//     if(["y","yes","yea","yup"].indexOf(message.text.toLowerCase()) > -1){
//         bot.reply(message, "Ok just give me a place and time and a few of your friends!");
//     }
//     //Check to make sure there are some users in the event they want to create
//     else if(usersFromMessage.length == 0){
//         bot.reply(message, "Hey! I plan events, please give me a time a place and some people you want to invite and I can notify them about the event. Do you want to plan an event?");
//     }else{
        //Get the team token
    //     getTeamToken(message.team, function(err, token){
    //         if(err) bot.reply(message, 'Sorry, im having an error!');
    //         //Get the user object
    //         getUserFromAdminToken(token, message.user, function(err,user){
    //             if(err) bot.reply(message, 'Sorry, im having an error!');
    //             //Save the user
    //             controller.storage.users.save(user,function(err, id) {
    //                 console.log('user stored in the database');

    //                 usersFromMessage.forEach(function(userFromTest){

    //                     //Make sure we get the team of this user so we can get the user name and pictures to create the event

    //                     bot.startPrivateConversation({user: userFromTest}, function(response, convo){
    //                       convo.say(user.name + " wants to get lunch with you breh! To check the status of this event click this link broski. " + "http://u-down.herokuapp.com/");
    //                     });
    //                 });

    //                 bot.reply(message, 'Cool I have notified your users about the event! you can use this link to see if they are down to come! http://u-down.herokuapp.com/');
    //             }); 
    //         });
    //     });
    // }

// });


// controller.hears(['.$'], 'direct_message,direct_mention,mention', function (bot, message) {
//     bot.reply(message, 'Sorry didnt get you!, can you try again?');;
// });
