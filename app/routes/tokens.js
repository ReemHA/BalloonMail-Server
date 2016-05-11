var express = require('express');
var router = express.Router();
var User = require("../models/user");
var jwt = require("jsonwebtoken");
var config = require("../config");
var logger = require('../utils/logger');
//google auth
var GoogleOAuth2 = require("google-auth-library").prototype.OAuth2;
var googleOauth = new GoogleOAuth2();
//database connection middleware
var pipe = require("../middleware/pipe");
var db_middleware = require("../middleware/database");
var misc = require("../utils/misc");

//google
router.post("/google",pipe, db_middleware, function (req, res, next) {
    var token = req.body.access_token;
    var name = req.body.user_name;
    //check for token in post body
    if(!token)
    {
        logger.debug("access_token field not found in POST body");
        return next(misc.makeError("access_token field not found in POST body"));
    }
    //check for user name in post body
    if(!name)
    {
        logger.debug("user_name field not found in POST body");
        return next(misc.makeError("user_name field not found in POST body"));
    }

    //verify the token
    googleOauth.verifyIdToken(token,config.web_client_id,function(err, login){
        //is there an error in verification?
        if(err)
        {
            logger.debug(err.message);
            return next(misc.makeError("Couldn't verify token."));
        }

        //get the subject from the token
        var id = login.getPayload().sub;
        //try to search in our database for the token
        
        var conn = req.db;
        User.findByGoogleId(conn, id)
            .then(function(user){
                //check if user exist
                if(user)
                {
                    //user found create jwt and return
                    res.json({api_token: creatJWT(user.user_id),created:false});
                }
                else
                {
                    //save the user to database
                    return User.createWithGoogleId(conn, name, id)
                        .then(function(user) {
                            res.json({api_token: creatJWT(user.user_id), created:true});
                        })
                }
            })
            .catch(function(err){
                misc.logError(err);
                next(misc.makeError("Internal server error."));
            })
            .finally(function () {
                conn.connection.release();
            })
        ;

    });

});

router.get("/test",pipe, db_middleware, function(req,res,next){
    var id = req.query.id;
    var name = req.query.name;
    var conn = req.db;
    User.get(conn, id)
        .then(function (user) {
            if(!user)
            {
                return User.createWithGoogleId(conn, name, null)
                    .then(function(user) {
                        res.json({api_token: creatJWT(user.user_id), created:true});
                    })
            }
            else {
                //user found create jwt and return
                res.json({api_token: creatJWT(user.user_id),created:false});
            }
        })
        .catch(function (err) {
            next(err.message);
        })
        .finally(function () {
            conn.connection.release();
        })


});

var creatJWT = function (user_id) {
    return jwt.sign({}, config.secret, {subject:user_id});
};

module.exports = router;
