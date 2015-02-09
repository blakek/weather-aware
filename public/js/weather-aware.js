var alert_reload_interval = 180000; // Interval (in milliseconds) to refresh alerts

var valid_sources = [
	{
		name: "Dark Sky", // Human-readable name of the source (required)
		api_key: "", // API key (if needed)
		forecast_uri: "https://api.forecast.io/forecast/${api_key}/${latitude},${longitude}", // URI to get general forecast data (required)
		storm_array_uri: "https://api.darkskyapp.com/v1/interesting/${api_key}", // URI to get wide-area storm data (optional)
		last_call: undefined // Last time this source was called. Used for caching request results (esp. to keep from using up free API keys :)
	},
	{
		name: "OpenWeatherMap",
		api_key: "",
		forecast_uri: "",
		storm_array_uri: "",
		last_call: undefined
	}
];

var forecast = {
	now: {
		temp: '',
		apparentTemp: '',
		icon: ''
	},
	today: {
		hourly_temps: {}
	},
	week: {
		daily_temps: {}
	}
};

