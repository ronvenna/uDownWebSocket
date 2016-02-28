/**
 * Helpers for configuring a bot as an app
 * https://api.slack.com/slack-apps
 */

var Botkit = require('botkit');
var async = require('async');
var _bots = {};

function _trackBot(bot) {
    _bots[bot.config.token] = bot;
}

function die(err) {
    console.log(err);
    process.exit(1);
}

module.exports = {
    configure: function (port, clientId, clientSecret, config, onInstallation) {
        var controller = Botkit.slackbot(config).configureSlackApp(
            {
                clientId: clientId,
                clientSecret: clientSecret,
                scopes: ['bot'], //TODO it would be good to move this out a level, so it can be configured at the root level
            }
        );

        var port = process.env.PORT || 8765;

        controller.setupWebserver(port,function(err,webserver) {
            controller.createWebhookEndpoints(controller.webserver);
            controller.createOauthEndpoints(controller.webserver,function(err,req,res) {
                if (err) {
                    res.status(500).send('ERROR: ' + err);
                } else {
                    res.send('Success!');
                }
            });
        });

        controller.on('create_bot', function (bot, config) {

            if (_bots[bot.config.token]) {
                // already online! do nothing.
            } else {

                bot.startRTM(function (err) {
                    if (err) {
                        die(err);
                    }

                    _trackBot(bot);

                    if (onInstallation) onInstallation(bot, config.createdBy);
                });
            }
        });


        controller.storage.teams.all(function (err, teams) {

            if (err) {
                throw new Error(err);
            }

            // connect all teams with bots up to slack!
            for (var t  in teams) {
                if (teams[t].bot) {
                    var bot = controller.spawn(teams[t]).startRTM(function (err) {
                        if (err) {
                            console.log('Error connecting bot to Slack:', err);
                        } else {
                            _trackBot(bot);
                        }
                    });
                }
            }

        });
	
        controller.webserver.use(function(req, res, next) {
          res.header("Access-Control-Allow-Origin", "*");
          res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
          next();
        });

    	// add a stub to retrieve events
	controller.webserver.get('/v1/events/:id', function(request, response) {
	   controller.storage.events.get(request.params.id, function(err, event) {
                if(err){
            		response.status(500).send({error_message:'unknown error'});
        	} else {
		   if(event){	
			async.series([function(callback){
				if(event.attending && event.attending.length>0){
					getUsers(event.attending, function(error, users){
						event.attending = users;
						callback(null, 'attending completed');
					});
				} else {
					callback(null, 'attending completed');
				}	
			}, function(callback){
				if(event.invited && event.invited.length>0){
					getUsers(event.invited, function(error, users){
						console.log(error);
						event.invited = users;
						callback(null, 'invited completed');

					});
				} else {
		                	callback(null, 'invited completed');
				} 			
			}, function(callback){
				if(event.not_attending && event.not_attending.length>0){
					getUsers(event.not_attending, function(error, users){
						event.not_attending = users;
						callback(null, 'not attending completed');

					});
				} else {
					callback(null, 'not attending completed');									                             } 
			}], function(error, result){
			    if(error){
				console.log(error);	
			    	response.status(500).send({"message":"unknown error retrieving the event"});	
			    } else {
				response.status(200).send(event);
			    }	    
			});
	             } else {			
            		response.status(404).send({'error_message':'Event not found!'});
		     }
        	}
    	   });

	});

	function getUsers(usersIds,callback){
	    var users = [];
            async.each(usersIds, function(userId, callback){
		controller.storage.users.get(userId, function(error, user){
			if(error){
			    callback(error);
			} else {
				users.push(user);
				callback();	
			}
		});
	    }, function(error){
		if(error){
		   console.log(error);	
		} else {
		   callback(null,users);
		}	
	    });	    
	};

        return controller;


    }
}
