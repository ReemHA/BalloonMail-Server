var winston = require('winston');
winston.emitErrs = false;
var path = require("path");
var fs = require('fs');
var log_location = path.join(process.env.HOME,"LogFiles");
if (!fs.existsSync(log_location)){
    fs.mkdirSync(log_location);
}


var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'debug',
            json:false,
            filename: path.join(log_location, 'all-logs.log'),
            maxsize: 5242880, //5MB
            maxFiles: 30,
            colorize: false,
            handleExceptions: true,
            humanReadableUnhandledException: true
        }),
        new winston.transports.Console({
            level: 'debug',
            json:false,
            colorize: true,
            handleExceptions: true,
            humanReadableUnhandledException: true
        })
    ],
    exitOnError: false,
    emitErrs: false
});
logger.level = "warn";

var localLogger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            json:false,
            colorize: true,
            handleExceptions: true,
            humanReadableUnhandledException: true
        })
    ],
    exitOnError: false,
    emitErrs: false
});
localLogger.level = "debug";
module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        module.exports.info(message);
    }
};