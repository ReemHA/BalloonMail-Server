var mongoose = require('mongoose');
var Schema = mongoose.Schema;



var balloonSchema = new Schema({
    text: {type: String, required: true},
    user_id: {type: Schema.Types.ObjectId, index: true},
    created: {type: Date, default: Date.now},
    creeps: {type: Number, default: 0},
    refills: {type: Number, default: 0},
    reach: {type: Number, default: 0}
});

//methods



var Balloon = mongoose.model('Balloon', balloonSchema);

module.exports = Balloon;