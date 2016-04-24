var mongoose = require('mongoose');
var Schema = mongoose.Schema;



var userSchema = new Schema({
    name: {type: String, required: true},
    google_id: {type:String, unique:true }
}, {
        timestamp:true
});

//methods



var User = mongoose.model('User', userSchema);

module.exports = User;