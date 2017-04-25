var sql = require("mssql");
var config = require("../config");
var fs = require("fs");
var Promise = require("bluebird");
var config = require("../config");
var misc = require("../utils/misc");

var db = {
    is_connected: false,
    pool: null,
};
exports.initialize = function () {
    var init_script, tables_script;
    return Promise.promisify(fs.readFile, fs)(config.database.schema_file, "utf-8")
        .then(data => {
            data = data.replace(/\$db_name\$/g, config.database.name);
            [init_script, tables_script] = data.split("--- __END__INIT ---");
            var tmp_pool = new sql.ConnectionPool({
                user: config.database.user,
                password: config.database.pass,
                server: config.database.server,
                pool: {
                    max: 1,
                    min: 1,
                    idleTimeoutMillis: 30000
                }
            });
            tmp_pool.on("error", err => {
                err.message = "Emmited from database [" + err.message + "]";
                misc.logError(err)
            });
            return tmp_pool.connect()
                .then(() => { return tmp_pool.request().query(init_script)
                })
                .then(() => {
                    return tmp_pool.request().query(tables_script)
                })
                .then(()=> {
                    return tmp_pool.close();
                })
                .then(() => {
                    db.pool = new sql.ConnectionPool({
                        user: config.database.user,
                        password: config.database.pass,
                        server: config.database.server,
                        pool: config.database.pool,
                        database:  config.database.name,
                        options: {
                            database: config.database.name
                        }
                    });
                    db.pool.on("error", err => {
                        err.message = "Emmited from database [" + err.message + "]";
                        misc.logError(err)
                    });
                   return db.pool.connect()
                }).then(() => {
                    db.is_connected = true;
                })

        })
};

exports.database_up = function () {
    return db.is_connected;
};

exports.get_pool = function () {
    return db.pool;
};