var db = require("../models/database");
var logger = require("../utils/logger");
var misc = require("../utils/misc");

module.exports = function (req, res, next) {
    req.db = db.get_pool();
    next();
};
