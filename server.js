var http = require("http");
var url = require("url");

var start = function(router) {
	http.createServer(function(request, response) {
		var path = url.parse(request.url).pathname;
		if (router) {
			var handler = router.getHandler(path);
			if (!handler) {
				console.error("Handler not found: " + path);
				response.writeHead(404);
				response.write("<h1>error</h1>");
				response.end();
			} else {
				console.error("Handling: " + path);
				handler(request, response);
			}
		} else {
			console.error("Router undefined");
			response.writeHead(500);
			response.write("<h1>error</h1>");
			response.end();
		}
	}).listen(8888);
};

exports.start = start;