var mongoose = require("mongoose");

var ex = module.exports;

ex.getID = function (string_id) {
    return mongoose.Types.ObjectId(string_id);
};