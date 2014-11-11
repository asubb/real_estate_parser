var express = require('express');
var router = express.Router();
var avito = require('../modules/avito');
var stat = require('../modules/stat');

router.get('/', function (req, res) {
    avito.parse(req, res);
});

router.get('/stat', function (req, res) {
    stat.parse(req, res);
});

module.exports = router;

