var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var config = require("./config");
var auth = require("./middleware/auth")

//setup express
var app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//open database
mongoose.connection.on('error', function (err) {
    console.log("database connection error %s", err.message);
});
mongoose.connect(config.database);


// used by openshift cloud service
app.get("/health", function(req, res){
	res.writeHead(200);
    res.end();
});

//--- routes ---//
app.use("/token",require("./routes/tokens"));


//test route after authenticate
app.get("/test",auth, function (req, res) {
   res.json({result:{user_id:req.user_id}}) ;
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
app.use(function(err, req, res, next) {
    res.json({result:{error:err.message}});
});



module.exports = app;
