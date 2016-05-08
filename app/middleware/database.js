var db = require("../models/connection");
var logger = require("../utils/logger");

module.exports = function (req, res, next) {
    db.get()
        .then(function (connection) {
            req.db = connection;
            next();
        })
        .catch(function (error) {
            logger.error("Error in getting connection: " + error.message);
            next(new Error("Internal database connection error."))
        });
};
