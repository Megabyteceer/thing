import game from "../game.js";

/// #if DEBUG
window.assert = (expression, message, errorCode) => {
	message = 'Assert: ' + message;
	if (!expression) {
		/// #if EDITOR
		if (window.editor) {
			editor.ui.modal.showError(message, errorCode);
		}
		if(game.__EDITOR_mode) {
			editor.saveBackup();
		}
		/*
		/// #endif
		alert(message);
		//*/
		
		throw message;
	}
};


let originalFetch = window.fetch;

window.fetch = (url, options) => {
	
	url = canonicalize(url);
	
	if(!game.projectDesc || !game.projectDesc.__proxyFetchesViaNodeServer || url.startsWith(location.origin)) {
		return originalFetch(url, options);
	} else {
		let headers = new Headers();
		headers.append("Content-Type", "application/json");
		return originalFetch('/fs/fetch', {
			method: 'POST',
			headers,
			body: JSON.stringify({url, options})
		}).then((r) => {
			return r;
		});
	}
};

function canonicalize(url) {
	let div = document.createElement('div');
	div.innerHTML = "<a></a>";
	div.firstChild.href = url; // Ensures that the href is properly escaped
	let html = div.innerHTML;
	div.innerHTML = html; // Run the current innerHTML back through the parser
	return div.firstChild.href;
}

/// #endif

/**
 * Moves value to target value with step
 * @param {number} val - start value
 * @param {number} to - target value
 * @param {number} step - step
 */

const PI2 = Math.PI * 2;

const stepTo = (val, to, step) => {
	if(Math.abs(val-to) <= step) return to;
	if(val > to) {
		return val - step;
	}
	return val + step;
};

const stepToR = (val, target, step) => {  
	if ((target - val) > Math.PI) {
		val += PI2;
	} else if ((target - val) < -Math.PI) {
		val -= PI2;
	}
	if (Math.abs(val - target) <= step) {
		return target;
	}
	if (val < target) {
		return val + step;
	}
	return val - step;
};

function deepClone(o) { /// 99999
	return JSON.parse(JSON.stringify(o));
}

export {stepTo, stepToR, deepClone};