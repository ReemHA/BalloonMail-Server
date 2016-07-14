var express = require('express');
var router = express.Router();
var middle = require("../middleware/middle");
var User = require("../models/user");


router.post("/",...middle, function (req, res, next) {
    var gcm_id = req.body.gcm_id;
    if(!gcm_id)
    {
        next(misc.makeError("gcm registration token field not found in request."));
        return;
    }
    User.updateGCMID(req.db, req.user_id, gcm_id)
        .then(function () {
            res.json({});
        })
        .catch(function (err) {
            misc.logError(err);
            next(misc.makeError("Internal server error."));
        })
        .finally(function () {
            conn.connection.release()
        });

});



module.exports = router;
