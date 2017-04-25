/**
 * Module dependencies.
 */

var app = require('app/app');
var http = require('http');
var logger = require('app/utils/logger');
var misc = require("app/utils/misc");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.OPENSHIFT_NODEJS_PORT || '8080');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            misc.logError(new Error(bind + ' requires elevated privileges'));
            process.exit(1);
            break;
        case 'EADDRINUSE':
            misc.logError(new Error(bind + ' is already in use'));
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    logger.debug('Listening on ' + bind);
}
