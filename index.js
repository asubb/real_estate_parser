var server = require('./server');
var swig = require('swig');

var router = function(routes) {
	this.getHandler = function(path) {
		if (routes && routes[path]) {
			return routes[path];
		}
	}
	return this;
};

server.start(router({
	'/': function(request, response) {
		response.writeHead(200);
		var t = swig.renderFile('templates/index.html', {
			text: 'Lorem ipsum'
		});
		response.write(t);
		response.end();
	}
}));
console.info("Server started");