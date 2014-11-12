var express = require('express');
var router = express.Router();
var avito = require('../modules/avito');
var uds18 = require('../modules/uds18');
var stat = require('../modules/stat');

router.get('/', function (req, res) {
    avito.parse(req, res);
    uds18.parse(req, res);
    res.send("Started");
});

router.get('/stat', function (req, res) {
    stat.parse(req, res);
});

module.exports = router;

