var auth = require("./auth");
var pipe = require("./pipe");
var db = require("./database");
module.exports = [pipe, auth, db];
