var winston = require('winston');
winston.emitErrs = false;
var path = require("path");
var log_location =path.join(__dirname, "..","..");
var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'debug',
            json:false,
            filename: log_location + 'all-logs.log',
            maxsize: 5242880, //5MB
            maxFiles: 30,
            colorize: false,
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
module.exports = process.env.OPENSHIFT_LOG_DIR ? logger:localLogger;
module.exports.stream = {
    write: function(message, encoding){
        module.exports.info(message);
    }
};