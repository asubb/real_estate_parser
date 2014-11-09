var express = require('express');
var models = require('../model/models');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    models.Apartment.find({source: 'Avito'}, function (errors, l) {
        if (errors) return console.error("LIST error", errors);
        res.render('list', {
            apartments: l
        });
    });
});

module.exports = router;
