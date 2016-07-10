
var db = require("promise-mysql");
var config = require("../config");
var connected = false;
module.exports = function()
{
    var connection = null;
    return db.createConnection(
            {
                host            : config.database.host,
                port            : config.database.port,
                user            : config.database.user,
                password        : config.database.pass
            }
        )
        .then(function (conn) {
            connection = conn;
            return connection.query("CREATE SCHEMA IF NOT EXISTS `balloon` DEFAULT CHARACTER SET utf8 ;");
        })
        .then(function (results) {
            return connection.query(
                "CREATE TABLE IF NOT EXISTS `balloon`.`user` (\n"+
                    "`user_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,\n"+
                    "`name` VARCHAR(100) NOT NULL,\n"+
                    "`email` VARCHAR(100) NULL DEFAULT NULL,\n"+
                    "`password` VARCHAR(100) NULL DEFAULT NULL,\n"+
                    "`google_id` VARCHAR(30) NULL DEFAULT NULL,\n"+
                    "`facebook_id` VARCHAR(30) NULL DEFAULT NULL,\n"+
                    "`twitter_id` VARCHAR(45) NULL DEFAULT NULL,\n"+
                    "`created_at` DATETIME NOT NULL,\n"+
                    "`lng` DECIMAL(9,6) NULL DEFAULT NULL,\n"+
                    "`lat` DECIMAL(8,6) NULL DEFAULT NULL,\n"+
                    "`gcm_id` VARCHAR(35) NOT NULL,\n"+
                    "PRIMARY KEY (`user_id`),\n"+
                    "UNIQUE INDEX `google_id_UNIQUE` (`google_id` ASC),\n"+
                    "UNIQUE INDEX `facebook_id_UNIQUE` (`facebook_id` ASC),\n"+
                    "UNIQUE INDEX `twitter_id_UNIQUE` (`twitter_id` ASC),\n"+
                    "UNIQUE INDEX `email_UNIQUE` (`email` ASC))\n"+
                "ENGINE = InnoDB\n"+
                "DEFAULT CHARACTER SET = utf8;\n");
        })
        .then(function (results) {
            return connection.query(
                "CREATE TABLE IF NOT EXISTS `balloon`.`balloons` (\n"+
                    "`balloon_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\n"+
                    "`user_id` INT UNSIGNED NOT NULL,\n"+
                    "`text` VARCHAR(3000) NOT NULL,\n"+
                    "`refills` INT UNSIGNED NOT NULL DEFAULT 0,\n"+
                    "`creeps` INT UNSIGNED NOT NULL DEFAULT 0,\n"+
                    "`reach` FLOAT UNSIGNED NOT NULL DEFAULT 0,\n"+
                    "`sent_at` DATETIME(0) NOT NULL,\n"+
                    "`rank` INT UNSIGNED NOT NULL DEFAULT 0,\n"+
                    "`sentiment` FLOAT NOT NULL DEFAULT 0,\n"+
                    "`lng` DECIMAL(9,6) NULL DEFAULT NULL,\n"+
                    "`lat` DECIMAL(8,6) NULL DEFAULT NULL,\n"+
                    "`in_flight` INT UNSIGNED NOT NULL,\n"+
                    "PRIMARY KEY (`balloon_id`),\n"+
                    "INDEX `balloon_user_idx` (`user_id` ASC),\n"+
                    "INDEX `sent_date` (`user_id` ASC, `sent_at` ASC),\n"+
                    "CONSTRAINT `balloon_user`\n"+
                        "FOREIGN KEY (`user_id`)\n"+
                        "REFERENCES `balloon`.`user` (`user_id`)\n"+
                        "ON DELETE RESTRICT\n"+
                        "ON UPDATE RESTRICT)\n"+
                "ENGINE = InnoDB;\n"
            );
        })
        .then(function (results) {
            return connection.query(
                "CREATE TABLE IF NOT EXISTS `balloon`.`paths` (\n"+
                "`path_id` BIGINT(0) UNSIGNED NOT NULL AUTO_INCREMENT,\n"+
                "`balloon_id` INT UNSIGNED NOT NULL,\n"+
                "`from_user` INT UNSIGNED NOT NULL,\n"+
                "`from_lat` DECIMAL(8,6) NULL,\n"+
                "`from_lng` DECIMAL(9,6) NULL,\n"+
                "`to_user` INT UNSIGNED NOT NULL,\n"+
                "`to_lat` DECIMAL(8,6) NULL,\n"+
                "`to_lng` DECIMAL(9,6) NULL,\n"+
                "`sent_at` DATETIME(0) NOT NULL,\n"+
                "`to_refilled` BOOL NOT NULL DEFAULT false,\n"+
                "`to_liked` BOOL NOT NULL DEFAULT false,\n"+
                "`to_creeped` BOOL NOT NULL DEFAULT false,\n"+

                "PRIMARY KEY (`path_id`),\n"+
                "INDEX `path_balloons_idx` (`balloon_id` ASC),\n"+
                "INDEX `sending_user_idx` (`from_user` ASC),\n"+
                "INDEX `receiving_user_idx` (`to_user` ASC),\n"+
                "INDEX `receive_date` (`to_user` ASC, `sent_at` ASC),\n"+
                "UNIQUE INDEX `receive_once` (`balloon_id` ASC, `to_user` ASC),\n"+
                "CONSTRAINT `liked_balloons`\n"+
                    "FOREIGN KEY (`balloon_id`)\n"+
                    "REFERENCES `balloon`.`balloons` (`balloon_id`)\n"+
                    "ON DELETE RESTRICT\n"+
                    "ON UPDATE RESTRICT,\n"+
                "CONSTRAINT `sending_user`\n"+
                    "FOREIGN KEY (`from_user`)\n"+
                    "REFERENCES `balloon`.`user` (`user_id`)\n"+
                    "ON DELETE RESTRICT\n"+
                    "ON UPDATE RESTRICT,\n"+
                "CONSTRAINT `receiving_user`\n"+
                    "FOREIGN KEY (`to_user`)\n"+
                    "REFERENCES `balloon`.`user` (`user_id`)\n"+
                    "ON DELETE RESTRICT\n"+
                    "ON UPDATE RESTRICT)\n"+
                "ENGINE = InnoDB;\n"
            );
        })
        .then(function (results) {
            return connection.query(
                "CREATE TABLE IF NOT EXISTS `balloon`.`likes` (\n"+
                    "`balloon_id` INT UNSIGNED NOT NULL,\n"+
                    "`user_id` INT UNSIGNED NOT NULL,\n"+
                    "`liked_at` DATETIME(0) NOT NULL,\n"+

                    "PRIMARY KEY (`balloon_id`, `user_id`),\n"+
                    "INDEX `likes_users_idx` (`user_id` ASC),\n"+
                    "CONSTRAINT `liked_balloon`\n"+
                        "FOREIGN KEY (`balloon_id`)\n"+
                        "REFERENCES `balloon`.`balloons` (`balloon_id`)\n"+
                        "ON DELETE RESTRICT\n"+
                        "ON UPDATE RESTRICT,\n"+
                    "CONSTRAINT `liking_users`\n"+
                        "FOREIGN KEY (`user_id`)\n"+
                        "REFERENCES `balloon`.`user` (`user_id`)\n"+
                        "ON DELETE RESTRICT\n"+
                        "ON UPDATE RESTRICT)\n"+
                "ENGINE = InnoDB;\n"
            );
        })
        .then(function (results) {
            return connection.query(
                "CREATE TABLE IF NOT EXISTS `balloon`.`creeps` (\n"+
                    "`balloon_id` INT UNSIGNED NOT NULL,\n"+
                    "`user_id` INT UNSIGNED NOT NULL,\n"+
                    "`creeped_at` DATETIME(0) NOT NULL,\n"+

                    "PRIMARY KEY (`balloon_id`, `user_id`),\n"+
                    "INDEX `creep_users_idx` (`user_id` ASC),\n"+
                    "CONSTRAINT `creeped_balloons`\n"+
                        "FOREIGN KEY (`balloon_id`)\n"+
                        "REFERENCES `balloon`.`balloons` (`balloon_id`)\n"+
                        "ON DELETE RESTRICT\n"+
                        "ON UPDATE RESTRICT,\n"+
                    "CONSTRAINT `creeping_users`\n"+
                        "FOREIGN KEY (`user_id`)\n"+
                        "REFERENCES `balloon`.`user` (`user_id`)\n"+
                        "ON DELETE RESTRICT\n"+
                        "ON UPDATE RESTRICT)\n"+
                "ENGINE = InnoDB;\n"

            );
        })
        .then(function () {
            connected = true;
        })
        .finally(function () {
            if(connection)
            {
                connection.end();
            }
        })
    ;

};

module.exports.database_up = function () {
    return connected;
};