var express = require('express');
var logger = require('./utils/logger');
var bodyParser = require('body-parser');
var init_database = require("./models/init_data");
var misc = require("./utils/misc");

//setup express
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


//set required initial database data if not already there
var database_up = false;
init_database()
    .then(function (results) {
        logger.info("Created and connected to database.");
        database_up = true;
    })
    .catch(function (error) {
        misc.logError("Couldn't create or connect to database");
        misc.logError(error,true);
    });


// used by openshift cloud service
app.get("/health", function(req, res){
	res.writeHead(200);
    res.end();
});

// reject requests till database is setup
app.use(function (req,res,next) {
    if(!database_up)
    {
        next(new Error("Database is not up."));
    }
    else
    {
        next();
    }
});

//--- routes ---//
app.use("/token",require("./routes/tokens"));
app.use("/balloons",require("./routes/balloons"));


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



module.exports = app;
