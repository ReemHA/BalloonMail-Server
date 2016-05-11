var express = require('express');
var router = express.Router();
var Balloon = require("../models/balloon");
var User = require("../models/user");
var config = require("../config");
var middle = require("../middleware/middle");
var logger = require("../utils/logger");
var Promise = require("bluebird");

var Hash = require("hashtable");
var balloons_queue = new Hash();
var misc = require("../utils/misc");
var watson = require('watson-developer-cloud');
var alchemy_language = watson.alchemy_language({
    api_key: config.alchemy_key
});


router.post("/create",...middle, function (req, res, next) {
    var text = req.body.text;
    if(!text)
    {
        next(misc.makeError("text field not found in request."));
        return;
    }

    //get send count randomly
    var send_count = config.send_possible_counts[Math.floor(Math.random() * config.send_possible_counts.length)];

    var conn = req.db;
    //start transaction
    var data = {
        balloon: null, sender: null, rec: null, sentiment: null, reach: 0, sent_at: null};
    
    // get user details and select random users to send the balloon to
    Promise.all([User.get(conn,req.user_id), User.getRandom(conn, send_count, req.user_id )])
        .spread(function (sender, receivers) {
            data.rec = receivers;
            data.sender = sender;
            var in_flight = 0;
            //check if there is someone to send to
            if(data.rec.length == 0)
            {
                //if no one set increment in_flight value
                in_flight += 1;
            }
            //start a transaction
            return conn.beginTransaction()
                .then(function () {
                    //create balloon
                    return Balloon.create(conn, data.sender, text, in_flight)
                        //send
                        .then(function (balloon) {
                            data.balloon = balloon;
                            //are there users to send to?
                            if(data.rec > 0)
                                return Balloon.send(conn,data.balloon, data.sender, data.rec);
                            return null;
                        })
                        //call alchemy
                        .then(function (sent_at) {
                            data.sent_at = sent_at;
                            return new Promise(function (resolve, reject) {
                                alchemy_language.sentiment({text: data.balloon.text}, function (err, response) {
                                    if (err)
                                        reject(err);
                                    else
                                    {
                                        var score = response.docSentiment.score;
                                        if(response.docSentiment.type == "neutral")
                                            score = 0;
                                        resolve(score);
                                    }
                                });
                            });
                        })
                        //update balloon
                        .then(function (sentiment) {
                            data.sentiment = sentiment;
                            data.reach = calculateReach(data.sender, data.rec);
                            return Balloon.update(conn, data.balloon, {
                                sentiment: sentiment,
                                reach: data.reach
                            });
                        })
                        //end transaction
                        .then(function () {
                            return conn.commit()
                        })
                        //notify receivers and send response
                        .then(function () {
                            res.json({
                                text: data.balloon.text,
                                balloon_id: data.balloon.balloon_id,
                                reach: data.reach,
                                sentiment: data.sentiment,
                                creeps: 0,
                                refills: 0,
                                rank: 0,
                                in_flight: data.balloon.in_flight,
                                sent_at: data.balloon.sent_at
                            });
                            notifyBalloonSent(data.balloon,data.sender, data.rec, data.sent_at);

                        })
                        .catch(function (error) {
                            conn.rollback().catch(function (err) {misc.logError(err);});
                            throw error;
                        })
                })
        })
        .catch(function (error) {
            if(!error.nolog)
            {
                misc.logError(error);
            }
            next(error);
        })
        .finally(function () {
            conn.connection.release()
        });
});

router.get("/sent", ...middle,function (req, res, next) {
    var last_date = req.query.last_data || misc.getDateUTC();
    var limit = req.query.limit || Number.MAX_SAFE_INTEGER;
    limit = Number(limit);
    var conn = req.db;
    Balloon.getSent(conn,req.user_id, last_date, limit)
        .then(function (balloons) {
            res.json({balloons: balloons});
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });

});

router.get("/received", ...middle,function (req, res, next) {
    var last_date = req.query.last_data || misc.getDateUTC();
    var limit = req.query.limit || Number.MAX_SAFE_INTEGER;
    limit = Number(limit);
    var conn = req.db;
    Balloon.getSent(conn,req.user_id, last_date, limit)
        .then(function (balloons) {
            res.json({balloons: balloons});
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });

});

router.get("/liked", ...middle,function (req, res, next) {
    var last_date = req.query.last_data || misc.getDateUTC();
    var limit = req.query.limit || Number.MAX_SAFE_INTEGER;
    limit = Number(limit);
    var conn = req.db;
    Balloon.getLiked(conn,req.user_id, last_date, limit)
        .then(function (balloons) {
            res.json({balloons: balloons});
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });

});


router.post("/like",...middle, function (req, res, next) {
    var balloon_id = req.body.balloon_id;
    if(!balloon_id)
    {
        next(misc.makeError("balloon_id field not found in request."));
        return;
    }

    var conn = req.db;
    Balloon.like(conn,req.user_id, balloon_id)
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });
});

router.post("/creep",...middle, function (req, res, next) {
    var balloon_id = req.body.balloon_id;
    if(!balloon_id)
    {
        next(misc.makeError("balloon_id field not found in request."));
        return;
    }

    var conn = req.db;
    Balloon.creep(conn,req.user_id, balloon_id)
        .then(function () {
            notifyCreeped(req.user_id, balloon_id);
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });
});
var notifyBalloonSent = function (balloon, sender, receivers, sent_at) {
    if(receivers.length == 0)
        return;


};
var notifyCreeped = function(user_id, balloon_id) {

};
var calculateReach = function (sender, recerivers) {
    return 0;
};


module.exports = router;
