var moment = require("moment");

var ex = module.exports;

ex.getDateUTC = function () {
    return moment.utc().format("YYYY-MM-DD HH:mm:ss");
};