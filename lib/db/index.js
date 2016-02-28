var db = require('monk');

/**
 * uDown-storage-mongo - MongoDB driver for uDown
 * Adapted from botkit-storge-mongo
 * @param  {Object} config
 * @return {Object}
 */
module.exports = function(config) {
    /**
     * Example mongoUri is:
     * 'mongodb://test:test@ds037145.mongolab.com:37145/slack-bot-test'
     * or
     * 'localhost/mydb,192.168.1.1'
     */
    if (!config || !config.mongoUri)
        throw new Error('Need to provide mongo address.');

    var Events = db(config.mongoUri).get('events');

    var unwrapFromList = function(cb) {
        return function(err, data) {
            if (err) return cb(err);
            cb(null, data);
        };
    };

    var storage = {
        events: {
            get: function(id, cb) {
                Events.findOne({id: id}, unwrapFromList(cb));
            },
            save: function(data, cb) {
                Events.findAndModify({
                    id: data.id
                }, data, {
                    upsert: true,
                    new: true
                }, cb);
            },
            all: function(cb) {
                Events.find({}, cb);
            }
        }
     };

    return storage;
};
