/*global require */
/*global __dirname */
/*global __filename */
/*global process */

const path = require('path');
const fs = require('fs');

if((process.argv.indexOf('-access-granted') < 0) && process.platform.startsWith('win')) {
	console.log('Windows detected. Attempt to grant admin access ' + process.platform);
	var sudo = require('sudo-prompt');
	var options = {
		name: 'ThingEditor'
	};
	sudo.exec('node "' + __filename + '" -access-granted', options,
		function (error, stdout) {
			if (error) throw error;
			console.log("out: " + stdout);
		}
	);
} else {
	console.log('Access for making symlinks granted');

	const symlinksMaker = require('./symlinks-maker.js');

	var clientLibs = [
		['./thing-editor/node_modules', '../node_modules', 'dir'],
		['../../thing-editor', '../node_modules/thing-editor', 'dir']
	];

	symlinksMaker.setRootPath(path.resolve(__dirname) + '/../');
	symlinksMaker.makeSymlinks(clientLibs);

	copyRecursiveSync(path.join(__dirname, 'vscode.folder.settings'), path.join(__dirname, '../../'));
}

function copyRecursiveSync(src, dest) {
	var exists = fs.existsSync(src);
	var stats = exists && fs.statSync(src);
	var isDirectory = exists && stats.isDirectory();
	if (exists && isDirectory) {
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest);
		}
		fs.readdirSync(src).forEach(function (childItemName) {
			copyRecursiveSync(path.join(src, childItemName),
				path.join(dest, childItemName));
		});
	} else {
		if (!fs.existsSync(dest)) {
			fs.linkSync(src, dest);
		}
	}
}