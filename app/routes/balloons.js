var express = require('express');
var router = express.Router();
var Balloon = require("../models/balloon");
var config = require("../config");



router.post("/create", function (req, res, next) {
    var text = req.body.text;
    if(!text)
    {
        next(new Error("text field not found in request."));
        return;
    }

    

});



module.exports = router;