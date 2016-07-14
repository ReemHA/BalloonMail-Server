var express = require('express');
var router = express.Router();
var request = require("request");
var Balloon = require("../models/balloon");
var User = require("../models/user");
var config = require("../config");
var middle = require("../middleware/middle");
var logger = require("../utils/logger");
var Promise = require("bluebird");
var gcm = require("node-gcm");


//var Hash = require("hashtable");
// var balloons_queue = new Hash();
var balloons_queue = {};
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
                            if(data.rec.length > 0)
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
                            return Balloon.update(conn, data.balloon.balloon_id, {
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
                            notifyBalloonSent(data.balloon,data.sender, data.rec, data.sent_at,false);

                        })
                        .catch(function (error) {
                            conn.rollback().catch(function (err) {misc.logError(err);});
                            throw error;
                        })
                })
        })
        .catch(function (error) {
            misc.logError(error);
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
    Balloon.getReceived(conn,req.user_id, last_date, limit)
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
    conn.query("SELECT * FROM `paths` WHERE `to_user` = ? AND `balloon_id` = ?",[req.user_id, balloon_id])
        .then(function (results) {
            if(results.length == 0)
                return Promise.reject(misc.makeError("User dont have this balloon."));
            return results[0].to_liked;
        })
        .then(function (has_liked) {
            if(!has_liked)
                return Balloon.like(conn,req.user_id, balloon_id);
            else
                return Balloon.unlike(conn,req.user_id, balloon_id);
        })
        .then(function(){
            res.json({});
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });


});

