var jsdom = require("jsdom");
var models = require("../model/models");
var encoding = require('encoding');
var request = require('request');
var moment = require('moment');


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
    var base = 'http://www.rosrealt.ru/';

    var enc = function (b) {
        return encoding.convert(b, 'utf8', 'windows-1251') + "";
    };

    function parseDate(content) {
        var months = ["янв", "фев", "мар", "апр", "мае", "июн", "июл", "авг", "сен", "окт", "нояб", "дек"];
        var my = content.match(/(янв|фев|мар|апр|мае|июн|июл|авг|сен|окт|нояб|дек)[^\s]*\s+(\d+)/);
        var date;
        for (var i = 0; i < months.length; i++) {
            if (my[1] == months[i]) {
                date = new Date(my[2], i, 1, 12, 0, 0);
                break;
            }
        }
        return date;
    }

    var parseItems = function (items) {
        if (items.length == 0) {
            log(res, "PARSE FINISHED");
            res.end();
            return;
        }
        var item = items.pop();
        var date = parseDate(item.title);

        var scheduleNextRun = function (delay) {
            setTimeout(function () {
                parseItems(items);
            }, delay ? delay : (Math.random() * 10000 + 3000));
        }

        models.Stat.find({date: date}, function (e, s) {
            if (e) return err(res, e);
            if (!s || s.length == 0) {
                request({
                    url: item.url,
                    encoding: 'binary',
                    timeout: 60000,
                    jar: true
                }, function (error, response, body) {
                    log(res, "Analyzing " + item.url);
                    if (!error && response.statusCode == 200) {
                        jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                            if (errors) return err(res, errors);
                            var $ = window.$;
                            var $td = $("td.table2");
                            for (var i = 0; i < $td.length; i += 6) {
                                var type;
                                var typeContent = enc($td[i].innerHTML);
                                if (typeContent.indexOf('Квартиры') >= 0) {
                                    type = 'overall';
                                } else if (typeContent.indexOf('Новостройки') >= 0) {
                                    type = 'new';
                                } else if (typeContent.indexOf('Вторичный рынок') >= 0) {
                                    type = 'used';
                                } else {
                                    type = null;
                                }
                                if (type) {
                                    var price = enc($td[i + 1].innerHTML).replace(/[^\d]/g, '');

                                    log(res, moment(date).format("MMMM YYYY") + " " + type + " " + price);

                                    var stat = new models.Stat();
                                    stat.date = date;
                                    stat.type = type;
                                    stat.price = price;
                                    stat.save(function (e) {
                                        if (e) err(res, e);
                                    });
                                }
                            }
                            scheduleNextRun();
                        });
                    } else {
                        err(res, error + " " + (response ? response.statusCode : ""));
                    }
                });

            } else {
                log(res, "Skipped for " + moment(date).format("MMMM YYYY"))
                scheduleNextRun(1);
            }
        });
    };


    /** http://www.rosrealt.ru/ archive parser: http://www.rosrealt.ru/Izhevsk/cena/arhiv */
    var parsePage = function () {
        // start the new parsing
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
                    var items = [];
                    $("table ul li a").each(function (idx, itm) {
                        var link = base + itm.href.replace(/file:[\/]+(c:\/)?/, '');
                        var linkText = enc(itm.innerHTML);
                        log(res, "Found " + linkText + " on " + link);
                        items.push({url: link, title: linkText});
                    });
                    parseItems(items);
                });
            } else {
                err(res, error + "  " + (response ? response.statusCode : ""));
            }
        });
    };

    parsePage();
}

exports.parse = parse;
