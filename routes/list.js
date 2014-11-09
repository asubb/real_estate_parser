var express = require('express');
var models = require('../model/models');
var moment = require('moment')
var router = express.Router();


function cleanUpDupes() {
    models.Apartment.aggregate({
        $group: {_id: {address: '$address', rooms: '$rooms', area: '$area'}, newestCreatedAt: {$max: '$createdAt'}}
    }, function (errors, lastAll) {
        if (errors) return console.error("FIND DUPLICATES error", errors);
        for (var i = 0; i < lastAll.length; i++) {
            (function (lastOne) {
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
                        if (Math.abs(new Date(d.createdAt).getTime() - new Date(lastOne.newestCreatedAt).getTime()) < 60 * 1000) {
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
                        root.isDuplicate = false;
                        root.duplicates = duplicates;
                        models.Apartment.remove({id: root.id})
                        root.save();
                    } else {
                        console.error("LOST ROOT", i, lastOne, theSameOnes);
                    }
                });
            })(lastAll[i])
        }
    });
}

function doList(callback, filter) {
    filter = filter || {};
    filter['$or'] = [
        {isDuplicate: false},
        {isDuplicate: null}
    ]
    // list non-duplicates
    models.Apartment.find(filter)
        .sort({createdAt: -1})
        .exec(function (errors, l) {
            if (errors) return console.error("LIST error", errors);
            for (var i = 0; i < l.length; i++) {
                l[i].createdAtStr = moment(new Date(l[i].createdAt)).format("DD MMMM YY");
                for (var j = 0; l[i].duplicates && j < l[i].duplicates.length; j++) {
                    l[i].duplicates[j].createdAtStr = moment(new Date(l[i].duplicates[j].createdAt)).format("DD MMMM YY");
                }
            }
            callback(l);
        });
}

router.get('/cleanUpDupes', function (req, res) {
    // check for duplicates
    cleanUpDupes();
    res.send('Clean Up Started');
});

router.get('/star', function (req, res) {
    models.Apartment.findOne({
        id: req.query.id
    })
        .exec(function (errors, a) {
            if (errors) {
                res.status(500).send("ERROR" + errors);
                return console.error("STAR error", errors);
            }
            if (!a) {
                res.status(500).send("NOT FOUND " + req.query.id);
                return console.error("STAR error", "NOT FOUND " + req.query.id);
            }
            var starred = a.starred ? false : true;
            models.Apartment.update({id: a.id}, {starred: starred}, function (e, n, r) {
                if (e) console.error("STAR error", a.id, e, n, r);
                models.Apartment.findOne({
                    id: req.query.id
                })
                    .exec(function (errors, a) {
                        if (errors) {
                            res.status(500).send("ERROR" + errors);
                            return console.error("STAR error", errors);
                        }
                        res.json(a);
                    });
            });
        });
});

router.get('/json', function (req, res) {
    doList(function (l) {
        res.json(l);
    });
});

router.get('/', function (req, res) {
    doList(function (l) {
        res.render('list', {
            apartments: l
        });
    });
});

router.get('/starred', function (req, res) {
    doList(function (l) {
        res.render('list', {
            apartments: l
        });
    }, {starred: true});
});


module.exports = router;
