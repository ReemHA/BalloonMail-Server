var winston = require('winston');
winston.emitErrs = true;

var log_location = process.env.OPENSHIFT_LOG_DIR || "./logs/";
var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'debug',
            filename: log_location + 'all-logs.log',
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};