var mongoose = require('mongoose');

var connString = 'mongodb://localhost:27017/rep';
mongoose.connect(connString);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log("Connected to " + connString);
});
