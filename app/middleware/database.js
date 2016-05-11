var db = require("../models/connection");
var logger = require("../utils/logger");
var misc = require("../utils/misc");

module.exports = function (req, res, next) {
    db.get()
        .then(function (connection) {
            req.db = connection;
            next();
        })
        .catch(function (error) {
            misc.logError(error);
            next(new Error("Internal database connection error."))
        });
};
