var misc = require("../utils/misc");
var Promise = require("bluebird");
var table_name = "user";
var paths_table="paths";
var sql = require("mssql");


var User = {
    findByGoogleId: function (db, google_id) {

        return db.request().query(`SELECT [user_id] FROM ${table_name} WHERE [google_id]=${google_id}`)
            .then(function (data) {
                var rows = data.recordset;
                if(rows.length == 0)
                    return null;
                else
                    return rows[0];
            });
            
    },
    
    updateLocation: function (db, user_id, lng, lat, gcm_id) {

        return db.request().query(`
        UPDATE [${table_name}] SET [lng]=${lng},[lat]= ${lat}, [gcm_id]=${gcm_id}  WHERE [user_id]=${user_id}`);
    },
    updateGCMID: function (db, user_id, gcm_id) {
        return db.request().query(`UPDATE [${table_name}] SET [gcm_id]:${gcm_id} WHERE [user_id]=${user_id}`);
    },
    
    createWithGoogleId: function (db, name, google_id, lng, lat, gcm_id) {
        return db.request().query(`INSERT INTO [${table_name}] SET [name]= '${name}', [google_id]= ${google_id}, [lng]=${lng},
            [lat]=${lat}, [gcm_id]=${gcm_id}, [created_at]= '${misc.getDateUTC()}'; SELECT @@IDENTITY AS id`)
            .then(function (results) {
                return {user_id: results.recordset[0].id, name: name};
            })
    },

    get: function (db, id, null_if_not_exist) {
        return db.request().query(`SELECT [user_id], [lng],[lat],[gcm_id] FROM [${table_name}] where [user_id]=${id}`)
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

            })
    },

    getPositionObjectFromUsers : function(users){
        var positions = {};
        for(var i = 0; i < rows.length;i++)
        {
            var usr = users[i];
            positions[usr.user_id] = {lng: usr.lng, lat:usr.lat};
        }
        return positions;
    },

    getRandom: function (db, number, except) {
        return db.request().query(`SELECT TOP ${number} [user_id], [lng], [lat],[gcm_id] FROM [${table_name}]
            WHERE [user_id] != ${except} ORDER BY rand() `);

    },
    
    getRandomWithNoBalloon: function (db, number, balloon_id, except) {
        return db.request().query(`SELECT TOP ${number} [user_id], [lng],[lat],[gcm_id] from [${table_name}] 
             WHERE [user_id] NOT IN (
             SELECT [to_user] from  ${paths_table} WHERE [balloon_id]=${balloon_id}) 
             AND [user_id] != ${except} ORDER BY rand() `)
    },
    getReceivedBalloon: function (db, user_id, balloon_id) {
        return db.request().query(`SELECT * FROM [${paths_table}]
                WHERE [to_user] = ${user_id} AND [balloon_id] = ${balloon_id}`)
            .then(result => {
                if(result.rowsAffected[0] < 1)
                    return Promise.reject(misc.makeError("User didn't receive this balloon"));
                return result.recordset[0];
            })
    }


};


module.exports = User;