# weather-aware
A customizable weather alerting and storm tracking system.

**2015-02-23:**
This is a work-in-progress, so almost all of the functionality is currently dependent on editing the source and configuration files.

## Getting started

### Dependencies
Before you can run this, you'll need have a working version of [Node.js](http://nodejs.org/) and npm.


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

It will tell you where to go in your browser. (e.g. `localhost:4343`).

## Other details
The default port is 4343.  You can change this by setting the PORT variable in your environment. (e.g. `export PORT=8080`).

Upon starting the server, you'll see that the presented weather information is incorrect.  That is because all information is pulled from a test JSON file for testing.  There are other services that may work currently, but they will need to be enabled in `/index.js` before they show.  This will be changed when the source becomes more stable.  Again, this is very much a work-in-progress.
