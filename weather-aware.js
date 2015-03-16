var https = require('https');
var reload_interval = 3; // Interval (in seconds) to refresh
var location = {};
var last_call_output = {};

function now() {
	return Math.floor(Date.now() / 1000);
}

var valid_sources = [
	{
		name: 'forecast.io', // Human-readable name of the source (required)
		source_site: 'http://forecast.io/', // Website of source for info (optional)
		//api_key: '', // The API key... see api_key_name. This will be set later using the api_key_name.
		api_key_name: 'forecast_io', // ** Name of ** the API key in the settings file (if needed). The settings.json file is ignored in git, so we can keep our keys there
		forecast_uri: 'https://api.forecast.io/forecast/${api_key}/${latitude},${longitude}', // URI to get general forecast data (required)
		storm_array_uri: 'https://api.darkskyapp.com/v1/interesting/${api_key}', // URI to get wide-area storm data (optional)
		last_call: undefined, // Last time this source was called. Used for caching request results (esp. to keep from using up free API keys)
		conversion: forecastio2wa // Function to populate our own variables from the API's. Should expect 1 argument - an object the API responded with (required)
	},{
		name: 'OpenWeatherMap',
		source_site: 'http://openweathermap.org/',
		api_key_name: 'openweathermap',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		name: 'Weather Underground',
		source_site: 'http://www.wunderground.com/',
		api_key_name: 'wunderground',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		name: 'National Weather Service',
		source_site: 'http://www.weather.gov/',
		api_key_name: 'weather_gov',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		name: 'test',
		source_site: undefined,
		api_key_name: '',
		forecast_uri: 'file://' + __dirname + '/test/local.json',
		storm_array_uri: '',
		last_call: undefined,
		conversion: test2wa
	}
];

/* This is really the only function useful externally. It calls all the other
 * functions needed (e.g. hitting the API source, parsing the data into a
 * standardized format, etc).
 */
function getWeather(source_obj, options, on_complete) {
	if (source_obj === undefined) {
		source_obj = valid_sources[0];
	}

	if (typeof on_complete === 'undefined' && typeof options === 'function') {
		on_complete = options;
		options = null;
	}

	if (now() - source_obj.last_call < reload_interval) {
		var remainingtime = source_obj.last_call + reload_interval - now();
		console.log('Using cached weather results for another ' + remainingtime + ' second(s).');

		on_complete(last_call_output);
	} else {
		if (on_complete === undefined && options !== undefined) {
			on_complete = options;
			options = undefined;
		}

		source_obj.last_call = now();
		callAPI(parseAPIURI(source_obj), source_obj.conversion, on_complete);
	}
}

/* Just a convenience function to set our local location object.
 */
function setLocation(lat, lon) {
	location = { latitude: lat, longitude: lon };
}

/* Will be used as the entry-point for getting info from the API URI,
 * calling conversion functions, etc.
 */
function callAPI(uri, conversion_fn, on_complete) {
	var output = '';

	if (uri.slice(0, 7) === 'file://') {
		last_call_output = conversion_fn(JSON.parse(require('fs').readFileSync(uri.slice(7))))
		return on_complete(last_call_output);
	}

	https.get(uri, function (res) {
		res.setEncoding('UTF-8');

		res.on('data', function (data) {
			output += data;
		});

		res.on('end', function (data) {
			last_call_output = conversion_fn(JSON.parse(output));
			return on_complete(last_call_output);
		});
	});
}

/* Takes a URI (e.g. forecast_uri) from a source object and replaces the
 * following if found:
 * ${api_key} => currently set longitude
 * ${latitude} => currently set latitude
 * ${longitude} => our source_object's API key
 */
function parseAPIURI(source_object) {
	return source_object.forecast_uri.replace(/\$\{api_key\}/g, source_object.api_key)
	                                 .replace(/\$\{latitude\}/g, location.latitude)
	                                 .replace(/\$\{longitude\}/g, location.longitude);
}

/* Will be used to take a JavaScript object returned from forecast.io
 * to fill our own forecast variable(s)
 */
