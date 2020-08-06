import game from "../game.js";

let downedKeys = {};
const keyUpsToApply = [];

let w = window;
try {
	while(w) {
		w.addEventListener('keydown', (ev) => {
			downedKeys[ev.keyCode] = true;

			/// #if EDITOR
			return;
			/// #endif
			if(ev.keyCode >= 37 && ev.keyCode <= 40) { //eslint-disable-line no-unreachable
				ev.preventDefault();
			}

			//console.log(ev.keyCode);
		});

		w.addEventListener('keyup', (ev) => {

			/// #if EDITOR
			if(game.__EDITOR_mode) {
				downedKeys[ev.keyCode] = false;
				return;
			}
			/// #endif
			keyUpsToApply.push(ev.keyCode);
		});

		if(w .parent !== w) {
			w = w.parent;
		} else {
			break;
		}
	}
} catch (e) {
	/// catch parent window acess for iframed on another websites
}

export default class Keys {

	static update() {
		while(keyUpsToApply.length > 0) {
			downedKeys[keyUpsToApply.pop()] = false;
		}
	}

	static get all() {
		return downedKeys;
	}

	static get up() {
		return downedKeys[38] || downedKeys[87];
	}

	static set up(val) {
		if(val) {
			downedKeys[38] = true;
		} else {
			downedKeys[38] = false;
			downedKeys[87] = false;
		}
	}

	static get down() {
		return downedKeys[40] || downedKeys[83];
	}

	static set down(val) {
		if(val) {
			downedKeys[40] = true;
		} else {
			downedKeys[40] = false;
			downedKeys[83] = false;
		}
	}

	static get shiftKey() {
		return downedKeys[16];
	}

	static get altKey() {
		return downedKeys[18];
	}

	static get ctrlKey() {
		return downedKeys[17];
	}

	static get left() {
		return downedKeys[37] || downedKeys[65];
	}

	static set left(val) {
		if(val) {
			downedKeys[37] = true;
		} else {
			downedKeys[37] = false;
			downedKeys[65] = false;
		}
	}

	static get right() {
		return downedKeys[39] || downedKeys[68];
	}

	static set right(val) {
		if(val) {
			downedKeys[39] = true;
		} else {
			downedKeys[39] = false;
			downedKeys[68] = false;
		}
	}

	static isKeycodePressed(keyCode) {
		return downedKeys[keyCode];
	}

	static resetAll() {
		downedKeys = {};
	}
}

/// #if EDITOR
Keys.resetAll.___EDITOR_isGoodForChooser = true;
Keys.isKeycodePressed.___EDITOR_isGoodForChooser = true;
Keys.update.___EDITOR_isHiddenForChooser = true;


/// #endif