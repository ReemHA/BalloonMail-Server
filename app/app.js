var express = require('express');
var path = require('path');
var logger = require('./utils/logger');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var config = require("./config");
var middle = require("./middleware/middle");
var init_database = require("./models/init_data");

//setup express
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


//open database
mongoose.connection.on('error', function (err) {
    logger.info("database connection error %s", err.message);
});
mongoose.connect(config.database);

//set required initial database data if not already there
init_database();

// used by openshift cloud service
app.get("/health", function(req, res){
	res.writeHead(200);
    res.end();
});

//--- routes ---//
app.use("/token",require("./routes/tokens"));
app.use("/balloons",require("./routes/balloons"));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
app.use(function(err, req, res, next) {
    res.json({error:err.message});
});



module.exports = app;
