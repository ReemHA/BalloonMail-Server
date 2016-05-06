
var Counter = require("./counter");
var Group = require("./group");
module.exports = function()
{
    //create groups counter
    Counter.update(
        {for: Group.counter_name},
        {$setOnInsert:
            {
                for: Group.counter_name,
                count: 0
            }
        },
        {upsert: true},
        function(err) {
        }
    );

};