var bp = require('./baseparse');

var parse = function (req, res) {
    var base = 'http://izhevsk.irr.ru';
    var startLink = '/real-estate/apartments-sale/search/rooms=1%2C2/price=%D0%BE%D1%82+1500000+%D0%B4%D0%BE+2000000/currency=RUR/meters-total=%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%B5+30/floor_house=2%2C3/list=list/page_len60/';

    var currPage = 1;
    var maxPages = 4;
    bp.parse(req, res, base, 'irr', startLink, 'utf8',
        // page
        function (req, res, $) {
            var items = [];
            var a = $(".add_list .add_title_wrap, .add_head").each(function (idx, itm) {
                if (itm.innerHTML == "Предложения из ближайших регионов") {
                    return false;
                }
                var a = $(itm).find("a")[0];
                items.push({
                    url: a.href.replace('http://izhevsk.irr.ru', ''),
                    id: a.href.match(/advert\d+/)[0]
                });
            });
            return items;
        },
        // next
        function (req, res, $) {
            if (currPage == maxPages) {
                return null;
            }
            var $addHead = $(".add_head");
            if ($addHead && $addHead[0] && $addHead[0].innerHTML == "Предложения из ближайших регионов") {
                return null;
            }
            currPage++;
            var link = null;
            $("ul.same_adds_paging li a").each(function (idx, itm) {
                if (itm.innerHTML == currPage) {
                    link = itm.href.replace(/file:\/\/\/(\w:)/, '');
                    return false;
                }
            });
            return link;
        },
        // item
        function (req, res, item, $) {
            var price = $(".credit_cost ul li")[0].innerHTML.replace(/[^\d]/g, '');
            var desc = $("p.text:not(p.right)")[0].innerHTML;
            var address = $("p.text:not(p.right) a")[0].innerHTML.replace(/Ижевск,\s*/, '');
            var floor = $("li.cf_block_etage")[0].innerHTML.replace(/[^\d]/g, '')
                + "/" + $("li.cf_block_etage-all")[0].innerHTML.replace(/[^\d]/g, '');
            var area = $("li.cf_block_meters-total")[0].innerHTML.replace(/[^\d]/g, '');
            var rooms = $("li.cf_block_rooms")[0].innerHTML.replace(/[^\d]/g, '');

            var dmy = $(".data")[0].innerHTML.split(' ', 3);
            var months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
            var month;
            for (var i = 0; i < months.length; i++) {
                if (dmy[1].substr(0, 3) === months[i]) {
                    month = i;
                    break;
                }
            }
            if (!month) month = 4; // May is the only month that will be skipped in the search

            var it = {id: item.id,
                url: base + item.url,
                source: 'irr',
                description: desc,
                district: '',
                address: address,
                rooms: rooms,
                area: area,
                floor: floor,
                price: price,
                created: new Date(dmy[2], month, dmy[0])
            };
            return it;
        }
    );
};

exports.parse = parse;