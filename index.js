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

var weather_source = wa.getSourceWithId(page_settings.weather_source);
wa.setLocation(page_settings.locations[0].lat, page_settings.locations[0].lon);
weather_source.api_key = page_settings.api_keys[weather_source.api_key_name];

app.set('views', PUBLIC_FOLDER + '/views');
app.use(express.static(PUBLIC_FOLDER));

function setPageSettings(selectedPage, callback) {
	page_settings.selected = selectedPage;
	page_settings.date = moment().format('D MMMM YYYY');

	if (selectedPage === '' || selectedPage === null) {
		callback();
		return;
	}

	wa.getWeather(weather_source,  function (weather_data) {
		page_settings.weather = weather_data;
		page_settings.last_updated = moment(weather_data.last_updated, 'X').fromNow();
		page_settings.next_update = moment(weather_source.last_call + wa.reload_interval, 'X').fromNow();

		callback();
	});
}

app.get('/settings', function (req, res) {
	setPageSettings('settings', function () {
		// Refresh list of themes in theme folder
		page_settings.theme_list = fs.readdirSync(PUBLIC_FOLDER + page_settings.theme_dir);
		page_settings.valid_sources = wa.valid_sources;

		res.render('settings.jade', page_settings);
	});
});

app.get('/settings/:key', function (req, res) {
	// Not really used right now...
	// settings.getValue(req.params.key, function (value) {
	// 	res.end(JSON.stringify(value));
	// });
	res.render('settings.jade', page_settings);
});

/* TODO: Clean these settings things up. Could probably actually write in the
 * POST body the values to keep from needing all these different calls to /settings
 */
app.post('/settings/:key/:value', function (req, res) {
	page_settings[req.params.key] = req.params.value;

	if (req.params.key === 'weather_source') {
		weather_source = wa.getSourceWithId(req.params.value);
		weather_source.api_key = page_settings.api_keys[weather_source.api_key_name];
		weather_source.last_call = 0;
	}

	// FIXME: temporary workaround
	page_settings.weather = undefined;

	settings.writeAllSettings(page_settings, function (err) {
		if (err)
			console.err(err);
	});
});

app.post('/settings/api_keys/:service/:api_key', function (req, res) {
	page_settings.api_keys[req.params.service] = req.params.api_key;

	// FIXME: temporary workaround
	page_settings.weather = undefined;

	settings.writeAllSettings(page_settings, function (err) {
		if (err)
			console.err(err);
	});
});

app.post('/settings/locations/:index/:lat/:lon', function (req, res) {
	page_settings.locations[req.params.index] = {
		lat: req.params.lat,
		lon: req.params.lon
	};

	// FIXME: temporary workaround
	page_settings.weather = undefined;

	settings.writeAllSettings(page_settings, function (err) {
		if (err)
			console.err(err);
	});
});

app.get(['/', '/home', '/forecast', '/alerts'], function (req, res) {
	var page = req.path.slice(1) || 'home';

	setPageSettings(page, function () {
		res.render(page + '.jade', page_settings);
	});
});

app.use('/', function(req, res) {
	console.error('INVALID URL: ' + req.url);
	setPageSettings(null, function () {
		res.render('404.jade', page_settings);
	});
});

app.listen(port, function () {
	console.log('Started at: http://' + os.hostname() + ':' + port);
});