function forecastio2wa(result_object) {
	return {
		last_updated: now(),
		location: {
			latitude: result_object.latitude,
			longitude: result_object.longitude
		},
		now: {
			temp: result_object.currently.temperature,
			temp_apparent: result_object.currently.apparentTemperature,
			conditions: result_object.currently.summary,
			icon: forecast_io2waIcon(result_object.currently.icon),
			nearest_storm: {
				bearing: result_object.currently.nearestStormBearing || 0,
				distance: result_object.currently.nearestStormDistance || 0
			},
			precipitation: {
				intensity: result_object.currently.precipIntensity,
				probability: result_object.currently.precipProbability * 100,
				type: result_object.currently.precipType
			},
			wind: {
				speed: result_object.currently.windSpeed,
				bearing: result_object.currently.windBearing
			}
		},
		today: {
			temp: {
				high: result_object.daily.data[0].temperatureMax,
				low: result_object.daily.data[0].temperatureMin
			},
			sun: {
				rise_time: result_object.daily.data[0].sunriseTime,
				set_time: result_object.daily.data[0].sunsetTime
			},
			summary: result_object.hourly.summary,
			icon: forecast_io2waIcon(result_object.hourly.icon),
			hourly: function () { // will contain precipitation, temp, and other hourly data
				var r = [];

				result_object.hourly.data.forEach(function (hour_data) {
					r.push({
						temp: hour_data.temperature,
						precipitation: {
							intensity: hour_data.precipIntensity,
							probability: hour_data.precipProbability * 100,
							type: hour_data.precipType
						},
						sun: {
							rise_time: hour_data.sunriseTime,
							set_time: hour_data.sunsetTime
						},
						wind: {
							bearing: hour_data.windBearing,
							speed: hour_data.windSpeed
						},
						summary: hour_data.summary,
						icon: forecast_io2waIcon(hour_data.icon),
						time: hour_data.time
					});
				});
				return r;
			}
		},
		week: {
			daily: function() {
				var r = [];

				result_object.daily.data.forEach(function (day_data) {
					r.push({
						temp: {
							high: day_data.temperatureMax,
							low: day_data.temperatureMin
						},
						precipitation: {
							intensity: day_data.precipIntensity,
							probability: day_data.precipProbability * 100,
							type: day_data.precipType
						},
						sun: {
							rise_time: day_data.sunriseTime,
							set_time: day_data.sunsetTime
						},
						wind: {
							bearing: day_data.windBearing,
							speed: day_data.windSpeed
						},
						summary: day_data.summary,
						icon: forecast_io2waIcon(day_data.icon),
						time: day_data.time
					});
				});
				return r;
			}
		},
		alerts: result_object.alerts,
		alert_count: (result_object.alerts) ? (result_object.alerts.length) : 0,
		units: {
			temp: 'F',
			distance: 'mi',
			speed: 'mph'
		}
	};
}

/* Used to keep from calling the other APIs during testing our standardized format
 */
function test2wa(result_object) {
	return {
		last_updated: now(),
		location: {
			latitude: result_object.latitude,
			longitude: result_object.longitude
		},
		now: {
			temp: result_object.currently.temperature,
			temp_apparent: result_object.currently.apparentTemperature,
			conditions: result_object.currently.summary,
			icon: forecast_io2waIcon(result_object.currently.icon),
			nearest_storm: {
				bearing: result_object.currently.nearestStormBearing || 0,
				distance: result_object.currently.nearestStormDistance || 0
			},
			precipitation: {
				intensity: result_object.currently.precipIntensity,
				probability: result_object.currently.precipProbability * 100,
				type: result_object.currently.precipType
			},
			wind: {
				speed: result_object.currently.windSpeed,
				bearing: result_object.currently.windBearing
			}
		},
		today: {
			temp: {
				high: result_object.daily.data[0].temperatureMax,
				low: result_object.daily.data[0].temperatureMin
			},
			sun: {
				rise_time: result_object.daily.data[0].sunriseTime,
				set_time: result_object.daily.data[0].sunsetTime
			},
			summary: result_object.hourly.summary,
			icon: forecast_io2waIcon(result_object.hourly.icon),
			hourly: function () { // will contain precipitation, temp, and other hourly data
				var r = [];

				result_object.hourly.data.forEach(function (hour_data) {
					r.push({
						temp: hour_data.temperature,
						precipitation: {
							intensity: hour_data.precipIntensity,
							probability: hour_data.precipProbability * 100,
							type: hour_data.precipType
						},
						sun: {
							rise_time: hour_data.sunriseTime,
							set_time: hour_data.sunsetTime
						},
						wind: {
							bearing: hour_data.windBearing,
							speed: hour_data.windSpeed
						},
						summary: hour_data.summary,
						icon: forecast_io2waIcon(hour_data.icon),
						time: hour_data.time
					});
				});
				return r;
			}
		},
		week: {
			daily: function() {
				var r = [];

				result_object.daily.data.forEach(function (day_data) {
					r.push({
						temp: {
							high: day_data.temperatureMax,
							low: day_data.temperatureMin
						},
						precipitation: {
							intensity: day_data.precipIntensity,
							probability: day_data.precipProbability * 100,
							type: day_data.precipType
						},
						sun: {
							rise_time: day_data.sunriseTime,
							set_time: day_data.sunsetTime
						},
						wind: {
							bearing: day_data.windBearing,
							speed: day_data.windSpeed
						},
						summary: day_data.summary,
						icon: forecast_io2waIcon(day_data.icon),
						time: day_data.time
					});
				});
				return r;
			}
		},
		alerts: result_object.alerts,
		alert_count: (result_object.alerts) ? (result_object.alerts.length) : 0,
		units: {
			temp: 'F',
			distance: 'mi',
			speed: 'mph'
		}
	};
}

function forecast_io2waIcon(origText) {
	switch (origText) {
		case 'partly-cloudy-day':
			return 'day-cloudy';
		case 'partly-cloudy-night ':
			return 'night-alt-cloudy';
		case 'cloudy':
			return 'cloudy';
		case 'wind':
			return 'strong-wind';
		case 'sleet':
			return 'rain-mix';
		case 'snow':
			return 'snow';
		case 'rain':
			return 'rain';
		case 'clear-night':
			return 'night-clear';
		case 'clear-day':
			return 'day-sunny';
		default:
			return origText;
	}
}

module.exports = {
	reload_interval: reload_interval,
	valid_sources: valid_sources,
	location: location,
	getWeather: getWeather,
	setLocation: setLocation
};
