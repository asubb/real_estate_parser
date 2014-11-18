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
    starred: Boolean,
    hidden: Boolean,
    isDuplicate: Boolean,
    duplicates: [{
        id: String,
        source: String,
        url: String,
        price: Number,
        floor: String,
        createdAt: Date,
        createdAtStr: String
    }],
    // js calculated fields
    createdAtStr: String,
    pricePerMeter: String,
    priceStr: String
});

var Stat = mongoose.model('statistic', {
    date: Date,
    type: String, // overall, new, used
    price: Number // in rubles per sq. meter
});

exports.Apartment = Apartment;
exports.Stat = Stat;