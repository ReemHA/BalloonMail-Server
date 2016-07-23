var logger = require("../utils/logger");
module.exports = function (req, res, next) {

    logger.log("debug",'Request %s %s \n: %j',req.method, req.url, req.body, {});
    next();
};