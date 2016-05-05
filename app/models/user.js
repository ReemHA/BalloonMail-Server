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
    Group.addUser()
        .then(function(group_id)
        {
            doc.group_id = group_id;
        })
        .catch(function (err) {
           next(err);
        });

});


var User = mongoose.model('User', userSchema);



module.exports = User;