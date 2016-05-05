var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Counter = require("./counter");
var config = require("../config");


var groupSchema = new Schema({
    group_id: {type: Number, required: true, unique: true}
});

//methods
groupSchema.methods.isLast = function (cb) {
    Counter.getLastGroupId(function (err, counter) {
        var result = null;
        if(!err)
        {
           result = counter.current_group_id == this.group_id;
        }

        cb(err, result);
    });
};

groupSchema.statics.addUser = function (cb) {
    //update current group by 1 and retrieve the new vount
    var promise =  Counter.findOneAndUpdate(
            {for: Counter.groups_counter_name},
            {$inc: {count: 1}},
            {new: true}
        ).exec();

    promise
        .then(function(counter)
        {
            //if counter is greater than one
            if(counter.count > config.group_limit)
            {

            }

        })
        .catch(function (err) {
            cb(err)
        })

};



var Group = mongoose.model('Group', groupSchema);

module.exports = Group;
