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
var rp = require('request-promise');
var sql = require("mssql");


var balloons_queue = {};
var misc = require("../utils/misc");
var GCMSender =  new gcm.Sender(config.gcm_key);


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


    var data = {
        balloon: null, sender: null, rec: null, sentiment: null, reach: 0, sent_at: null};
    // get user details and select random users to send the balloon to
    Promise.all([User.get(conn,req.user_id), User.getRandom(conn, send_count, req.user_id )])
        .spread(function (sender, receivers) {
            data.rec = receivers;
            data.sender = sender;
            //start a transaction
            var transaction = new sql.Transaction(conn);
            let rolled_back = false;
            return transaction.begin()
                .then(function () {
                    transaction.on('rollback', aborted => {
                        rolled_back = true;
                    });
                    //create balloon
                    return Balloon.create(transaction, data.sender, text)
                        //send
                        .then(function (balloon) {
                            data.balloon = balloon;
                            return Balloon.send(transaction,data.balloon, data.sender, data.rec);
                        })
                        .then(function (sent_at) {
                            data.sent_at = sent_at;
                            var options = {
                                method: 'POST',
                                uri: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment',
                                body:  {
                                    "documents": [
                                        {
                                            "language": "en",
                                            "id": "1",
                                            "text": data.balloon.text
                                        }
                                    ]
                                },
                                json: true, // Automatically stringifies the body to JSON,
                                headers: {
                                    "Ocp-Apim-Subscription-Key": config.azure_text_analatycs_key,
                                    "Content-Type": "application/json",
                                    "Accept": "application/json"
                                }
                            };

                            return rp(options)
                        })
                        //update balloon
                        .then(function (response) {
                            var sentiment = 0.5;
                            if(response["errors"].length == 0){
                                sentiment =  Number(response["documents"][0].score);
                            }
                            data.sentiment = sentiment;
                            data.reach = calculateReach(data.sender, data.rec);
                            return Balloon.update(transaction, data.balloon.balloon_id, {
                                sentiment: sentiment,
                                reach: data.reach
                            });
                        })
                        //end transaction
                        .then(function () {
                            return transaction.commit()
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
                            if(!rolled_back) {
                                transaction.rollback().catch(function (err) {
                                    misc.logError(err);
                                });
                            }
                            throw error;
                        })
                })
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })

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


});


router.post("/like",...middle, function (req, res, next) {
    var balloon_id = req.body.balloon_id;
    if(!balloon_id)
    {
        next(misc.makeError("balloon_id field not found in request."));
        return;
    }

    var conn = req.db;
    var liked = false;
    User.getReceivedBalloon(conn, req.user_id, balloon_id)
        .then(function (balloon) {
            return balloon.to_liked;
        })
        .then(function (has_liked) {
            liked = has_liked;
            if(!has_liked)
                return Balloon.like(conn,req.user_id, balloon_id);
            else
                return Balloon.unlike(conn,req.user_id, balloon_id);
        })
        .then(function(){
            res.json({"liked":!liked});
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })
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
            User.get(conn, balloon.user_id)
                .then(function (user) {
                    notifyCreeped(user,balloon_id, balloon.creeps);
                })
                .catch(error => {
                    error.message += "Couldn't notify creeped: " + error.message;
                    misc.logError(error);
                })
        })
        .catch(function (error) {
            misc.logError(error);
            next(error);
        })


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
    var message = new gcm.Message();
    message.addData('type', 'REC');
    message.addData('lng', String(sender.lng));
    message.addData('lat', String(sender.lat));
    var regTokens = receivers.map(function(obj){return obj.gcm_id;});


    GCMSender.send(message, regTokens, config.gcm_retry_count,  function (err, response) {
        if(err) {
            logger.debug("GCM error: " + err);
        } else {
            logger.debug("GCM response: " + response);
        }
    });

};


var notifyCreeped = function(user, balloon_id, new_creeps) {
    logger.debug("GCM: notiying creeped");
    var message = new gcm.Message();
    message.addData('type', 'CRP');
    message.addData('creeps', String(new_creeps));
    message.addData('balloon_id', String(balloon_id));
    var sender =  new gcm.Sender(config.gcm_key);

    GCMSender.send(message,  user.gcm_id, config.gcm_retry_count,  function (err, response) {
        if(err) {
            logger.debug("GCM error: " + err);
        } else {
            logger.debug("GCM response: " + response);
        }
    });

};

var notify_refilled = function (balloon_id, user, new_refill) {
    logger.debug("GCM: notiying refilled");
    var message = new gcm.Message();
    message.addData('type', 'RFL');
    message.addData('refills', String(new_refill));
    message.addData('balloon_id', String(balloon_id));
    var sender =  new gcm.Sender(config.gcm_key);

    GCMSender.send(message, user.gcm_id, config.gcm_retry_count,  function (err, response) {
        if(err) {
            logger.debug("GCM error: " + err);
        } else {
            logger.debug("GCM response: " + response);
        }
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
        .then(function (result) {
            [balloon, user] = result;
            data.balloon = balloon;
            data.user = user;
            var rolled_back = false;
            return User.getRandomWithNoBalloon(db,send_count,balloon_id, balloon.user_id)
                .then(function (rec) {
                    data.rec = rec;
                    if(data.rec.length <= 1)
                    {
                        return Promise.reject(misc.makeError("Not enough users"));
                    }

                    var transaction = new sql.Transaction(db);
                    return transaction.begin()
                        .then(function () {
                            transaction.on('rollback', aborted => {
                                rolled_back = true;
                            });
                            return Promise.all([Balloon.send(db, data.balloon, user, rec),
                                Balloon.increment_refilled(db,balloon_id), Balloon.set_refilled(db,balloon_id,user_id)])
                                .then(function (result) {
                                    [sent_at,b,c] = result;
                                    data.sent_at = sent_at;
                                    return transaction.commit();
                                })
                                .catch(function (error) {
                                    if(!rolled_back) {
                                        transaction.rollback().catch(function (err) {
                                            misc.logError(err);
                                        });
                                    }
                                    throw error;
                                })
                        })


                })
                .then(function () {
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
