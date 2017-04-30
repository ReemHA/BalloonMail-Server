var misc = require("../utils/misc");
var Promise = require("bluebird");
var table_name = "user";
var balloon_table = "balloons";
var paths_table="paths";
var sql = require("mssql");


var User = {
    findByGoogleId: function (db, google_id) {
        var query = `SELECT [user_id] FROM [${table_name}] WHERE [google_id]='${google_id}'`;
        return db.request().query(query)
            .then(function (data) {
                var rows = data.recordset;
                if(rows.length == 0)
                    return null;
                else
                    return rows[0];
            }).catch(err => {
                err.message = "In User findbygoogleid:  \n" + query +"\n\n" + err.message;
                throw err;
            });
            
    },
    
    updateLocation: function (db, user_id, lng, lat, gcm_id) {
        var query = `
        UPDATE [${table_name}] SET [lng]=${lng},[lat]= ${lat}, [gcm_id]='${gcm_id}'  WHERE [user_id]=${user_id}`;
        return db.request().query(query)
            .catch(err => {
                err.message = "In User updatelocation:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    updateGCMID: function (db, user_id, gcm_id) {
        var query = `UPDATE [${table_name}] SET [gcm_id]:${gcm_id} WHERE [user_id]=${user_id}`;
        return db.request().query(query)
            .catch(err => {
                err.message = "In User updategcmid:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    
    createWithGoogleId: function (db, name, google_id, lng, lat, gcm_id) {
        var query = `INSERT INTO [${table_name}] ([name], [google_id], [lng],[lat],[gcm_id],[created_at])
            VALUES ('${misc.escapeSQLString(name)}', '${google_id}',${lng},${lat},'${gcm_id}','${misc.getDateUTC()}'); 
            SELECT @@IDENTITY AS id`;
        return db.request().query(query)
            .then(function (results) {
                return {user_id: results.recordset[0].id, name: name};
            }).catch(err => {
                err.message = "In User createwithgoogleid:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    },

    get: function (db, id, null_if_not_exist) {
        var query = `SELECT [user_id], [lng],[lat],[gcm_id] FROM [${table_name}] where [user_id]=${id}`;
        return db.request().query(query)
            .then(function (result) {
                var rows = result.recordset;
                if(rows.length == 0)
                {
                    if(null_if_not_exist)
                        return null;
                    else
                        return Promise.reject(misc.makeError("User not found."));
                }
                return rows[0];

            }).catch(err => {
                err.message = "In User get:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    },

    getRandom: function (db, number, except) {
        var query = `SELECT TOP ${number} [user_id], [lng], [lat],[gcm_id] FROM [${table_name}]
            WHERE [user_id] != ${except} ORDER BY rand()`;
        return db.request().query(query)
            .then(result => {
                return result.recordset;
            });

    },
    
    getRandomWithNoBalloon: function (db, number, balloon_id, except) {
        var query = `SELECT TOP ${number} [user_id], [lng],[lat],[gcm_id] from [${table_name}] 
              WHERE [user_id] NOT IN(SELECT [to_user] from  [${paths_table}] WHERE [balloon_id]=${balloon_id}) 
             and [user_id] != ${except} ORDER BY newid()`;
        return db.request().query(query)
            .then(result => {
                return result.recordset;
            }).catch(err => {
                err.message = "In User getRandom:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    },
    getReceivedBalloon: function (db, user_id, balloon_id) {
        var query = `SELECT * FROM [${paths_table}]
                WHERE [to_user] = ${user_id} AND [balloon_id] = ${balloon_id}`;
        return db.request().query(query)
            .then(result => {
                if(result.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("User didn't receive this balloon"));
                return result.recordset[0];
            }).catch(err => {
                err.message = "In User getReceivedBalloon:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    },

    getGCMIdForBalloonOwner: function (db, balloon_id) {
        var query = `SELECT [gcm_id] FROM [${table_name}] [us]
                    INNER JOIN [${balloon_table}] [ba]
                        ON [balloon_id] = ${balloon_id} and [ba].[user_id] = [us].[user_id]`;
        return db.request().query(query)
            .then(result => {
                if(result.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("Error in gcm query"));
                return result.recordset[0];
            }).catch(err => {
                err.message = "In User getGCMIdForBalloonOwner:  \n" + query +"\n\n" + err.message;
                throw err;
            });
    }



};


module.exports = User;
