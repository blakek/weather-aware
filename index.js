//'use strict';
var os = require('os');
var express = require('express');
var app = express();
var PUBLIC_FOLDER = __dirname + '/public';
var port = process.env.PORT || 4343;
var basic_settings = {};

basic_settings.title = 'Test';
basic_settings.hostname =  os.hostname();

app.set('views', PUBLIC_FOLDER + '/views');
app.use(express.static(PUBLIC_FOLDER));

app.get('/', function (req, res) {
	basic_settings.selected = 'home';
	res.render('home.jade', basic_settings);
});

app.use('/', function(req, res) {
	console.error('INVALID URL: ' + req.url);
	res.render('404.jade', basic_settings);
});

app.listen(port, function () {
	console.log('Started at: http://' + os.hostname() + ':' + port);
});
