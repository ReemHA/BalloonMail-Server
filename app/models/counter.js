var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var model_name = "Counter";


var counterSchema = new Schema({
    for: {type: String, required: true, unique: true},
    count: {type:Number, required:true, default: 0}
});



var Counter = mongoose.model(model_name, counterSchema);

module.exports = Counter;