var jwt = require("jsonwebtoken");
var config = require("../config");



module.exports = function (req, res, next) {
    //check right headers exist
    if (req.headers && req.headers.authorization) {
        //split authorization header searching for "Bearer token"
        var parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            var token = parts[1];

            jwt.verify(token, config.secret, function (err, payload) {
                if(err)
                {
                    console.log("Authorizing: " + err.message);
                    return next(new Error("Unauthorized access."));
                }
                //success add user id to req object and call next
                req.user_id = payload.sub;
                next();
            });
            return;
        }

    }

    console.log("Couldn't find authorization Bearer in head.");
    next(new Error("Couldn't find api token in request."))
};
