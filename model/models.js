var mongoose = require('mongoose');

var Apartment = mongoose.model('apartment', {
    id: String, // id of the entry, with the source it makes PK
    url: String, // url that the entry can be found on
    source: String, // Avito, IRR or whatever, where it was parsed from
    description: String,
    district: String,
    address: String,
    rooms: Number,
    area: Number,
    floor: String,
    price: Number,
    parsedAt: Date,
    createdAt: Date,
    isDuplicate: Boolean,
    duplicates: [{
        id: String,
        source: String,
        url: String,
        price: Number,
        createdAt: Date,
        createdAtStr: String
    }],
    // js calculated fields
    createdAtStr: String
});

exports.Apartment = Apartment;