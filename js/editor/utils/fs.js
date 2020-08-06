import ws from "./socket.js";
import Group from "../ui/group.js";

let fs = {
	chooseProject: (enforced) => {
		editor.ui.viewport.stopExecution();
		fs.getJSON('/fs/projects').then((data) => {
			editor.ui.modal.showModal(R.div({className:'project-open-chooser'}, Group.groupArray(data.map(renderProjectItem))), R.span(null, R.icon('open'), 'Choose project to open:'), enforced)
				.then((projDir) => {
					if(projDir) {
						editor.openProject(projDir);
					}
				});
		});
	},
	refreshFiles: () => {
		return fs.getJSON('/fs/enum').then((data) => {
			fs.filesExt = {};
			fs.files = {};
			if(data.hasOwnProperty('libsSettings')) {
				fs.libsSettings = data.libsSettings;
				delete data.libsSettings;
			} else {
				fs.libsSettings = {};
			}

			for(let type in data) {
				let files = data[type];
				files.sort((a,b) => {
					return b.mtime - a.mtime;
				});

				fs.filesExt[type] = files;
				fs.files[type] = files.map(f => f.name).sort();
			}
		});
	},
	deleteFile: (fileName) => {
		ws.ignoreFileChanging(fileName);
		return fs.getJSON('/fs/delete?f=' + encodeURIComponent(editor.game.resourcesPath + fileName), true, false).then((data) => {
			ws.notIgnoreFileChanging(fileName);
			if(data.error) {
				editor.ui.modal.showError(data.error);	
			}
		});
	},
	editFile: (fileName, line = -1, char = -1) => {
		if(editor.buildProjectAndExit) {
			return;
		}
		let now = Date.now();
		let lastEdit = filesEditTimes[fileName];
		if(lastEdit && lastEdit >  (now - 10000)) {
			return;
		}
		filesEditTimes[fileName] = now;

		let url = '/fs/edit?f=' + encodeURIComponent(fileName);
		if(line >= 0) {
			url += '&l=' + line;
		}
		if(char >= 0) {
			url += '&c=' + char;
		}
		fs.getJSON(url, true);
	},
	getJSON(url, silently=false, async = true, isJSON = true) { //eslint-disable-line no-unused-vars
		if (!silently || !async) {
			editor.ui.modal.showSpinner();
		}
		return new Promise((resolve) => {
			AJAX_ordered(url, {
				method: "GET",
				headers: isJSON ? {'Content-Type': 'application/json'} : undefined
			}, async, (returnedUrl, data) => {
				assert(url === returnedUrl, 'Response is not match with request');
				if (!silently || !async) {
					editor.ui.modal.hideSpinner();
				}
				if (data) {
					if (isJSON && (typeof data === 'string')) {
						data = JSON.parse(data);
					}
					resolve(data);
				}
			});
		});
	},
	exec(filename) {
		this.postJSON('/fs/exec', {
			filename
		});
	},
	openFile(fileName, silently) {
		return this.getJSON(editor.game.resourcesPath + fileName, silently);
	},
	postJSON(url, data, silently = false, async = false) {//eslint-disable-line no-unused-vars
		return new Promise((resolve) => {
			if (!silently || !async) {
				editor.ui.modal.showSpinner();
			}
			AJAX_ordered(url, {
				method: "POST",
				body: JSON.stringify(data),
				headers: {'Content-Type': 'application/json'}
			}, async, (returnedUrl, data) => {
				assert(url === returnedUrl, 'Response is not match with request');
				
				if (!silently || !async) {
					editor.ui.modal.hideSpinner();
				}
				if(data) {
					data = JSON.parse(data);
				}
				resolve(data);
			});
		});
	},
	saveFile(filename, data, silently = false, async = false) { 
		if(typeof data !== 'string') {
			data = JSON.stringify(data, fieldsFilter, '	');
		}
		ws.ignoreFileChanging(filename);
		return fs.postJSON('/fs/savefile', {data, filename : editor.game.resourcesPath + filename}, silently, async).then((data) => {
			if(data.error) {
				editor.ui.modal.showError(data.error);	
			}
			ws.notIgnoreFileChanging(filename);
		});
	}
};

const fieldsFilter = (key, value) => {
	if(!key.startsWith('___')) {
		return value;
	}
};

fs.fieldsFilter = fieldsFilter;

const filesEditTimes = {};

export default fs;

function getIconPath(desc) {
	return '/games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem(desc, i) {
	let icon;
	if (desc.icon) {
		icon = R.img({src: getIconPath(desc)});
	}
	let key = desc.__group ? desc.__group + '/' + i : i;
	return R.div({
		className: 'project-item-select clickable', key, onClick: () => {
			editor.ui.modal.hideModal(desc.dir);
		}
	}, icon, desc.title);
}

let requestInProgress = false;
let inProgress = [];

function next() {
	if(inProgress.length) {
		(inProgress.shift())();
	}
}

function AJAX_ordered(url, options, async, callback) {
	const attempt = () => {
		if(!async) {
			requestInProgress = true;
		}
		fetch(url, options).then((response) => {
			response.text().then((txt) => {
				if(!async) {
					requestInProgress = false;
				}
				callback(url, txt);
				next();
			}).catch((err) => {
				editor.ui.modal.showFatalError('fs error: ' + err.message + '; ' + url);
			});
		});
	};

	if(requestInProgress && !async) {
		inProgress.push(attempt);
	} else {
		attempt();
	}
}