var express = require('express');
var router = express.Router();
var avito = require('../modules/avito');
var uds18 = require('../modules/uds18');
var irr = require('../modules/irr');
var stat = require('../modules/stat');
var models = require('../model/models');

function cleanUpDupes() {
    models.Apartment.aggregate({
        $group: {_id: {address: '$address', rooms: '$rooms', area: '$area'}, newestCreatedAt: {$max: '$createdAt'}}
    }, function (errors, lastAll) {
        if (errors) return console.error("FIND DUPLICATES error", errors);
        for (var i = 0; i < lastAll.length; i++) {
            (function (i, lastOne) {
                // update the same ones and unite duplicates
                models.Apartment.find({
                    address: lastOne._id.address,
                    rooms: lastOne._id.rooms,
                    area: lastOne._id.area
                }, function (errors, theSameOnes) {
                    if (errors) return console.error("SET DUPLICATES error", errors);
                    var duplicates = [];
                    var root = null;
                    for (var j = 0; j < theSameOnes.length; j++) {
                        var d = theSameOnes[j];
//                        if (d.address.indexOf('Союзная ул') >= 0) {
//                            console.log(lastOne,j + "--->>>", d.id, d.address, d.rooms, d.area);
//                        } else return;
                        if (Math.abs(new Date(d.createdAt).getTime() - new Date(lastOne.newestCreatedAt).getTime()) < 60 * 1000
                            && !root) {
                            root = d;
                        } else {
                            d.isDuplicate = true;
                            d.duplicates = null; // reset the duplicates in the case if it was root before
                            models.Apartment.remove({id: d.id})
                            d.save();

                            var dup = {
                                id: d.id,
                                source: d.source,
                                url: d.url,
                                price: d.price,
                                floor: d.floor,
                                createdAt: d.createdAt
                            };
                            duplicates.push(dup);
                        }
                    }
                    if (root) {
                        root.isDuplicate = false;
                        root.duplicates = duplicates;
                        models.Apartment.remove({id: root.id})
                        root.save();
                    } else {
                        console.error("LOST ROOT", i, lastOne, theSameOnes);
                    }
                });
            })(i, lastAll[i])
        }
    });
}


router.get('/', function (req, res) {
//    avito.parse(req, res);
//    uds18.parse(req, res);
    irr.parse(req, res);
    res.send("Started");
});

router.get('/stat', function (req, res) {
    stat.parse(req, res);
});

router.get('/cleanUpDupes', function (req, res) {
    // check for duplicates
    cleanUpDupes();
    res.send('Clean Up Started');
});

module.exports = router;

