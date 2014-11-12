var request = require('request');
var jsdom = require("jsdom");
var models = require("../model/models");
var _ = require("underscore");


var parse = function (req, res, base, source, startPage, encoding, pageCallback, nextPageCallback, itemCallback) {

    var headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-encoding': 'gzip,deflate,sdch',
        'accept-language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'cache-control': 'no-cache',
        'cookie': 'u=1stmee8v.lqg4o6.em0occsjdh; dfp_group=81; sessid=b71a201747c8fe3655fcb69853e4d876.1415424228; v=1415517641; __utma=99926606.1087434079.1415211490.1415514483.1415517640.9; __utmb=99926606.10.10.1415517640; __utmc=99926606; __utmz=99926606.1415211490.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)',
        'pragma': 'no-cache',
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
    };

    var log = function (res, msg) {
        console.log("[" + source + "] " + msg);
        res.write("<p>[" + source + "] " + msg + "</p>");
    };

    var parseItems = function (items) {
        if (items.length == 0) {
            log(res, "PARSE ITEMS FINISHED");
            return;
        }
        log(res, "Parsing items, " + items.length + " left");
        var item = items.pop();

        var scheduleNextParse = function (delay) {
            setTimeout(function () {
                // start next parsing
                parseItems(items);
            }, delay ? delay : (Math.random() * 10000 + 3000));
        };

        models.Apartment.findOne({id: item.id, source: source}, function (err, a) {
            if (err) return console.error(err);
            if (a) {
                log(res, "skipped " + source + ": " + item.id);
                scheduleNextParse(1);
                return;
            }

            var link = base + item.url;
            request({
                url: link,
                encoding: encoding,
                timeout: 60000,
                gzip: true,
                jar: true,
                headers: headers
            }, function (error, response, body) {
                log(res, "Item page " + link);
                if (!error && response.statusCode == 200) {
                    jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                        try {
                            var $ = window.$;
                            var items = itemCallback(req, res, item, $);
                            if (!_.isArray(items)) {
                                items = [items];
                            }
                            for (var i = 0; i < items.length; i++) {
                                var it = items[i];
                                if (it.created) {
                                    var a = new models.Apartment({
                                        id: it.id,
                                        url: link,
                                        source: source,
                                        description: it.description,
                                        district: it.district,
                                        address: it.address,
                                        rooms: it.rooms,
                                        area: it.area,
                                        floor: it.floor,
                                        price: it.price,
                                        parsedAt: new Date(),
                                        createdAt: it.created
                                    });

                                    a.save();
                                    log(res, 'Saved ' + source + ': ' + it.id);
                                } else {
                                    console.warn("Can't recognize date", it.id);
                                }
                            }
                        } catch (e) {
                            console.warn("Skipped due to parse error", e, e.line, body);
                        }
                        scheduleNextParse();
                    });

                } else {
                    console.error(link, error, response ? response.statusCode : "");
                    res.write(link + " " + error + " " + (response ? response.statusCode : ""));
                }
            });
        });
    };

    var items = [];
    var parsePage = function (link) {
        request({
            url: link,
            encoding: encoding,
            timeout: 60000,
            gzip: true,
            jar: true,
            headers: headers
        }, function (error, response, body) {
            log(res, "Page " + link);
            if (!error && response.statusCode == 200) {
                jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                    try {
                        if (errors) return console.error("parse page jsdom error", errors, body);
                        var $ = window.$;

                        var ret = pageCallback(req, res, $);
                        items = items.concat(ret ? ret : []);

                        // get next link
                        var nextEl = nextPageCallback(req, res, $);
                        if (nextEl) {
                            var link = nextEl[nextEl.length == 1 ? 0 : 1].href;
                            link = link.replace(/file:[\/]+(c:)?/, '');
                            setTimeout(function () {
                                parsePage(base + link);
                            }, Math.random() * 10000 + 3000);
                        } else {
                            log(res, "---- PARSE PAGES FINISHED ----")
                            parseItems(items);
                        }
                    } catch (e) {
                        console.warn("Skipped due to parse error", e, e.line, body);
                    }
                });
            } else {
                console.error(link, error, response ? response.statusCode : "");
                res.write(link + " " + error + " " + (response ? response.statusCode : ""));
            }
        });
    };

    parsePage(base + startPage);
};


exports.parse = parse;