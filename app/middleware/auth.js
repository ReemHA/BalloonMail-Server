var jwt = require("jsonwebtoken");
var config = require("../config");
var logger = require("../utils/logger");
var misc = require("../utils/misc");


module.exports = function (req, res, next) {
    //check right headers exist
    if (req.headers && req.headers.authorization) {
        //split authorization header searching for "Bearer token"
        var parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            var token = parts[1];
            logger.debug("Authorizing token: " + token);
            jwt.verify(token, config.secret, function (err, payload) {
                if(err)
                {
                    misc.logError(err);
                    logger.debug("Authorizing: " + err.message);
                    return next(misc.makeError("Unauthorized access"));
                }
                //success add user id to req object and call next
                req.user_id = payload.sub;
                next();
            });
            return;
        }

    }

    logger.debug("Couldn't find authorization Bearer in head.");
    next(misc.makeError("Couldn't find api token in request."))
};
