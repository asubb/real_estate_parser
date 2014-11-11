var express = require('express');
var router = express.Router();
var avito = require('../modules/avito')

router.get('/', function (req, res) {
    avito.parse();
    res.send("Avito parsing started...");
});

router.get('/stat', function (req, res) {
    res.send("Started");
});

module.exports = router;

