# demo-connector
Demo Salesforce Service Cloud Voice Connector. It will mock an incoming voice call after omni login, and let you also demo outbound calling and transfers.

## Installation

### Environment setup
The developer environment requires [Node](https://nodejs.org/en/download/), [NPM](https://docs.npmjs.com/cli/install) and [webpack-dev-server](https://webpack.github.io/docs/webpack-dev-server.html). 


### Installation
#### Clone the repo

```
$ cd /directory/to/house/the/repo
$ git clone git@github.com:salesforce/demo-scv-connector.git
```

#### Install npm dependencies

```
$ npm install
```

### Config Setup 
Open config.env and set following config values as per Org and Enviroment if needed.

- OVERRIDE_VOICECALLID (Optional): If you want to bypass scrt2 to create a voiceCall, pass a voiceCallId, i.e. 0LQxx0000004CIiGAM
	
- PRIVATE_KEY: If you have generated your own private/public key pair then replace the private key at /src/server/private.key
 
### Launch application 
 
```
$ npm start
```

By default the web server will run in SSL on port 8080. 

Now that your web server is running, you can point your Service Cloud Voice Call Center Adapter URL to the web server url (i.e. https://localhost:8080)

## Testing
Lint all the source code and run all the unit tests:
```
$ npm test
```
To bundle the source code in the src/ folder into one connector.js file:
```
$ gulp bundle
```
To bundle the source code in the src/ folder into one minified connector_min.js file:
```
$ gulp bundle --mode prod
```