router.get("/paths",...middle, function (req, res, next) {
    var balloon_id = req.query.balloon_id;
    if(!balloon_id)
    {
        next(misc.makeError("balloon_id field not found in request."));
        return;
    }

    var source = req.user_id;
    var conn = req.db;
    Balloon.getPaths(conn, balloon_id)
        .then(function (paths) {
            res.json({source: source, paths:paths});
        })
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
    Balloon.creep(conn, req.user_id, balloon_id)
        .then(function (balloon) {
            res.json({});
            User.get(db, balloon.user_id)
                .then(function (user) {
                    notifyCreeped(user,balloon_id, balloon.creeps+ 1);
                })
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
        .finally(function () {
            conn.connection.release();
        });

});

router.post("/refill",...middle,function (req, res, next) {
    var balloon_id = req.body.balloon_id;
    if(!balloon_id)
    {
        next(misc.makeError("balloon_id field not found in request."));
        return;
    }

    if(balloons_queue[balloon_id])
    {
        addRequestToQueue(balloon_id, req.user_id, req.db, res, next);
    }
    else
    {
        setBalloonInProgress(balloon_id);
        refill_request(req.user_id, balloon_id, req.db, res, next);
    }


} );

var notifyBalloonSent = function (balloon, sender, receivers, sent_at) {
    logger.debug("GCM: notiying sent");
    var message = new gcm.Message({
        data: {
            type:"REC",
            lng: String(sender.lng),
            lat: String(sender.lat)
        }
    });
    
    // Set up the sender with your API key, prepare your recipients' registration tokens.
    var sender = new gcm.Sender(config.gcm_key);
    var regTokens = receivers.map(function(obj){return obj.gcm_id;});
    
    sender.send(message, { registrationTokens: regTokens }, config.gcm_retry_count, function (err, response) {
        if (err) misc.logError(err);
        else    logger.debug(response);
    });

};


var notifyCreeped = function(user, balloon_id, new_creeps) {
    logger.debug("GCM: notiying creeped");
    var message = new gcm.Message({
        data: {
            type:"CRP",
            creeps: String(new_creeps),
            balloon_id: String(balloon_id)
        }
    });
    
    // Set up the sender with your API key, prepare your recipients' registration tokens.
    var sender = new gcm.Sender(config.gcm_key);
    
    sender.send(message, { to: user.gcm_id }, config.gcm_retry_count, function (err, response) {
        if (err) misc.logError(err);
        else    logger.debug(response);
    });


};

var notify_refilled = function (balloon_id, user, new_refill) {
    logger.debug("GCM: notiying refilled");
    var message = new gcm.Message({
        data: {
            type:"RFL",
            refills: String(new_refill),
            balloon_id: String(balloon_id)
        }
    });
    
    // Set up the sender with your API key, prepare your recipients' registration tokens.
    var sender = new gcm.Sender(config.gcm_key);
    
    sender.send(message, { to: user.gcm_id }, config.gcm_retry_count, function (err, response) {
        if (err) misc.logError(err);
        else    logger.debug(response);
    });
};

var refill_request = function (user_id, balloon_id, db, res, next) {
    //get send count randomly
    var send_count = config.send_possible_counts[Math.floor(Math.random() * config.send_possible_counts.length)];
    var data = {};
    //check user have the balloon and did not refilled it before
    Balloon.isRefilledBy(db, balloon_id, user_id)
        .then(function (is_refilled) {
            if(is_refilled)
                return Promise.reject(misc.makeError("User already refilled this balloon"));
            if (is_refilled == null)
            {
                return Promise.reject(misc.makeError("User dont have this balloon."));
            }
            //get the source user of the balloon
            return Promise.all([Balloon.get(db, balloon_id), User.get(db, user_id)]);
        })
        //get random
        .spread(function (balloon, user) {
            data.balloon = balloon;
            data.user = user;
            return User.getRandomWithNoBalloon(db,send_count,balloon_id, balloon.user_id)
                .then(function (rec) {
                    data.rec = rec;
                    if(data.rec.length <= 1)
                    {
                        return Promise.reject(misc.makeError("Not enough users"));
                    }
                    
                    return db.beginTransaction()
                        .then(function () {
                            return Promise.all([Balloon.send(db, data.balloon, user, rec),
                                Balloon.increment_refilled(db,balloon_id), Balloon.set_refilled(db,balloon_id,user_id)])
                                .spread(function (sent_at,b,c) {
                                    data.sent_at = sent_at;
                                    return db.commit();
                                })
                                .catch(function (error) {
                                    db.rollback().catch(function (err) {misc.logError(err);});
                                    throw error;
                                })
                        })


                })
                .then(function (sent_at) {
                    res.json({});
                    finishBalloonRefill(balloon_id);
                    notifyBalloonSent(balloon_id,data.user, data.rec,data.sent_at );
                    Balloon.get(db,balloon_id).then(function (balloon) {
                        notify_refilled(balloon_id, data.balloon.user_id, balloon.refills);
                    });
                })
        })
        .catch(function (error) {
            finishBalloonRefill(balloon_id);
            if (!error.nolog) {
                misc.logError(error);
            }
            next(error);
        })
        .finally(function () {
            db.connection.release();
        });

};

var setBalloonInProgress = function (balloon_id) {
    balloons_queue[balloon_id] = {func: null, next: null};
};

var addRequestToQueue = function (balloon_id, user_id, db, res, next) {
    //get the queue object
    var queue = balloons_queue[balloon_id];
    //create the function to be called when turn comes
    var func = function () {
        refill_request(req.user_id, balloon_id, req.db, res, next);
    };
    //if the queue next item is an in progress indication
    if(queue.func == null)
    {
        //then only modify the func object to point to the func to be executed
        queue.func = func;
    }
    else {
        //otherwise create new item and add to tail
        //fetch the tail first
        var current = queue;
        while(current.next)
        {
            current = current.next;
        }
        //then add the new item to tail
        current.next = {func: func, next: null};
    }
};
var finishBalloonRefill = function (balloon_id) {
    processNextInQueue(balloon_id);
};
var processNextInQueue = function (balloon_id){
    var queue = balloons_queue[balloon_id];
    //is there any func to execute
    if(queue.func)
    {
        //something in queue lets save the func that we will call now
        var saved_func = queue.func;
        //fetch the new item in queue
        var new_queu = queue.next;
        //if no new after that
        if(!new_queu)
        {
            //then just make the queue indicate that something is in progress
            //{func:null, next:null}
            queue.func = null;
        }
        else {
            //something in queue next, lets add it
            queue.func = new_queu.func;
            queue.next = new_queu.next;
        }

        //then we should call our saved func
        saved_func();
    }
    else {
        //nothing next delete in progress indication of this balloon
        delete queue;
    }
};
var calculateReach = function (sender, recerivers) {
    return 0;
};


module.exports = router;
