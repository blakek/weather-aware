var os = require('os');
var fs = require('fs');
var express = require('express');
var moment = require('moment');
var settings = require('./settings.js');
var wa = require('./weather-aware.js');
var app = express();
var PUBLIC_FOLDER = __dirname + '/public';
var port = process.env.PORT || 4343;
var page_settings = settings.getAllSettingsSync();

var weather_source = wa.valid_sources[3]; // This will be set later using the settings file
wa.setLocation(33.450, -88.818); // Again, set later using settings file.
weather_source.api_key = page_settings.api_keys[weather_source.api_key_name];

app.set('views', PUBLIC_FOLDER + '/views');
app.use(express.static(PUBLIC_FOLDER));

function getWeather() {
	var f = wa.getWeather(undefined, undefined, weather_source);
	return f;
}

function setPageSettings(selectedPage) {
	page_settings.selected = selectedPage;
	page_settings.date = moment().format('D MMMM YYYY');

	page_settings.weather = getWeather();
	page_settings.weather.last_updated = moment().format('X');
	page_settings.weather.alert_count = (page_settings.weather.alerts) ? page_settings.weather.alerts.length : 0;
}

app.get('/settings', function (req, res) {
	setPageSettings('settings');

	// Refresh list of themes in theme folder
	page_settings.theme_list = fs.readdirSync(PUBLIC_FOLDER + page_settings.theme_dir);

	res.render('settings.jade', page_settings);
});

app.get('/settings/:key', function (req, res) {
	// Not really used right now...
	// settings.getValue(req.params.key, function (value) {
	// 	res.end(JSON.stringify(value));
	// });
	res.render('settings.jade', page_settings);
});

app.post('/settings/:key/:value', function (req, res) {
	page_settings[req.params.key] = req.params.value;

	// FIXME: temporary workaround
	page_settings.weather = undefined;

	settings.writeAllSettings(page_settings, function (err) {
		if (err)
			console.err(err);
	});
});

app.get('/', function (req, res) {
	setPageSettings('home');
	res.render('home.jade', page_settings);
});

app.use('/', function(req, res) {
	console.error('INVALID URL: ' + req.url);
	setPageSettings();
	res.render('404.jade', page_settings);
});

app.listen(port, function () {
	console.log('Started at: http://' + os.hostname() + ':' + port);
});
