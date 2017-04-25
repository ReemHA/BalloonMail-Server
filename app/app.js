var express = require('express');
var logger = require('./utils/logger');
var bodyParser = require('body-parser');
var database = require("./models/database");
var misc = require("./utils/misc");
var response_time = require("response-time");
var config = require("./config");


//setup express
var app = express();

// var jwt = require("jsonwebtoken");
// console.log(jwt.sign({}, config.secret, {subject:4}));



app.use(bodyParser.json());
app.use(response_time((req,res,time) =>{
        logger.debug("Timing [" +req.url+"]:  " + time);
}));

//set required initial database data if not already there
database.initialize()
    .then(() => {
        logger.info("Created and connected to database.");
    })
    .catch( error => {
        error.message = "Couldn't create or connect to database [" + error.message + "] ";
        misc.logError(error);
    });


//--- routes ---//
app.use("/token",require("./routes/tokens"));
app.use("/balloons",require("./routes/balloons"));
app.use("/refresh_token",require("./routes/refresh_token"));
 

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = misc.makeError('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
app.use(function(err, req, res, next) {
    if(err.custom)
    {
        res.json({error:err.message});
    }
    else {
        misc.logError(err, true);
        res.json({error:"Internal server error."});
    }

});



module.exports =app;
