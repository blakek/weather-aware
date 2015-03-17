# weather-aware
A customizable weather alerting and storm tracking system.

The hope is a system that allows people to be more aware of the weather and nearby storms so everyone can be more prepared.  The focus will likely be more on storm tracking than on getting weekly forecasts.

**2015-03-17:**
Note, this is a work-in-progress, so there will likely be plenty missing features, scattered bugs, and sub-optimal performance.  Feel free to submit new issues for feature requests or changes you'd like to see made, or, even better, make the changes yourself and submit a pull request.

## Quick start

Getting started without all the details...

Expect this process to be significantly shorter in the near future.

  * Install [Node.js](http://nodejs.org/).
  * Get a free API key from [Forecast.io](https://developer.forecast.io/) - will not be required in the near future.
  * Clone the repo or download (and unzip) the latest zip file from [GitHub](https://github.com/blakek/weather-aware).
  * Open a terminal.  Change into the project's directory.
  * Run: `npm install`
  * Run: `node .`
  * Go to http://localhost:4343/ in your browser.
  * Click on "Settings" (top-right corner)
  * Add your Forecast.io API Key to the API Keys table near the bottom of the page.
  * Change your location under the "Locations" section of the same page.
  * Change your provider to Forecast.io in the "Weather Sources" section of the same page.
  * You're ready to go!

## Getting started (the long version)

### Prerequisites

Before you can run this, you'll need:

  * have a working version of [Node.js](http://nodejs.org/) and npm.
  * a free API key from [Forecast.io](https://developer.forecast.io/) - will not be required in the near future.

### Installation
After cloning the repo or unzipping the latest copy, you'll need to get the dependencies using npm.

To do that, run:

```
npm install
```

### Starting the server
Once you've installed the dependencies using npm, you can start the server.

To do that, run:

```
node .
```

It will tell you where to go in your browser. (e.g. `http://localhost:4343/`).

Note on the first start, the weather displayed will be wrong.  That is because the current default weather provider is a testing one for helping development.  You can click on "Settings" at the top-right and change your provider to a real one under the "Weather Sources" section.

### Getting API keys
This is a huge work-in-progress.  You cannot yet get weather details using `weather-aware` without getting your own API keys from a service. **This will change in the near future**, and you will ideally be able to use this without having to get your own keys.

However, that's not the case yet.

The only provider working at the moment is [Forecast.io](http://forecast.io/).  You can obtain a *free* (up to 1,000 calls per day) API key from them by registering with them [here](https://developer.forecast.io/).

Next providers will likely be (in no particular order):
  * [The National Weather Service](http://www.weather.gov/)
  * [Weather Underground](http://www.wunderground.com/)
  * [OpenWeatherMap](http://openweathermap.org/)

If you'd like to see one sooner (or like to see one not on this list), you can [open an issue](https://github.com/blakek/weather-aware/issues/new), and I'll get on it when I can.

After you obtain an API key, you'll want to add it so it can be used.  To do that, go to "Settings" (top-right corner), and add it to its provider under the "API Keys" section at the bottom.

## Other details
The default port is 4343.  You can change this by setting the PORT variable (all caps) in your environment. (e.g. `export PORT=8080`).  We may change this variable in the future, and I am considering adding a command-line switch for convenience.
