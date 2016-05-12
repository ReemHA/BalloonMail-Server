var auth = require("./auth");
var pipe = require("./pipe");
var db = require("./database");
var db_check = require("./check_database");
module.exports = [pipe, db_check, auth, db];
