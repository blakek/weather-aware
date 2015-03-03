var https = require('https');
var reload_interval = 180000; // Interval (in milliseconds) to refresh
var location = {};

var valid_sources = [
	{
		name: 'forecast.io', // Human-readable name of the source (required)
		source_site: 'http://forecast.io/', // Website of source for info (optional)
		api_key: '', // The API key... see api_key_name. This will be set later using the api_key_name.
		api_key_name: 'forecast_io', // ** Name of ** the API key in the settings file (if needed). The settings.json file is ignored in git, so we can keep our keys there
		forecast_uri: 'https://api.forecast.io/forecast/${api_key}/${latitude},${longitude}', // URI to get general forecast data (required)
		storm_array_uri: 'https://api.darkskyapp.com/v1/interesting/${api_key}', // URI to get wide-area storm data (optional)
		last_call: undefined, // Last time this source was called. Used for caching request results (esp. to keep from using up free API keys)
		conversion: forecastio2wa // Function to populate our own variables from the API's. Should expect 1 argument - an object the API responded with (required)
	},{
		name: 'OpenWeatherMap',
		source_site: 'http://openweathermap.org/',
		api_key: '',
		api_key_name: 'openweathermap',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		name: 'Weather Underground',
		source_site: 'http://www.wunderground.com/',
		api_key: '',
		api_key_name: 'wunderground',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		name: 'National Weather Service',
		source_site: 'http://www.weather.gov/',
		api_key: '',
		api_key_name: 'weather_gov',
		forecast_uri: '',
		storm_array_uri: '',
		last_call: undefined,
		conversion: undefined
	},{
		name: 'test',
		source_site: undefined,
		api_key: '',
		api_key_name: '',
		forecast_uri: 'file://' + __dirname + '/test/local.json',
		storm_array_uri: '',
		last_call: undefined,
		conversion: test2wa
	}
];

function getWeather(lat, lon, source_obj) {
	if (source_obj === undefined) {
		source_obj = valid_sources[0];
	}

	return callAPI(parseAPIURI(source_obj), source_obj.conversion);
}

function setLocation(lat, lon) {
	location = { latitude: lat, longitude: lon };
}

/* Will be used as the entry-point for getting info from the API URI,
 * calling conversion functions, etc.
 */
function callAPI(uri, on_complete) {
	var output = '';

	if (uri.slice(0, 7) === 'file://') {
		return on_complete(JSON.parse(require('fs').readFileSync(uri.slice(7))));
	}

	https.get(uri, function (res) {
		res.setEncoding('UTF-8');

		res.on('data', function (data) {
			output += data;
		});

		res.on('end', function (data) {
			return on_complete(JSON.parse(data));
		});
	});
}

function parseAPIURI(source_object) {
	return source_object.forecast_uri.replace(/\$\{api_key\}/g, source_object.api_key)
	                                 .replace(/\$\{latitude\}/g, location.latitude)
	                                 .replace(/\$\{longitude\}/g, location.longitude);
}

/* Will be used to take a JavaScript object returned from forecast.io
 * to fill our own forecast variable(s)
 */
function forecastio2wa(result_object) {
	// FIXME
}

/* Will be used to keep from calling the other APIs during testing
 */
function test2wa(result_object) {
	return {
		location: {
			latitude: result_object.latitude,
			longitude: result_object.longitude
		},
		now: {
			temp: result_object.currently.temperature,
			temp_apparent: result_object.currently.apparentTemperature,
			conditions: result_object.currently.summary,
			icon: test2waIcon(result_object.currently.icon),
			nearest_storm: {
				bearing: result_object.currently.nearestStormBearing || 0,
				distance: result_object.currently.nearestStormDistance || 0
			},
			precipitation: {
				insensity: result_object.currently.precipIntensity,
				probability: result_object.currently.precipProbability,
				type: result_object.currently.precipType
			},
			wind: {
				speed: result_object.currently.windSpeed,
				bearing: result_object.currently.windBearing
			}
		},
		today: {
			temp: {
				hourly: [],
				high: result_object.daily.data[0].temperatureMax,
				low: result_object.daily.data[0].temperatureMin
			},
			sun: {
				rise_time: result_object.daily.data[0].sunriseTime,
				set_time: result_object.daily.data[0].sunsetTime
			}
		},
		week: {
			daily_temps: []
		},
		alerts: result_object.alerts,
		units: {
			temp: 'F',
			distance: 'mi'
		}
	};
}

function test2waIcon(origText) {
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

// This is only to show the expected layout, and will probably be removed soon.
// var forecast = {
// 	location: { // To keep up with where this forecast was for. Note to self: maybe useful for caching calls, too??
// 		latitude: '',
// 		longitude: ''
// 	},
// 	now: {
// 		temp: '',
// 		temp_apparent: '',
// 		conditions: '',
// 		icon: '',
// 		nearest_storm: {
// 			bearing: '', // A numerical value representing the direction of the nearest storm in degrees, with true north at 0° and progressing clockwise. (If nearestStormDistance is zero, then this value will not be defined. The caveats that apply to nearestStormDistance also apply to this value.)
// 			distance: '' // A numerical value representing the distance to the nearest storm in miles. (This value is very approximate and should not be used in scenarios requiring accurate results. In particular, a storm distance of zero doesn’t necessarily refer to a storm at the requested location, but rather a storm in the vicinity of that location.)
// 		},
// 		precipitation: {
// 			insensity: '', // A numerical value representing the average expected intensity (in inches of liquid water per hour) of precipitation occurring at the given time conditional on probability (that is, assuming any precipitation occurs at all). A very rough guide is that a value of 0 in./hr. corresponds to no precipitation, 0.002 in./hr. corresponds to very light precipitation, 0.017 in./hr. corresponds to light precipitation, 0.1 in./hr. corresponds to moderate precipitation, and 0.4 in./hr. corresponds to heavy precipitation.
// 			probability: '',
// 			type: ''
// 		},
// 		wind: {
// 			speed: '',
// 			bearing: ''
// 		}
// 	},
// 	today: {
// 		temp: {
// 			hourly: [],
// 			high: '',
// 			low: ''
// 		},
// 		sun: {
// 			rise_time: '',
// 			set_time: ''
// 		}
// 	},
// 	week: {
// 		daily_temps: []
// 	},
// 	alerts: [],
// 	units: {
// 		temp: '', // C, F, K, etc
// 		distance: '' // km, m, mi, etc.
// 	}
// };
