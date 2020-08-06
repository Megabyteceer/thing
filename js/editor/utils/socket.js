import AssetsLoader from "./assets-loader.js";

const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
	// connected to server socket
};

function addAssetNameInToMap(name, map) {
	if(!map) {
		map = new Map();
	}
	map.set(name.substr(4), true);
	return map;
}

ws.onmessage = function incoming(data) {
	data = JSON.parse(data.data);
	if(data.hasOwnProperty('clientsConnected')) {
		
		if(data.clientsConnected !== 1) {
			editor.ui.modal.showFatalError('Thing-editor already launched.', 20004);
			ws.onclose = undefined;
		} else {
			editor.onServerAllowsWorking();
		}
	} else if(data.hasOwnProperty('notifyText')) {
		editor.ui.modal.notify(data.notifyText);
	} else if(data.hasOwnProperty('showSpinner')) {
		editor.ui.modal.showSpinner();
	} else if(data.hasOwnProperty('hideSpinner')) {
		editor.ui.modal.hideSpinner();
	} else if(data.hasOwnProperty('filesChanged') && editor.projectDesc && !editor.projectOpeningInProgress) {
		let imagesUpdated;
		let soundsUpdated;
		let imagesDeleted;
		let soundsDeleted;
		let srcChanged;
		for(let file of data.filesChanged) {
			if(file.name.startsWith('img/')) {
				if(file.deleted) {
					imagesDeleted = addAssetNameInToMap(file.name, imagesDeleted);
				} else {
					imagesUpdated = addAssetNameInToMap(file.name, imagesUpdated);
				}
			} else if(file.name.startsWith('snd/') && file.name.endsWith('.wav')) {
				if(file.deleted) {
					soundsDeleted = addAssetNameInToMap(file.name, soundsDeleted);
				} else {
					soundsUpdated = addAssetNameInToMap(file.name, soundsUpdated);
				}
			} else if(file.name.endsWith('.js') && !filesIgnoring[file.name]) {
				srcChanged = true;
			} else if(file.name.endsWith('.json') && (file.name.indexOf('/.') < 0) && !file.name.startsWith('snd/') && !filesIgnoring[file.name]) {
				editor.ui.status.warn("File changed externally: " + file.name, 32045);
			}
		}
		
		if(imagesUpdated) {
			AssetsLoader.reloadAssets(true, imagesUpdated);
		}
		if(soundsUpdated && !editor.ui.soundsList.soundsReloadingInProgress) {
			editor.ui.soundsList.reloadSounds(soundsUpdated);
		}
		if(imagesDeleted) {
			AssetsLoader.deleteAssets(imagesDeleted.keys());
		}
		if(soundsDeleted) {
			editor.ui.soundsList.deleteSounds(soundsDeleted.keys());
		}
		if(srcChanged) {
			editor.ui.viewport.jsFilesChanged();
		}
	}
	
};

const filesIgnoring = {};

ws.ignoreFileChanging = function(fileName) {
	if(filesIgnoring[fileName]) {
		filesIgnoring[fileName]++;
	} else {
		filesIgnoring[fileName] = 1;
	}
};

let exitInProgress = false;
ws.exitWithResult = function(success, error) {
	exitInProgress = true;
	ws.send(JSON.stringify({
		exitWithResult:{success, error}
	}));
	setTimeout(() => {
		window.close();
	}, 1000);
};

ws.log = function(txt) {
	ws.send(JSON.stringify({log: txt}));
};

ws.notIgnoreFileChanging = function(fileName) {
	setTimeout(() => {
		assert(filesIgnoring[fileName] > 0, 'ignoring vas no started.');
		filesIgnoring[fileName]--;
		if(filesIgnoring[fileName] === 0) {
			delete filesIgnoring[fileName];
		}
	}, 2000);
};

ws.onclose = function incoming() {
	if(!exitInProgress) {
		closeWindow();
	}
};

function closeWindow() {
	editor.ui.modal.showFatalError("Page can be closed now.", 20005);
}

export default ws;