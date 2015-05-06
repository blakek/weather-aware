var url = require('url');
var path = require('path');
var http = require('http');
var https = require('https');
var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser();
var reload_interval = 180; // Interval (in seconds) to refresh
var location = {};
var last_call_output = {};

function now() {
	return Math.floor(Date.now() / 1000);
}

var valid_sources = [
	{
		id: 'forecast_io', // What we use to identify this source (required)
		name: 'forecast.io', // Human-readable name of the source (required)
		enabled: true, // Should this be shown as an option to users (requred for now)
		source_site: 'http://forecast.io/', // Website of source for info (optional)
		api_key_name: 'forecast_io', // ** Name of ** the API key in the settings file (if needed). The settings.json file is ignored in git, so we can keep our keys there
		forecast_uri: 'https://api.forecast.io/forecast/${api_key}/${latitude},${longitude}', // URI to get general forecast data (required)
		storm_array_uri: 'https://api.darkskyapp.com/v1/interesting/${api_key}', // URI to get wide-area storm data (optional)
		last_call: undefined, // Last time this source was called. Used for caching request results (esp. to keep from using up free API keys)
		conversion: forecastio2wa // Function to populate our own variables from the API's. Should expect 2 arguments - a string the API responded with and a callback when finished (required)
	},{
		id: 'openweathermap',
		name: 'OpenWeatherMap',
		enabled: false,
		source_site: 'http://openweathermap.org/',
		api_key_name: 'openweathermap',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		id: 'wunderground',
		name: 'Weather Underground',
		enabled: false,
		source_site: 'http://www.wunderground.com/',
		api_key_name: 'wunderground',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		id: 'nws-testing',
		name: 'National Weather Service (under testing)',
		enabled: true,
		source_site: 'http://www.weather.gov/',
		// forecast_uri: 'file://' + __dirname + '/test/nws-local.xml',
		//forecast_uri: 'http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?lat=${latitude}&lon=${longitude}',
		forecast_uri: 'http://forecast.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}&FcstType=json',
		storm_array_uri: undefined,
		last_call: undefined,
		conversion: test_nws2wa
	},{
		id: 'testing',
		name: 'Testing',
		enabled: true,
		source_site: undefined,
		forecast_uri: 'file://' + __dirname + '/test/forecast_io-alert.json',
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

	if (on_complete === undefined && options !== undefined) {
		on_complete = options;
		options = undefined;
	}
	callAPI(source_obj, on_complete);
}

/* Just a convenience function to set our local location object.
 */
function setLocation(lat, lon) {
	location = { latitude: lat, longitude: lon };
}

function getSourceWithId(id) {
	var ret;

	valid_sources.forEach(function (source) {
		if (source.id === id) {
			ret = source;
			return false;
		}
	});

	return ret;
}

/* Will be used as the entry-point for getting info from the API URI,
 * calling conversion functions, etc.
 */
function callAPI(source_obj, on_complete) {
	var uri = parseAPIURI(source_obj);
	var output = '';
	var protocol;

	if (now() - source_obj.last_call < reload_interval) {
		var remainingtime = source_obj.last_call + reload_interval - now();
		console.info('Using cached weather results for another ' + remainingtime + ' second(s).');

		on_complete(last_call_output);
		return;
	}

	source_obj.last_call = now();

	console.log('Getting weather from: ' + uri);

	var parsed_uri = url.parse(uri);

	if (parsed_uri.protocol === 'file:') {
		source_obj.last_call = 0;

		source_obj.conversion(require('fs').readFileSync(uri.slice(7)), function (weather_data) {
			last_call_output = weather_data;
			on_complete(weather_data);
		});

		return;
	} else if (parsed_uri.protocol === 'https:') {
		protocol = https;
	} else if (parsed_uri.protocol === 'http:') {
		protocol = http;
	}

	parsed_uri.headers = { 'User-Agent': 'weather-aware' };

	protocol.get(parsed_uri, function (res) {
		res.setEncoding('UTF-8');

		res.on('data', function (data) {
			output += data;
		});

		res.on('end', function (data) {
			source_obj.conversion(output, function (weather_data) {
				last_call_output = weather_data;
				on_complete(weather_data);
			});
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
function forecastio2wa(result_string, cb) {
	var result_object = JSON.parse(result_string);

	cb({
		last_updated: now(),
		location: {
			latitude: result_object.latitude,
			longitude: result_object.longitude
		},
		now: {
			temp: Math.round(result_object.currently.temperature),
			temp_apparent: Math.round(result_object.currently.apparentTemperature),
			conditions: result_object.currently.summary,
			icon: forecast_io2waIcon(result_object.currently.icon),
			nearest_storm: {
				bearing: result_object.currently.nearestStormBearing || 0,
				distance: result_object.currently.nearestStormDistance || 0
			},
			precipitation: {
				intensity: result_object.currently.precipIntensity,
				probability: Math.round(result_object.currently.precipProbability * 100),
				type: result_object.currently.precipType
			},
			wind: {
				speed: Math.round(result_object.currently.windSpeed),
				bearing: result_object.currently.windBearing
			}
		},
		today: {
			temp: {
				high: Math.round(result_object.daily.data[0].temperatureMax),
				low: Math.round(result_object.daily.data[0].temperatureMin)
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
						temp: Math.round(hour_data.temperature),
						precipitation: {
							intensity: hour_data.precipIntensity,
							probability: Math.round(hour_data.precipProbability * 100),
							type: hour_data.precipType
						},
						sun: {
							rise_time: hour_data.sunriseTime,
							set_time: hour_data.sunsetTime
						},
						wind: {
							bearing: hour_data.windBearing,
							speed: Math.round(hour_data.windSpeed)
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
							high: Math.round(day_data.temperatureMax),
							low: Math.round(day_data.temperatureMin)
						},
						precipitation: {
							intensity: day_data.precipIntensity,
							probability: Math.round(day_data.precipProbability * 100),
							type: day_data.precipType
						},
						sun: {
							rise_time: day_data.sunriseTime,
							set_time: day_data.sunsetTime
						},
						wind: {
							bearing: day_data.windBearing,
							speed: Math.round(day_data.windSpeed)
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
	});
}

/* Used to keep from calling the other APIs during testing our standardized format
 */
function test2wa(result_string, cb) {
	forecastio2wa(result_string, cb);
}

function test_nws2wa(result_string, cb) {
	var j = JSON.parse(result_string);

	cb({
		last_updated: now(),
		location: {
			latitude: j.location.latitude,
			longitude: j.location.longitude
		},
		now: {
			temp: j.currentobservation.Temp,
			temp_apparent: 'N/A',
			conditions: j.currentobservation.Weather,
			icon: nws2waIcon(j.data.iconLink[0]),
			nearest_storm: {
				bearing: 0, // Not done
				distance: 'N/A'
			},
			precipitation: {
				intensity: 'N/A',
				probability: j.data.pop[0],
				type: 'Currently N/A'
			},
			wind: {
				speed: j.currentobservation.Winds,
				bearing: j.currentobservation.Windd
			}
		},
		today: {
			temp: {
				high: 'N/A',
				low: 'N/A'
			},
			sun: {
				rise_time: 'N/A',
				set_time: 'N/A'
			},
			summary: 'N/A',
			icon: forecast_io2waIcon('N/A'),
			// hourly: function () { // will contain precipitation, temp, and other hourly data
			// 	var r = [];
			//
			// 	result_object.hourly.data.forEach(function (hour_data) {
			// 		r.push({
			// 			temp: Math.round(hour_data.temperature),
			// 			precipitation: {
			// 				intensity: hour_data.precipIntensity,
			// 				probability: Math.round(hour_data.precipProbability * 100),
			// 				type: hour_data.precipType
			// 			},
			// 			sun: {
			// 				rise_time: hour_data.sunriseTime,
			// 				set_time: hour_data.sunsetTime
			// 			},
			// 			wind: {
			// 				bearing: hour_data.windBearing,
			// 				speed: Math.round(hour_data.windSpeed)
			// 			},
			// 			summary: hour_data.summary,
			// 			icon: forecast_io2waIcon(hour_data.icon),
			// 			time: hour_data.time
			// 		});
			// 	});
			// 	return r;
			// }
		},
		week: {
			daily: function() {
				return [{
					precipitation: {
						probability: 'N/A'
					}
				}];
				var r = [];

				result_object.daily.data.forEach(function (day_data) {
					r.push({
						temp: {
							high: Math.round(day_data.temperatureMax),
							low: Math.round(day_data.temperatureMin)
						},
						precipitation: {
							intensity: day_data.precipIntensity,
							probability: Math.round(day_data.precipProbability * 100),
							type: day_data.precipType
						},
						sun: {
							rise_time: day_data.sunriseTime,
							set_time: day_data.sunsetTime
						},
						wind: {
							bearing: day_data.windBearing,
							speed: Math.round(day_data.windSpeed)
						},
						summary: day_data.summary,
						icon: forecast_io2waIcon(day_data.icon),
						time: day_data.time
					});
				});
				return r;
			}
		},
		alerts: 'N/A',
		alert_count: (j.alerts) ? (j.alerts.length) : 0,
		units: {
			temp: 'F',
			distance: 'mi',
			speed: 'mph'
		}
	});

	/* This could be used for the alerts when I get around to it
	xmlParser.parseString(result_string, function (err, result) {
		if (err)
			console.error(err);

		var data = result.dwml.data[0];
		var time_lookup = {};
		var temp_lookup = {};

		data['time-layout'].forEach(function (val, i) {
			time_lookup[val['layout-key'][0]] = {
				start_times: val['start-valid-time'],
				end_times: val['start-valid-time']
			};
		});

		data.parameters[0].temperature.forEach(function (val, i) {
			temp_lookup[val.$.type] = {
				time_layout: val.$['time-layout'],
				values: val.value
			};
		});
	}
	*/
}

function forecast_io2waIcon(origText) {
	switch (origText) {
		case 'partly-cloudy-day':
			return 'day-cloudy';
		case 'partly-cloudy-night':
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

function nws2waIcon(origText) {
	var origIcon = path.basename(origText, path.extname(origText));

	switch (origIcon) {
		case 'bkn':
		case 'nbkn':
		case 'ovc':
		case 'novc':
			return 'cloudy';
		case 'skc':
			return 'day-sunny';
		case 'nskc':
			return 'night-clear';
		case 'few':
			return 'day-sunny-overcast';
		case 'sct':
			return 'day-cloudy';
		case 'nfew':
		case 'nsct':
			return 'night-cloudy';
		case 'fg':
		case 'nfg':
			return 'fog';
		case 'fzra':
		case 'ip':
		case 'mix':
		case 'raip':
		case 'rasn':
		case 'fzrara':
			return 'rain-mix';
		case 'nmix':
		case 'nrasn':
			return 'night-rain-mix';
		case 'shra':
		case 'hi_shwrs':
		case 'hi_nshwrs':
		case 'ra1':
		case 'nra':
			return 'showers';
		case 'tsra':
		case 'hi_tsra':
			return 'storm-showers';
		case 'ntsra':
		case 'hi_ntsra':
			return 'night-alt-storm-showers';
		case 'sn':
			return 'day-snow';
		case 'nsn':
			return 'night-snow';
		case 'wind':
		case 'nwind':
			return 'strong-wind';
		case 'ra':
		case 'nra':
			return 'wi-rain';
		case 'nsvrtsra':
			return 'tornado';
		case 'mist':
			return 'dust';
		default:
			return origIcon;
	}
}

module.exports = {
	reload_interval: reload_interval,
	valid_sources: valid_sources,
	location: location,
	getSourceWithId: getSourceWithId,
	getWeather: getWeather,
	setLocation: setLocation
};
