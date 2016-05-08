var misc = require("../utils/misc");
var Promise = require("promise");
var table_name = "user";

var User = {
    findByGoogleId: function (db, google_id) {
        return db.query("SELECT `user_id` FROM ?? WHERE ?",[table_name, {google_id: google_id}])
            .then(function (rows) {
                if(rows.length == 0)
                    return null;
                else
                    return rows[0];
            });
    },
    
    createWithGoogleId: function (db, name, google_id) {
        return db.query("INSERT INTO ?? SET ?",
            [table_name, {name: name, google_id: google_id, created_at: misc.getDateUTC()}])
            .then(function (results) {
                if(results.affectedRows == 1)
                    return {user_id: results.insertId, name: name};
                else
                {
                    var error = new Error("Unknown error while inserting: affectedRows="+results.affectedRows);
                    error.status = -1;
                    return Promise.reject(error);
                }
            })
    }

};


module.exports = User;