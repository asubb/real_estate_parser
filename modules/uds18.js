var bp = require('./baseparse');
var encoding = require('encoding');
var sha1 = require('node-sha1');

var log = function (res, msg) {
    console.log("[UDS18] " + msg);
    res.write("<p>[UDS18] " + msg + "</p>");
};

var enc = function (b) {
    return encoding.convert(b, 'utf8', 'windows-1251') + "";
};

var parse = function (req, res) {
    var startPage = '/how-to-buy/implementation-of-secondary-real-estate/';
    bp.parse(req, res, 'http://www.uds18.ru', 'uds18', startPage, 'binary',
        // page
        function (req, res, $) {
            var items = [];
            $("table.list tbody tr:not(tr.head)").each(function (idx, itm) {
                var desc, address, rooms, area, floor, price;
                $(itm).find("td").each(function (idx1, itm1) {
                    var b = enc(itm1.innerHTML);
//                    log(res, idx1 + " " + b);
                    if (idx1 == 1) {
                        rooms = b.replace(/[^\d]/g, '');
                    } else if (idx1 == 2) {
                        address = b;
                    } else if (idx1 == 3) {
                        var p = b.split(';');
                        floor = p[0];
                        area = p[1].replace(/[^\d]/g, '');
                        desc = p[2];
                    } else if (idx1 == 4) {
                        price = b * 1000;
                    }
                });
                var id = sha1(address + " " + rooms + " " + area + " saltttttttt");
                var it = {id: id,
                    url: startPage,
                    source: 'uds18',
                    description: desc,
                    district: '',
                    address: address,
                    rooms: rooms,
                    area: area,
                    floor: floor,
                    price: price,
                    created: new Date()
                };
                items.push(it);
            });

            return items;
        },
        // next
        function (req, res, $) {
            return null;
        },
        // item
        function (req, res, item, $) {
            return item;
        }
    );
};

exports.parse = parse;