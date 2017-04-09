var logger = require("../utils/logger");
var misc = require("../utils/misc");
var app = require("../models/database");

module.exports = function (req,res,next) {
    if(!app.database_up())
    {
        next(misc.makeError("Database is not up."));
    }
    else
    {
        next();
    }
};

