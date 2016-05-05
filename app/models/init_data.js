
var Counter = require("./counter");
var Group = require("./group");
module.exports = function()
{
    //create groups counter
    Counter.update(
        {for: Counter.groups_counter_name},
        {$setOnInsert:
            {
                for: Counter.groups_counter_name,
                current_group_id: 1,
                count: 0
            }
        },
        {upsert: true},
        function(err) {
            if(!err)
            {
                Group.update(
                    {group_id: 1},
                    {$setOnInsert: {group_id: 1}},
                    {upsert: true},
                    function() {}
                );
            }
        }
    );

};