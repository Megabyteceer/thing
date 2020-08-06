const path = require("path");
const fs = require('fs');
const md5File = require('md5-file');

const {
	exec
} = require('child_process');

/*global require */
/*global module */

const wss = require('./server-socket.js');

module.exports = function (projectPath, callback, options) {
	let result = {};
	let soundsPath = path.join(projectPath, 'snd/');
	if(!fs.existsSync(soundsPath)) {
		callback(result);
		return;
	}
	
	function outputError(err, outError, out) {
		if(!result.errors) {
			result.errors = [];
		}
		result.errors.push({err, out, outError});
		console.error(err);
	}

	let cache;
	let cacheFn = path.join(projectPath, 'snd/snd-convert-cache.json');
	if (fs.existsSync(cacheFn)) {
		cache = JSON.parse(fs.readFileSync(cacheFn));
	} else {
		cache = {};
	}
	let filesToConvert = [];

	
	let files = walkSync(soundsPath);
	for (let fn of files) {
		if (fn.endsWith('.wav')) {
			let s = fs.statSync(fn);

			let shortName = fn.replace(/\\/g, '/');
			shortName = shortName.split('/snd/');
			shortName.shift();
			shortName = shortName.join('/snd/');

			let bitrate = getBitrate(fn);

			let fileNameWithoutExt = fn.replace(/wav$/gmi, '');
			let allTargetFilesExists = options.formats.every((ext) => {
				return fs.existsSync(fileNameWithoutExt + ext);
			});

			let hash;
			if(cache.hasOwnProperty(shortName) && (s.mtimeMs !== cache[shortName].mtimeMs)) {
				hash = md5File.sync(fn);
				if(cache[shortName].hash === hash) {
					cache[shortName].mtimeMs = s.mtimeMs;
				}
			}

			if (!allTargetFilesExists || (options.noCacheSoundName === shortName) || !cache.hasOwnProperty(shortName) || (s.mtimeMs !== cache[shortName].mtimeMs) || (bitrate !== cache[shortName].bitrate)) {
				filesToConvert.push(fn);
				if(!hash) {
					hash = md5File.sync(fn);
				}
				cache[shortName] = {
					mtimeMs: s.mtimeMs,
					bitrate,
					hash
				};
			}
		}
	}
	if (filesToConvert.length < 1) {
		callback(result);
		return;
	}

	function convertNextFile() {
		if (filesToConvert.length < 1 || result.errors) {
			if(!result.errors) {
				fs.writeFileSync(cacheFn, JSON.stringify(cache));
			}
			callback(result);
		} else {
			let fn = filesToConvert.pop();

			let f = options.formats.slice(0);
			const conv = () => {
				if (f.length < 1) {
					convertNextFile();
				} else {
					result.updated = true;
					convertFile(fn, f.pop(), conv);
				}
			};
			conv();
		}
	}

	convertNextFile();

	function getBitrate(fn) {
		let shortFilename = fn.replace(soundsPath, '');
		shortFilename = shortFilename.replace(/\.wav$/gmi, '');
		shortFilename = shortFilename.replace('\\', '/');
		return options.bitrates[shortFilename] || options.defaultBitrate || 96;
	}

	function convertFile(fn, ext, cb) {
		let bitrate = getBitrate(fn);

		let logTxt = 'convert sound:' + fn + ' -> ' + ext + ' ' + bitrate + 'Kb';
		console.log(logTxt);
		wss.notify(logTxt);
		let fileParts = path.parse(fn);
		let resultName = fileParts.dir + '/' + fileParts.name + '.' + ext;

		if(fs.existsSync(resultName)) {
			fs.unlinkSync(resultName);
		}

		let additionalOptions = '';
		if(ext === 'webm') {
			additionalOptions = '-dash 1 ';
		}

		additionalOptions += '-b:a ' + bitrate + 'k ';

		let timoutCounter = 0;

		let errorArgs;

		function conversionAttempt() {
			timoutCounter++;
			if(timoutCounter > 5) {
				if(errorArgs) {
					outputError.apply(null, errorArgs);
				}
				cb();
				return;
			}

			try {
				fs.accessSync(fn, fs.constants.R_OK | fs.constants.W_OK);
			} catch(err) {
				console.log('file reading blocked: ' + fn);
				setTimeout(conversionAttempt, 1000);
				return;
			}


			exec('ffmpeg -i "' + fn + '" ' + additionalOptions + ' "' + resultName + '"', (err, out, outError) => {
				if (err) {
					errorArgs = [err, outError, out];
					console.log(err, out);
					console.error(outError);
					setTimeout(conversionAttempt, 1000);
				} else {
					cb();
				}
			});
		}
		conversionAttempt();
	}
};


//=========== enum files ================================
const walkSync = (dir, filelist = []) => {
	fs.readdirSync(dir).forEach(file => {
		let stats = fs.statSync(path.join(dir, file));

		if (stats.isDirectory()) {
			filelist = walkSync(path.join(dir, file), filelist);
		} else if (stats.size > 0) {
			filelist.push(path.join(dir, file));
		}
	});
	return filelist;
};