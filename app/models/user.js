var misc = require("../utils/misc");
var Promise = require("bluebird");
var table_name = "user";
var paths_table="paths";

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
    
    updateLocation: function (db, user_id, lng, lat) {
        return db.query("UPDATE ?? SET ? WHERE ?", [table_name, {lng: lng, lat: lat}, {user_id: user_id}]);
    },
    
    createWithGoogleId: function (db, name, google_id, lng, lat, gcm_id) {
        return db.query("INSERT INTO ?? SET ?",
            [table_name, {name: name, google_id: google_id, lng:lng, lat:lat,
                gcm_id:gcm_id, created_at: misc.getDateUTC()}])
            .then(function (results) {
                return {user_id: results.insertId, name: name};
            })
    },

    get: function (db, id) {
        return db.query("SELECT `user_id`,`lng`,`lat`,`gcm_id` FROM ?? where `user_id`=?",[table_name, id])
            .then(function (rows) {
                if(rows.length == 0)
                    return null;
                return {user_id: rows[0].user_id, lng: rows[0].lng, lat: rows[0].lat};

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
        return db.query("SELECT `user_id`, `lng`, `lat`,`gcm_id` FROM ?? WHERE `user_id` != ? ORDER BY rand() LIMIT ?",
            [table_name, except, number]);

    },
    
    getRandomWithNoBalloon: function (db, number, balloon_id, except) {
        return db.query("SELECT `user_id`, `lng`,`lat`,`gcm_id` from ?? " +
            "WHERE `user_id` NOT IN (" +
            "SELECT `to_user` from ?? WHERE ?) " +
            "AND `user_id` != ? ORDER BY rand() LIMIT ?",
            [table_name,paths_table,{balloon_id:balloon_id},except, number ]);
    }
    


};


module.exports = User;