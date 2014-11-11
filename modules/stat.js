var jsdom = require("jsdom");
var models = require("../model/models");
var encoding = require('encoding');
var request = require('request');


var log = function (res, msg) {
    console.log("[STAT] " + msg);
    res.write("<p>[STAT] " + msg + "</p>");
};

var err = function (res, msg) {
    console.error("[STAT ERROR] " + msg);
    res.write("<p style='color:red'> [STAT ERROR] " + msg + "</p>");
    res.end();
};

var parse = function (req, res) {
    var parseRosrealtItem = function(items) {
        var item = items.pop();
    }

    /** http://www.rosrealt.ru/ archive parser: http://www.rosrealt.ru/Izhevsk/cena/arhiv */
    var parseRosrealt = function () {
        var base = 'http://www.rosrealt.ru/';
        request({
            url: 'http://www.rosrealt.ru/Izhevsk/cena/arhiv',
            encoding: 'binary',
            timeout: 60000,
            jar: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                    if (errors) return err(res, errors);
                    var $ = window.$;
                    var links = [];
                    $("table ul li a").each(function (idx, itm) {
                        var link = base + itm.href.replace(/file:[\/]+(c:\/)?/, '');
                        var linkText = encoding.convert(itm.innerHTML, 'utf8', 'windows-1251');
                        log(res, "Found " + linkText + " on " + link);
                        links.push(link);
                    });
                    res.end();
                });
            } else {
                err(res, error + "  " + (response ? response.statusCode : ""));
            }
        });
    };

    parseRosrealt();
}

exports.parse = parse;
