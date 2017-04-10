var misc = require("../utils/misc");
var Promise = require("bluebird");
var balloon_table = "balloons";
var path_table = "paths";
var like_table = "likes";
var creep_table = "creeps";

var Balloon = {
    create: function (db, sender,  text) {
        var sent_at = misc.getDateUTC();
        return db.request().query`INSERT INTO [${balloon_table}] SET 
                [text]=${text},
                [user_id]= ${sender.user_id},
                [sent_at]= ${sent_at},
                [lng]= ${sender.lng},
                [lat]= ${sender.lat};
                SELECT @@IDENTITY AS id`
            .then(function (result) {
                return {balloon_id: result.recordset[0].id, user_id: sender.user_id, text:text, sent_at: sent_at}
            });
    },

    send: function (db, balloon, sender, receivers) {
        //(balloon _id, from_user, to_user, from_lng, from_lat, to_lng, to_lat, sent_at)
        var sent_at = misc.getDateUTC();
        var input = "";
        //add sender -> receiver
        var from_user = sender;
        for(var i = 0; i < receivers.length; i++)
        {
            var to_user = receivers[i];
            //add entry to inputs
            var strr = `(${balloon.balloon_id},
                ${from_user.user_id},
                ${to_user.user_id},
                ${from_user.lng},
                ${from_user.lat},
                ${to_user.lng},
                ${to_user.lat},
                ${sent_at})`;

            if (i < receivers.length -1){
                    strr += ", "
            }
            input += strr;
        }
        //insert
        return db.request().query`INSERT INTO [${path_table}] ([balloon_id], [from_user], 
            "[to_user], [from_lng], [from_lat], [to_lng], [to_lat], [sent_at] VALUES ${input}`
            .then(function (results) {
                    return sent_at;
            });
    },
    update: function (db, balloon_id, data) {
        var sett = "";
        for (var key in data){
            sett += key + " = " + data[key] +",";
        }
        sett = sett.substr(0, sett.length-1);

        return db.request().query`UPDATE [${balloon_table}] SET ${sett} WHERE [balloon_id]=${balloon_id}`;

    },
    increment_refilled: function (db, balloon_id) {
        return db.request().query`UPDATE [${balloon_table}] 
                                SET [refills] = [refills]+1 WHERE [balloon_id]=${balloon_id}`
            .then(function (results) {

                if(results.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("Balloon not found"));
                return true;
            });

    },
    getSent: function (db, user_id, last_date, limit ) {
        return db.request().query("SELECT * FROM ?? WHERE `user_id`=? AND `sent_at` < ?  LIMIT ?",
            [balloon_table, user_id, last_date, limit]);
    },

    getReceived: function(db, user_id, last_date, limit){
        return db.request().query(
            "Select balloons.balloon_id as balloon_id, balloons.text as text, balloons.sentiment as sentiment" +
            ", balloons.lng as lng, balloons.lat as lat, paths.sent_at as sent_at, paths.to_refilled as refilled, \n"+
                "paths.to_liked as liked, paths.to_creeped as creeped\n"+
            "FROM ?? \n"+
            "INNER JOIN ?? \n"+
                "ON balloons.balloon_id = paths.balloon_id \n"+
            "WHERE paths.to_user = ? AND paths.sent_at < ? LIMIT ?",
            [path_table, balloon_table, user_id, last_date, limit]);
    },
    getLiked: function (db, user_id, last_date, limit ) {
        return db.request().query(
            "Select balloons.balloon_id as balloon_id, balloons.text as text, balloons.sentiment as sentiment,\n" +
            " balloons.lng as lng, balloons.lat as lat,likes.liked_at as liked_at, paths.to_refilled as refilled," +
            " paths.to_creeped as creeped, paths.sent_at\n"+
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
    
    unlike: function (db, user_id, balloon_id) {
        var date = misc.getDateUTC();
        return db.request().beginTransaction()
            .then(function () {
                return db.query("UPDATE ?? SET ? WHERE `balloon_id`=? AND `to_user`=?", [
                    path_table,
                    {to_liked: false},
                    balloon_id, user_id
                ]);
            })
            .then(function(rows){
                if(rows.affectedRows < 1)
                    return Promise.reject(misc.makeError("User " + user_id + " unlikes balloon "
                        + balloon_id + " though it was not received."));

                return db.query("Delete FROM ?? WHERE `balloon_id`=? AND `user_id` = ?",
                    [like_table, balloon_id, user_id, date]);
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
        var balloon = null;
        return db.beginTransaction()
            .then(function () {
                return db.query("UPDATE ?? SET ? WHERE `balloon_id`=? AND `to_user`=? AND `to_creeped`=?",
                    [path_table, {to_creeped: true},  balloon_id,  user_id,false]);
            })
            .then(function(rows){
                if(rows.affectedRows < 1)
                    return Promise.reject(misc.makeError("Cant creep again."));
                //lock the row for update
                return db.query("SELECT * FROM ?? WHERE ? LOCK IN SHARE MODE"
                    , [balloon_table, {balloon_id: balloon_id}]);
            })
            .then(function (result) {
                balloon = result[0];
                //update the row
                return db.query("UPDATE ?? SET creeps = creeps+1 WHERE ?"
                    ,[balloon_table, {balloon_id: balloon_id}])
            })
            .then(function (rows) {
                return db.commit().then(function () {
                    return balloon;
                });
            })
            .catch(function (error) {
                db.rollback().catch(function (err) {misc.logError(err);});
                throw error;
            })
    },
    getPaths:function (db, balloon_id) {
        return db.query("Select `from_user`, `from_lat`, `from_lng`, `to_user`, `to_lat`, `to_lng`" +
            "FROM  ?? WHERE ?",[path_table, {balloon_id:balloon_id}]);
    },

    isRefilledBy: function (db, balloon_id, user_id) {
        return db.query("Select * from ?? WHERE `balloon_id` = ? AND `to_user`=?",
            [path_table, balloon_id, user_id])
            .then(function (result) {
                if(result.length == 0)
                    return null;
                return Boolean(result[0].to_refilled);
            });
    },
    set_refilled: function(db, balloon_id, user_id)
    {
        return db.query("UPDATE ?? SET ? WHERE `balloon_id` = ? AND `to_user` = ?",
            [path_table,{to_refilled:true}, balloon_id, user_id])
            .then(function (result) {
                if(result.affectedRows == 0)
                    return Promise.reject(misc.makeError("User dont have this balloon."));
                return true;
            })
    },
    get: function (db, balloon_id) {
        return db.query("SELECT * from ?? WHERE ?",[balloon_table,{balloon_id:balloon_id}])
            .then(function (results) {
                if(results.affectedRows == 0)
                    return Promise.reject(misc.makeError("Balloon not found"));

                return results[0];
            });
    }


};

module.exports = Balloon;