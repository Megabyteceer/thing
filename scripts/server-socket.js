/*global require */
/*global process */
/*global module */

let PORT = 32024;

let spinnerShown = 0;

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: PORT });
let clientsConnected = 0;
let clientSocket;

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(data) {
		data = JSON.parse(data);
		if(data.hasOwnProperty('exitWithResult')) {
			process.env.buildProjectAndExit = null;
			let result = data.exitWithResult;
			if(result.error) {
				console.error(result.error);
			} else if(result.success) {
				console.log(result.success);
			}
			process.exit(result.error ? 1 : 0);
		} else if(data.hasOwnProperty('log')) {
			console.log(data.log);
		}
	});
	ws.on('close', function onWsClose() {
		if(process.env.buildProjectAndExit) {
			console.error('thing-editor closed connection unexpectedly.');
			process.exit(1);
		}
		clientsConnected--;
		clientSocket = null;
	});
	clientsConnected++;
	ws.send(JSON.stringify({clientsConnected}));
	if(clientsConnected > 1) {
		ws.close();
	} else {
		clientSocket = ws;
	}

	for(let i = 0; i < spinnerShown; i++) {
		module.exports.showSpinner(true);
	}
});


function send(data) {
	if(clientSocket) {
		clientSocket.send(JSON.stringify(data));
	}
}

module.exports = {
	notify: function notify(notifyText) {
		send({notifyText});
	},
	filesChanged: function(filesChanged) {
		send({filesChanged});
	},
	showSpinner: function(isReshow) {
		if(!isReshow) {
			spinnerShown++;
		}
		send({showSpinner: true});
	},
	hideSpinner: function() {
		spinnerShown--;
		send({hideSpinner: true});
	}
};