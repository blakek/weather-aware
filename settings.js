var fs = require('fs');

var SETTINGS_FILE = __dirname + '/settings.json';
var DEFAULT_SETTINGS = {
    api_keys: {},
    locations: [
        {lat: "33.456291", lon: "-88.795530"}
    ],
    title: "weather|aware",
    theme: "paper.min.css",
    theme_dir: "/css/themes",
    selected: "home",
    navbar_inversed: "false",
    theme_list: []
};

function createIfNotExists(settings_file) {
    if (! fs.existsSync(settings_file)) {
        fs.writeFileSync(settings_file, JSON.stringify(DEFAULT_SETTINGS, null, 4));
    }
}

function _getAllSettingsSync() {
    createIfNotExists(SETTINGS_FILE);
	return JSON.parse(fs.readFileSync(SETTINGS_FILE, {encoding: 'UTF-8'}));
}

function _getAllSettings(callback) {
    createIfNotExists(SETTINGS_FILE);

	fs.readFile(SETTINGS_FILE, {encoding: 'UTF-8'}, function (err, data) {
		callback(err, JSON.parse(data));
	});
}

function _getValue(key, callback) {
	_getAllSettings(function (err, data) {
		if (err)
			callback(err);

		callback(data[key]);
	});
}

function _getValueSync(key) {
	return _getAllSettingsSync()[key];
}

function _writeAllSettings(settingsObject, callback) {
	fs.writeFile(SETTINGS_FILE, JSON.stringify(settingsObject, null, 4), callback);
}

function _resetSettings() {
	_writeAllSettings(DEFAULT_SETTINGS, console.error);
}

module.exports = {
	getAllSettingsSync: _getAllSettingsSync,
	getAllSettings: _getAllSettings,
	getValue: _getValue,
	getValueSync: _getValueSync,
	resetSettings: _resetSettings,
	writeAllSettings: _writeAllSettings
};
