var nws = require('wa-source-nws');
var forecast_io = require('wa-source-forecast_io');

var reload_interval = 180; // Interval (in seconds) to refresh
var location = {};
var last_call_output = {};

function now() {
	return Math.floor(Date.now() / 1000);
}

var valid_sources = [];

valid_sources.push(forecast_io);
valid_sources.push(nws);


/* This is really the only function useful externally. It calls all the other
 * functions needed (e.g. hitting the API source, parsing the data into a
 * standardized format, etc).
 */
function getWeather(source_obj, options, on_complete) {
	if (typeof on_complete === 'undefined' && typeof options === 'function') {
		on_complete = options;
		options = undefined;
	}

	if (typeof options !== 'undefined') {
		Object.keys(options).forEach(function (o) {
			source_obj.options[o] = options[o];
		});
	}

	source_obj.getWeatherData(location, on_complete);
}

/* Just a convenience function to set our local location object.
 */
function setLocation(lat, lon) {
	location = { latitude: lat, longitude: lon };
}

function getSourceWithId(id) {
	var ret;

	valid_sources.some(function (source) {
		if (source.info.id === id) {
			ret = source;
			return false;
		}
	});

	return ret;
}

module.exports = {
	reload_interval: reload_interval,
	valid_sources: valid_sources,
	location: location,
	getSourceWithId: getSourceWithId,
	getWeather: getWeather,
	setLocation: setLocation
};
