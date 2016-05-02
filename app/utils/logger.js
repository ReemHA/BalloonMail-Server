var winston = require('winston');
winston.emitErrs = true;

var log_location = process.env.OPENSHIFT_LOG_DIR || "./logs/";
var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'debug',
            json:false,
            filename: log_location + 'all-logs.log',
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        })
    ],
    exitOnError: false
});
winston.level = 'debug';
module.exports = process.env.OPENSHIFT_LOG_DIR ? logger:winston;
module.exports.stream = {
    write: function(message, encoding){
        module.exports.info(message);
    }
};