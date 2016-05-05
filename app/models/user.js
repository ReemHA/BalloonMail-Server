var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Group = require("./group");


var userSchema = new Schema({
    name: {type: String, required: true},
    google_id: {type:String, unique:true },
    group_id: {type:String, index: true}
}, {
        timestamp:true
});

//methods
userSchema.pre("save", function (next) {
    var doc = this;
    Group.addUser(function (err, group_id) {
        if(err)
        {
            return next(err);
        }
        doc.group_id = group_id;
        next();
    });

});


var User = mongoose.model('User', userSchema);



module.exports = User;