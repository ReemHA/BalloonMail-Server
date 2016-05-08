var mysql = require("promise-mysql");
var config = require("../config");
var pool =  mysql.createPool({
    connectionLimit : 30,
    host            : config.database.host,
    port            : config.database.port,
    user            : config.database.user,
    password        : config.database.pass,
    database        : config.database.name,
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings : true

});

module.exports.get = pool.getConnection;
module.exports.pool = pool;