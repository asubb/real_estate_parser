var express = require('express');
var models = require('../model/models');
var moment = require('moment')
var router = express.Router();

function doList(callback, filter) {
    var start = new Date(new Date().getTime() - 20 * 24 * 60 * 60 * 1000);
    if (!filter) {
        filter = {};
        // list non-duplicates and visible
        filter['$and'] = [
            {$or: [
                {isDuplicate: false},
                {isDuplicate: null}
            ]},
            {$or: [
                {hidden: false},
                {hidden: null}
            ]},
            {createdAt: {$gte: start}}
        ];
    }
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
router.get('/hide', function (req, res) {
    models.Apartment.findOne({
        id: req.query.id
    })
        .exec(function (errors, a) {
            if (errors) {
                res.status(500).send("ERROR" + errors);
                return console.error("HIDE error", errors);
            }
            if (!a) {
                res.status(500).send("NOT FOUND " + req.query.id);
                return console.error("HIDE error", "NOT FOUND " + req.query.id);
            }
            var hidden = a.hidden ? false : true;
            models.Apartment.update({id: a.id}, {hidden: hidden}, function (e, n, r) {
                if (e) console.error("HIDE error", a.id, e, n, r);
                models.Apartment.findOne({
                    id: req.query.id
                })
                    .exec(function (errors, a) {
                        if (errors) {
                            res.status(500).send("ERROR" + errors);
                            return console.error("HIDE error", errors);
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

router.get('/all/json', function (req, res) {
    doList(function (l) {
        res.json(l);
    }, {});
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


router.get('/stats', function (req, res) {
    res.render('stats');
});

router.get('/stats/json', function (req, res) {
    models.Stat.find({}, function (e, l) {
        if (e) return res.status(500).send("ERROR " + e);
        res.json(l);
    })
});

function doUpdate(req, callback) {
    models.Apartment.findOne({id: req.query.id}, function (e, a) {
        var ids = a.duplicates ? a.duplicates.map(function (x) {
            return x.id
        }) : [];
        ids.push(req.query.id);
        models.Apartment.update({id: {'$in': ids}}, {address: req.query.address, area: req.query.area}, { multi: true }, function (e, n, r) {
            if (e) {
                console.error("UPDATE error", ids, e, n, r);
                callback(false);
            }
            console.log("UPDATE made " + n + "pcs", r);
            callback(true);
        });

    });
}
router.get('/update', function (req, res) {
    doUpdate(req, function (success) {
        res.redirect('/list#' + req.query.id);
    });
});

router.get('/update/json', function (req, res) {
    doUpdate(req, function (success) {
        res.status(success ? 200 : 500).send(success ? 200 : 500);
    });
});

module.exports = router;
