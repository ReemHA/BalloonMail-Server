var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Counter = require("./counter");
var config = require("../config");


var groups_counter = "groups";

var groupSchema = new Schema({
    group_id: {type: Number, required: true, unique: true}
});

groupSchema.statics.counter_name = groups_counter;

groupSchema.statics.getLastGroupId = function () {
    return this.findOne({for: groups_counter}).exec();
};

groupSchema.methods.isLast = function () {
    return this.getLastGroupId()
        .then(function(counter){
            return Promise.from(Math.ceil(counter.count/config.group_limit) == this.group_id);
        })

};

groupSchema.statics.addUser = function () {
    //update current group by 1 and retrieve the new count
    var promise =  Counter.findOneAndUpdate(
            {for: Counter.groups_counter_name},
            {$inc: {count: 1}},
            {new: true}
        ).exec();

    return promise
        .then(function(counter)
        {
            var new_id = Math.ceil(counter.count/config.group_limit);
            //if first one then ensure that
            return Promise.from();
        });

};



var Group = mongoose.model('Group', groupSchema);

module.exports = Group;
