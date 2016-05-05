var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var model_name = "Counter";
var groups_counter = "groups";


var counterSchema = new Schema({
    for: {type: String, required: true, unique: true},
    current_group_id: {type:Number, required: true},
    count: {type:Number, required:true, default: 0}
});

counterSchema.statics.groups_counter_name = groups_counter;

//methods
counterSchema.statics.getLastGroupId = function (cb) {
    return this.findOne({for: groups_counter},"current_group_id",cb);
};



var Counter = mongoose.model(model_name, counterSchema);

module.exports = Counter;