var express = require('express');
var models = require('../model/models');
var moment = require('moment')
var router = express.Router();

router.get('/', function (req, res) {

    // check for duplicates
    // TODO move it somewhere to the parse stage
    models.Apartment.aggregate({
        $group: {_id: {address: '$address', rooms: '$rooms', area: '$area'}, newestCreatedAt: {$max: '$createdAt'}}
    }, function (errors, lastAll) {
        if (!req.query.cleanDupes) return;
        if (errors) return console.error("FIND DUPLICATES error", errors);
        for (var i = 0; i < lastAll.length; i++) {
            var lastOne = lastAll[i];
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
                    if (new Date(d.createdAt).getTime() - new Date(lastOne.newestCreatedAt).getTime() < 60 * 1000) {
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
                            createdAt: d.createdAt
                        };
                        duplicates.push(dup);
                    }
                }
                if (root) {
                    console.log("found duplicates", root, duplicates);
                    root.isDuplicate = false;
                    root.duplicates = duplicates;
                    models.Apartment.remove({id: root.id})
                    root.save();
                    console.log(root);
                } else {
                    console.error("LOST ROOT", i, lastOne._id.address, lastOne._id.rooms, lastOne._id.area, lastOne.newestCreatedAt, theSameOnes);
                }
            });
        }
    });

    // list non-duplicates
    models.Apartment.find({
        '$or': [
            {isDuplicate: false},
            {isDuplicate: null}
        ]
    })
        .sort({createdAt: -1})
        .exec(function (errors, l) {
        if (errors) return console.error("LIST error", errors);
            for (var i = 0; i < l.length; i++) {
                l[i].createdAtStr = moment(new Date(l[i].createdAt)).format("DD MMMM YY");
                for (var j = 0; j < l[i].duplicates.length; j++) {
                    l[i].duplicates[j].createdAtStr = moment(new Date(l[i].duplicates[j].createdAt)).format("DD MMMM YY");
                }
            }
        res.render('list', {
            apartments: l
        });
    });
});

module.exports = router;
