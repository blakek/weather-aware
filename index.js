var os = require('os');
var fs = require('fs');
var express = require('express');
var settings = require('./settings.js');
var app = express();
var PUBLIC_FOLDER = __dirname + '/public';
var port = process.env.PORT || 4343;
var basic_settings = settings.getAllSettingsSync();

app.set('views', PUBLIC_FOLDER + '/views');
app.use(express.static(PUBLIC_FOLDER));

app.get('/settings', function (req, res) {
	basic_settings.selected = 'settings';
	basic_settings.theme_list = fs.readdirSync(PUBLIC_FOLDER + basic_settings.theme_dir);
	res.render('settings.jade', basic_settings);
});

app.get('/settings/:key', function (req, res) {
	basic_settings.selected = 'settings';
	res.render('settings.jade', basic_settings);
});

app.post('/settings/:key/:value', function (req, res) {
	basic_settings[req.params.key] = req.params.value;

	settings.writeAllSettings(basic_settings, function (err) {
		if (err)
			console.log(err);
	});
});

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
