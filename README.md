# Service Cloud Voice demo connector
The demo connector is a sample application for partner telephony systems that integrate with Salesforce Service Cloud Voice. It demonstrates an optimal Voice implementation based on a group of telephony API mocks. It also includes a voice call simulation tool that you can use to test call actions such as making and answering calls and using phone controls.

## Document
We’ve provided documentation in the [`/docs/`](https://github.com/salesforce/demo-scv-connector/tree/master/docs) folder.

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

Open webpack.config.js and configure the local host web server URL.

- Default value for `devServer.host` is `0.0.0.0`, it allows your server to be accessible externally, you can use `https://127.0.0.1:8080` as the adapter URL without any change in local development, DO NOT use `https://localhost:8080` as it will give CORS error. If you want to configure to use your own specific URL please see details in [the webpack documents](https://webpack.js.org/configuration/dev-server/#devserverhost)

SSL certificate for local HTTPS development

- HTTPS is enabled by default in webpack.config.js, if you don't have a SSL certificate in your local server, you will see a warning page in browser with message "Your connection is not private", and you can choose to preceed to your web server URL.

- To avoid the warning message from the browser, you can setup a self-signed SSL certificate for you local web server using following instructions 
	- Generate key and cert using Openssl like below 
		- mkdir certificates
		- cd certificates
		- openssl genrsa -des3 -passout pass:SomePassword -out server.pass.key 2048
		- openssl rsa -passin pass:SomePassword -in server.pass.key -out server.key
		- rm server.pass.key
		- openssl req -new -key server.key -out server.csr
		- openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt	
	- Add generated cert.key(server.key) and cert.pem(server.crt) in demo-connector/ca/	
	- Go to demo-connector/ca folder and double click on the cert.pem file. This should open up the certificate in KeyChain
	- Double click on the demo-connector certificate file in the KeyChain (on Mac) and set the 	
	certificate to be always trusted (the instructions may be different on Windows or Linux)
	
### Launch application 
 
```
$ npm start
```

By default the web server will run in SSL on port 8080. 

Now that your web server is running, you can point your Service Cloud Voice Call Center Adapter URL to the web server URL (i.e. https://example.com:8080)

### Voice call simulation tool
This application also provides a voice call simulation tool that you can use to test call actions such as making and answering calls and using phone controls. When the app is running you can find it by going to this URL {your web server URL}/remote (i.e. https://example.com:8080/remote). You can use this URL to verify the installation succeed.

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
