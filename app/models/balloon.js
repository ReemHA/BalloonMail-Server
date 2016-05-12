var misc = require("../utils/misc");
var Promise = require("bluebird");
var balloon_table = "balloons";
var path_table = "paths";
var like_table = "likes";
var creep_table = "creeps";

var Balloon = {
    create: function (db, sender,  text, in_flight) {
        var sent_at = misc.getDateUTC();
        return db.query("INSERT INTO ?? SET ?",
            [balloon_table, {
                text:text,
                user_id: sender.user_id,
                sent_at: sent_at,
                lng: sender.lng,
                lat: sender.lat,
                in_flight: in_flight
            }])
            .then(function (rows) {
                return {balloon_id: rows.insertId, user_id: sender.user_id, text:text, sent_at: sent_at,
                    in_flight: in_flight}
            });
    },

    send: function (db, balloon, sender, receivers) {
        //(balloon _id, from_user, to_user, from_lng, from_lat, to_lng, to_lat, sent_at)
        var sent_at = misc.getDateUTC();
        var input = [];
        //add sender -> receiver
        var from_user = sender;
        for(var i = 0; i < receivers.length; i++)
        {
            var to_user = receivers[i];
            //add entry to inputs
            input.push([
                balloon.balloon_id,
                from_user.user_id,
                to_user.user_id,
                from_user.lng,
                from_user.lat,
                to_user.lng,
                to_user.lat,
                sent_at
            ]);
        }
        //insert
        return db.query("INSERT INTO ?? (`balloon_id`, `from_user`, " +
            "`to_user`, `from_lng`, `from_lat`, `to_lng`, `to_lat`, `sent_at`) VALUES ?", [path_table,input])
            .then(function (results) {
                    return sent_at;
            });
    },
    update: function (db, balloon, data) {
        return db.query("UPDATE ?? SET ? WHERE `balloon_id`=?",
            [balloon_table, data, balloon.balloon_id]);

    },

    getSent: function (db, user_id, last_date, limit ) {
        return db.query("SELECT * FROM ?? WHERE `user_id`=? AND `sent_at` < ?  LIMIT ?",
            [balloon_table, user_id, last_date, limit]);
    },

    getReceived: function(db, user_id, last_date, limit){
        return db.query(
            "Select balloons.balloon_id as balloon_id, balloons.text as text, balloons.sentiment as sentiment" +
            ", paths.sent_at as sent_at, paths.to_refilled as refilled, \n"+
                "paths.to_liked as liked, paths.to_creeped as creeped\n"+
            "FROM ?? \n"+
            "INNER JOIN ?? \n"+
                "ON balloons.balloon_id = paths.balloon_id \n"+
            "WHERE paths.to_user = ? AND paths.sent_at < ? LIMIT ?",
            [path_table, balloon_table, user_id, last_date, limit]);
    },
    getLiked: function (db, user_id, last_date, limit ) {
        return db.query(
            "Select balloons.balloon_id as balloon_id, balloons.text as text, balloons.sentiment as sentiment,\n" +
            "likes.liked_at as liked_at, paths.to_refilled as refilled, paths.to_creeped as creeped\n"+
            "FROM ?? \n"+
            "INNER JOIN ?? \n"+
                "ON balloons.balloon_id = likes.balloon_id \n"+
            "INNER JOIN ??\n"+
                "ON paths.balloon_id = likes.balloon_id AND paths.to_user = likes.user_id\n"+
            "WHERE likes.user_id = ? AND likes.liked_at < ? LIMIT ?",
            [like_table, balloon_table, path_table,  user_id, last_date, limit]);
    },
    like: function (db, user_id, balloon_id) {
        var date = misc.getDateUTC();
        return db.beginTransaction()
            .then(function () {
                return db.query("UPDATE ?? SET ? WHERE `balloon_id`=? AND `to_user`=?", [
                    path_table,
                    {to_liked: true},
                    balloon_id, user_id
                ]);
            })
            .then(function(rows){
                if(rows.affectedRows < 1)
                    return Promise.reject(misc.makeError("User " + user_id + " likes balloon "
                        + balloon_id + " though it was not received."));

                return db.query("INSERT INTO ?? (`balloon_id`,`user_id`,`liked_at`) VALUES (?)",
                    [like_table, [balloon_id, user_id, date]]);
            })
            .then(function (rows) {
                return db.commit();
            })
            .catch(function (error) {
                db.rollback().catch(function (err) {misc.logError(err);});
                throw error;
            })
    },
    creep: function (db, user_id, balloon_id) {
        var date = misc.getDateUTC();
        return db.beginTransaction()
            .then(function () {
                return db.query("UPDATE ?? SET ? WHERE `balloon_id`=? AND `to_user`=?",
                    [path_table, {to_creeped: true},  balloon_id,  user_id]);
            })
            .then(function(rows){
                if(rows.affectedRows < 1)
                    return Promise.reject(misc.makeError("User " + user_id + " creeped balloon "
                        + balloon_id + " though it was not received."));
                //lock the row for update
                return db.query("SELECT * FROM ?? WHERE ? LOCK IN SHARE MODE"
                    , [balloon_table, {balloon_id: balloon_id}]);
            })
            .then(function (result) {
                //update the row
                return db.query("UPDATE ?? SET creeps = creeps+1 WHERE ?"
                    ,[balloon_table, {balloon_id: balloon_id}])
            })
            .then(function (rows) {
                return db.commit();
            })
            .catch(function (error) {
                db.rollback().catch(function (err) {misc.logError(err);});
                throw error;
            })
    },
    isCreepedBy: function (db, balloon_id, user_id) {
        return db.query("Select from ?? WHERE `balloon_id` = ? AND `to_user`=?",
            [path_table, balloon_id, user_id])
            .then(function (result) {
                if(result.affectedRows == 0)
                    return null;
                return Boolean(result.to_creeped);
            });
    },
    isRefilledBy: function (db, balloon_id, user_id) {
        return db.query("Select from ?? WHERE `balloon_id` = ? AND `to_user`=?",
            [path_table, balloon_id, user_id])
            .then(function (result) {
                if(result.affectedRows == 0)
                    return null;
                return Boolean(result.to_refilled);
            });
    },
    get: function (db, balloon_id) {
        return db.query("SELECT `user_id` from ?? WHERE ?",[balloon_table,{balloon_id:balloon_id}])
            .then(function (result) {
                if(results.affectedRows == 0)
                    return Promise.reject(misc.makeError("Balloon not found"));

                return results.user_id;
            });
    }


};

module.exports = Balloon;