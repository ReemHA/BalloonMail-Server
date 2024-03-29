var misc = require("../utils/misc");
var Promise = require("bluebird");
var balloon_table = "balloons";
var path_table = "paths";
var like_table = "likes";
var creep_table = "creeps";
var sql = require("mssql");

var Balloon = {
    create: function (db, sender,  text) {
        var sent_at = misc.getDateUTC();
        var query = `INSERT INTO [${balloon_table}] 
            ([text], [user_id], [sent_at], [lng], [lat]) VALUES 
            (N'${misc.escapeSQLString(text)}',  ${sender.user_id}, 
            '${sent_at}',${sender.lng},${sender.lat});SELECT @@IDENTITY AS id`;
        return db.request().query(query)
            .then(function (result) {
                return {balloon_id: result.recordset[0].id, user_id: sender.user_id, text:text, sent_at: sent_at}
            })
            .catch(err => {
                err.message = "In Balloon Create: \n" + query +"\n\n" + err.message;
                throw err;
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
                '${sent_at}')`;

            if (i < receivers.length -1){
                    strr += ", "
            }
            input += strr;
        }
        //insert
        var query = `INSERT INTO [${path_table}] ([balloon_id], [from_user], 
             [to_user], [from_lng], [from_lat], [to_lng], [to_lat], [sent_at]) VALUES ${input}`;
        return db.request().query(query)
            .then(function (results) {
                    return sent_at;
            }).catch(err => {
                err.message = "In Balloon send: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    update: function (db, balloon_id, data) {
        var sett = "";
        for (var key in data){
            sett += key + " = " + data[key] +",";
        }
        sett = sett.substr(0, sett.length-1);
        var query = `UPDATE [${balloon_table}] SET ${sett} WHERE [balloon_id]=${balloon_id}`;
        return db.request().query(query)
            .catch(err => {
                err.message = "In Balloon update: \n" + query +"\n\n" + err.message;
                throw err;
            });

    },
    increment_refilled: function (db, balloon_id) {
        var query = `UPDATE [${balloon_table}] 
                                SET [refills] = [refills]+1 OUTPUT inserted.refills WHERE [balloon_id]=${balloon_id}`;
        return db.request().query(query)
            .then(function (results) {

                if(results.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("Balloon not found"));
                return results.recordset[0].refills;
            }).catch(err => {
                err.message = "In Balloon increment_refilled: \n" + query +"\n\n" + err.message;
                throw err;
            });

    },
    getSent: function (db, user_id, last_date, limit ) {
        var query = `SELECT TOP ${limit} * FROM [${balloon_table}] WHERE [user_id]=${user_id} 
                    AND [sent_at] < '${last_date}';`;
        return db.request().query(query)
            .then(result => {
               return result.recordset;
            }).catch(err => {
                err.message = "In Balloon getSent: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },

    getReceived: function(db, user_id, last_date, limit){
        var query = `
            Select TOP ${limit} balloons.balloon_id as balloon_id, balloons.text as text, balloons.sentiment as sentiment,
            balloons.lng as lng, balloons.lat as lat, paths.sent_at as sent_at, paths.to_refilled as refilled,
             paths.to_liked as liked, paths.to_creeped as creeped
            FROM [${path_table}] 
            INNER JOIN [${balloon_table}] 
                ON balloons.balloon_id = paths.balloon_id 
            WHERE paths.to_user = ${user_id} AND paths.sent_at < '${last_date}' `;
        return db.request().query(query)
            .then(result => {
                return result.recordset;
            }).catch(err => {
                err.message = "In Balloon getReceived: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    getLiked: function (db, user_id, last_date, limit ) {
        var query=`
            Select TOP ${limit} balloons.balloon_id as balloon_id, balloons.text as text, balloons.sentiment as sentiment,
             balloons.lng as lng, balloons.lat as lat,likes.liked_at as liked_at, paths.to_refilled as refilled,
             paths.to_creeped as creeped, paths.sent_at
            FROM [${like_table}]  
            INNER JOIN [${balloon_table}]  
                ON balloons.balloon_id = likes.balloon_id 
            INNER JOIN [${path_table}] 
                ON paths.balloon_id = likes.balloon_id AND paths.to_user = likes.user_id
            WHERE likes.user_id = ${user_id} AND likes.liked_at < '${last_date}'`;
        return db.request().query(query)
            .then(result => {
                return result.recordset;
            }).catch(err => {
                err.message = "In Balloon getLiked: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    like: function (db, user_id, balloon_id) {
        var date = misc.getDateUTC();
        var transaction = new sql.Transaction(db);
        let rolled_back = false;
        return transaction.begin()
            .then(function () {
                transaction.on('rollback', aborted => {
                   rolled_back = true;
                });
                var query = `UPDATE [${path_table}] SET [to_liked]=1 WHERE 
                    [balloon_id]=${balloon_id} AND to_user=${user_id}`;
                return transaction.request().query(query)
                    .catch(err => {
                        err.query = query;
                        throw err;
                    });
            })
            .then(function(result){
                var rows = result.recordset;
                if(result.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("User " + user_id + " likes balloon "
                        + balloon_id + " though it was not received."));

                return transaction.request().query(`INSERT INTO [${like_table}] ([balloon_id],[user_id],[liked_at]) 
                    VALUES (${balloon_id}, ${user_id}, '${date}')`)
                    .catch(err => {
                        err.query = query;
                        throw err;
                    });
            })
            .then(function (rows) {
                return transaction.commit();
            })
            .catch(function (error) {
                var query = error.query ? error.query:"Error commiting";
                error.message = "In Balloon like: \n" + query +"\n\n" + error.message;
                if(!rolled_back){
                    transaction.rollback().catch(function (err) {misc.logError(err);});
                }
                throw error;
            })
    },
    
    unlike: function (db, user_id, balloon_id) {
        var date = misc.getDateUTC();
        var transaction = new sql.Transaction(db);
        let rolled_back = false;
        return transaction.begin()
            .then(function () {
                transaction.on('rollback', aborted => {
                    rolled_back = true;
                });
                return transaction.request().query(`UPDATE [${path_table}] SET [to_liked]=0 
                        WHERE [balloon_id]=${balloon_id} AND to_user=${user_id}`)
                .catch(err => {
                    err.query = query;
                    throw err;
                });
            })
            .then(function(results){
                if(results.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("User " + user_id + " unlikes balloon "
                        + balloon_id + " though it was not received."));

                return transaction.request().query(`Delete FROM [${like_table}] WHERE [balloon_id]=${balloon_id}
                            AND [user_id] = ${user_id}`)
                    .catch(err => {
                        err.query = query;
                        throw err;
                    });
            })
            .then(function (rows) {
                return transaction.commit();
            })
            .catch(function (error) {
                var query = error.query ? error.query:"Error commiting";
                error.message = "In Balloon unlike: \n" + query +"\n\n" + error.message;
                if(!rolled_back){
                    transaction.rollback().catch(function (err) {misc.logError(err);});
                }
                throw error;
            })
    },
    creep: function (db, user_id, balloon_id) {
        var date = misc.getDateUTC();
        var balloon = null;
        var transaction = new sql.Transaction(db);
        let rolled_back = false;
        return transaction.begin()
            .then(function () {
                transaction.on('rollback', aborted => {
                    rolled_back = true;
                });
                return transaction.request().query(`UPDATE [${path_table}] SET [to_creeped]=1
                        WHERE [balloon_id]=${balloon_id} AND [to_user]=${user_id} AND [to_creeped]=0`)
                    .catch(err => {
                        err.query = query;
                        throw err;
                    });
            })
            .then(function(rows){
                if(rows.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("Cant creep again."));
                //lock the row for update
                return  transaction.request().query(`UPDATE [${balloon_table}] SET [creeps] = [creeps] + 1 
                    OUTPUT inserted.creeps, inserted.user_id WHERE [balloon_id]=${balloon_id}`)
                    .catch(err => {
                        err.query = query;
                        throw err;
                    });
            })
            .then(function (result) {
                return transaction.commit().then(function () {
                    return result.recordset[0];
                });
            })
            .catch(function (error) {
                var query = error.query ? error.query:"Error commiting";
                error.message = "In Balloon creep: \n" + query +"\n\n" + error.message;
                if(!rolled_back) {
                    transaction.rollback().catch(function (err) {
                        misc.logError(err);
                    });
                }
                throw error;
            })
    },
    getPaths:function (db, balloon_id) {
        var query = `Select [from_user], [from_lat], [from_lng], [to_user], [to_lat], [to_lng] 
            FROM  [${path_table}] WHERE [balloon_id]=${balloon_id}`;
        return db.request().query(query)
            .then(result => {
                return result.recordset;
            }).catch(err => {
                err.message = "In Balloon getPaths: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },

    isRefilledBy: function (db, balloon_id, user_id) {
        var query = `Select * from [${path_table}] WHERE [balloon_id] = ${balloon_id} 
                    AND [to_user]=${user_id}`;
        return db.request().query(query)
            .then(function (result) {
                var rows = result.recordset;
                if(rows.length == 0)
                    return null;
                return Boolean(rows[0].to_refilled);
            }).catch(err => {
                err.message = "In Balloon isRefilledBy: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    set_refilled: function(db, balloon_id, user_id)
    {
        var query = `UPDATE [${path_table}] SET [to_refilled]=1 
                WHERE [balloon_id] = ${balloon_id} AND [to_user]=${user_id}`;
        return db.request().query(query)
            .then(function (result) {
                if(result.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("User dont have this balloon."));
                return true;
            }).catch(err => {
                err.message = "In Balloon setRefilled: \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    get: function (db, balloon_id) {
        var query = `SELECT * from [${balloon_table}] WHERE [balloon_id] = ${balloon_id}`;
        return db.request().query(query)
            .then(function (result) {
                if(result.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("Balloon not found"));

                return result.recordset[0];
            }).catch(err => {
                err.message = "In Balloon get: \n" + query +"\n\n" + err.message;
                throw err;
            });
    }


};

module.exports = Balloon;