# Service Cloud Voice demo connector
The demo connector is a sample application for partner telephony systems that integrate with Salesforce Service Cloud Voice. It demonstrates an optimal Voice implementation based on a group of telephony API mocks. It also includes a voice call simulation tool that you can use to test call actions such as making and answering calls and using phone controls.

## Document
We’ve provided documentation in the `/docs/` folder.

## Installation

### Environment setup
The developer environment requires [Node](https://nodejs.org/en/download/), [NPM](https://docs.npmjs.com/cli/install) and [webpack-dev-server](https://webpack.github.io/docs/webpack-dev-server.html). 


### Installation
#### Clone this repo
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

## Contributing and Developing Locally
We welcome contributors into our repo. Please read the [contributing guidelines](https://github.com/salesforce/demo-scv-connector/blob/master/CONTRIBUTING.md) for more information.