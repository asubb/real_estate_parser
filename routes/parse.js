var express = require('express');
var router = express.Router();
var request = require('request');
var jsdom = require("jsdom");
var models = require("../model/models");

var parseAvito = function () {
    var source = "Avito";

    var headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-encoding': 'gzip,deflate,sdch',
        'accept-language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'cache-control': 'no-cache',
        'cookie': 'u=1stmee8v.lqg4o6.em0occsjdh; dfp_group=81; sessid=b71a201747c8fe3655fcb69853e4d876.1415424228; v=1415517641; __utma=99926606.1087434079.1415211490.1415514483.1415517640.9; __utmb=99926606.10.10.1415517640; __utmc=99926606; __utmz=99926606.1415211490.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)',
        'pragma': 'no-cache',
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
    };

    var base = "";
    var parseItems = function (items) {
        if (items.length == 0) {
            console.log("---- PARSE ITEMS BUNCH FINISHED ----");
            return;
        }
        var item = items.pop();

        var scheduleNextParse = function (delay) {
            setTimeout(function () {
                // start next parsing
                parseItems(items);
            }, delay ? delay : Math.random() * 10000 + 3000);
        }

        models.Apartment.findOne({id: item.id, source: source}, function (err, a) {
            if (err) return console.error(err);
            if (a) {
                console.log("skipped Avito: " + item.id);
                scheduleNextParse(0);
                return;
            }

            var link = base + item.url;
            request({
                url: link,
                encoding: 'utf8',
                timeout: 60000,
                gzip: true,
                jar: true,
                headers: headers
            }, function (error, response, body) {
                console.log("Item page " + link);
                if (!error && response.statusCode == 200) {
                    jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                        try {
                            if (errors) return console.error("parse item jsdom error", errors);
                            var $ = window.$;
                            var p = $("h1[itemprop=name]")[0].innerHTML.match(/(\d+)[^,]+,\s(\d+)[^,]+,\s(\d+\/\d+)/);
                            var rooms;
                            var area;
                            var floor;
                            if (!p) {
                                // another case "Студия, 36 м², 5/10 эт."
                                p = $("h1[itemprop=name]")[0].innerHTML.match(/[^,]+,\s(\d+)[^,]+,\s(\d+\/\d+)/);
                                rooms = 0.5;
                                area = p[1];
                                floor = p[2];
                            } else {
                                rooms = p[1];
                                area = p[2];
                                floor = p[3];
                            }
                            var price = $(".description__price .description_price span[itemprop=price]")[0].innerHTML.replace(/[^\d]+/g, "");

                            var address = $(".description_content_company[itemprop=address] span[itemprop=streetAddress]")[0].innerHTML;
                            var district = $(".description_content_company[itemprop=address] span")[0].innerHTML.match(/[^,]+/)[0].split(" ")[1];
                            var description = $("#desc_text")[0].innerHTML;
                            var a = new models.Apartment({
                                id: item.id,
                                url: link,
                                source: source,
                                description: description,
                                district: district,
                                address: address,
                                rooms: rooms,
                                area: area,
                                floor: floor,
                                price: price
                            });

                            a.save();
                            console.log('Saved Avito: ' + item.id);
                        } catch (e) {
                            console.warn("Skipped due to parse error", e, e.line, body);
                        }
                        scheduleNextParse();
                    });

                } else {
                    console.error(link, error, response ? response.statusCode : "");
                }
            });
        });
    };

    var parsePage = function (link) {
        request({
            url: link,
            encoding: 'utf8',
            timeout: 60000,
            gzip: true,
            jar: true,
            headers: headers
        }, function (error, response, body) {
            console.log("Page " + link);
            if (!error && response.statusCode == 200) {
                jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                    try {
                        if (errors) return console.error("parse page jsdom error", errors, body);
                        var $ = window.$;

                        // iterate through items
                        var items = [];
                        $("div.item").each(function (idx, item) {
                            var url = $(item).find("h3.title a").attr('href');
                            items.push({id: item.id, url: url});
                        });
                        parseItems(items);

                        // get next link
                        var nextEl = $("div.pagination__nav a.pagination__page");
                        if (nextEl.length == 1 && nextEl[0].innerHTML.indexOf("→") < 0) {
                            // if there is no next button reset nextEl
                            nextEl = null;
                        }
                        if (nextEl) {
                            var link = nextEl[nextEl.length == 1 ? 0 : 1].href;
                            link = link.replace(/file:[\/]+(c:)?/, '');
                            setTimeout(function () {
                                parsePage(base + link);
                            }, Math.random() * 10000 + 10000);
                        } else {
                            console.log("---- PARSE PAGES FINISHED ----")
                        }
                    } catch (e) {
                        console.warn("Skipped due to parse error", e, e.line, body);
                    }
                });
            } else {
                console.error(link, error, response ? response.statusCode : "");
            }
        });
    };

    var startLink = 'https://www.avito.ru/izhevsk/kvartiry/prodam/vtorichka/ne_pervyy_i_ne_posledniy?pmax=2000000&pmin=1500000&district=164-165-166&f=59_920b.575_5930';
    base = 'https://www.avito.ru';
    parsePage(startLink);
}

router.get('/', function (req, res) {
    parseAvito();
    res.send("Started");
});

module.exports = router;

