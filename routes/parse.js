var express = require('express');
var router = express.Router();
var request = require('request');
var jsdom = require("jsdom");
var models = require("../model/models");

var parseAvito = function () {
    var source = "Avito";

    var base = "";
    var parseItem = function (id, url) {
        models.Apartment.findOne({id: id, source: source}, function (err, a) {
            if (err) return console.error(err);
            if (a) return console.log("skipped Avito: " + id);

            var link = base + url;
            request({
                url: link,
                encoding: 'utf8'
            }, function (error, response, body) {
                console.log("Page " + link);
                if (!error && response.statusCode == 200) {
                    jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                        var $ = window.$;
                        var p = $("h1[itemprop=name]")[0].innerHTML.match(/(\d+)[^,]+,\s(\d+)[^,]+,\s(\d+\/\d+)/);
                        var rooms = p[1];
                        var area = p[2];
                        var floor = p[3];
                        var price = $(".description__price .description_price span[itemprop=price]")[0].innerHTML.replace(/[^\d]+/g, "");

                        var address = $(".description_content_company[itemprop=address] span[itemprop=streetAddress]")[0].innerHTML;
                        var district = $(".description_content_company[itemprop=address] span")[0].innerHTML.match(/[^,]+/)[0].split(" ")[1];
                        var description = $("#desc_text")[0].innerHTML;
                        var a = new models.Apartment({
                            id: id,
                            url: url,
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
                        console.log('Saved Avito: ' + id);
                    });
                } else {
                    console.error(error);
                }
            });
        });
    };

    var parsePage = function (link) {
        request({
            url: link,
            encoding: 'utf8'
        }, function (error, response, body) {
            console.log("Page " + link);
            if (!error && response.statusCode == 200) {
                jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (errors, window) {
                    var $ = window.$;

                    // iterate through items
                    $("div.item").each(function (idx, item) {
                        var url = $(item).find("h3.title a").attr('href');
                        parseItem(item.id, url);
                    });

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
                        }, 0);
                    } else {
                        console.log("---- DONE ----")
                    }
                });
            } else {
                console.error(error);
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

