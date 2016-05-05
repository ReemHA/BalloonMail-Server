var express = require('express');
var router = express.Router();
var User = require("../models/user");
var jwt = require("jsonwebtoken");
var config = require("../config");
//google auth
var GoogleOAuth2 = require("google-auth-library").prototype.OAuth2;
var googleOauth = new GoogleOAuth2();


//google
router.post("/google", function (req, res, next) {
    var token = req.body.access_token;
    var name = req.body.user_name;
    //check for token in post body
    if(!token)
    {
        console.log("access_token field not found in POST body");
        return next(new Error("access_token field not found in POST body"));
    }
    //check for user name in post body
    if(!name)
    {
        console.log("user_name field not found in POST body");
        return next(new Error("user_name field not found in POST body"));
    }

    //verify the token
    googleOauth.verifyIdToken(token,config.android_client_id,function(err, login){
        //is there an error in verification?
        if(err)
        {
            console.log(err.message);
            return next(new Error("Couldn't verify token."));
        }

        //get the subject from the token
        var id = login.getPayload().sub;
        //try to search in our database for the token
        User.findOne({google_id: id}, function (err, user) {
            //check if there is error while checking database
            if(err)
            {
                console.log(err.message);
                return next(new Error("Internal server error."));
            }

            //check if user exist
            if(user)
            {
                //user found create jwt and return
                res.json({result:{api_token: creatJWT(user.id)},created:false});
            }
            else
            {
                //user not found so create a new user
                var new_user = new User({
                    name: name,
                    google_id: id
                });

                //save the user to database
                new_user.save(function (err, user) {
                    //was there error while saving?
                    if(err)
                    {
                        console.log("Error saving user: " + err.message);
                        return next(new Error("Internal server error."));
                    }

                    //successfuly saved user now return the jwt token
                    res.json({result:{api_token: creatJWT(user.id), created:true}});
                })
            }
        });

    });


});

var creatJWT = function (user_id) {
    return jwt.sign({}, config.secret, {subject:user_id});
};

module.exports = router;
