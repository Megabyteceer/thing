import game from "../game.js";
/// #if EDITOR
import fs from "thing-editor/js/editor/utils/fs.js";
/// #endif

//local data storage

class Settings {
	constructor(storageId) {
		this._storageId = storageId;
		try {
			if (typeof(Storage) !== "undefined") {
				if (localStorage.hasOwnProperty(storageId)) {
					this.data = JSON.parse(localStorage[storageId]);
				}
			}
		} catch(er) {
			this.data = {};
		}
		if (!this.hasOwnProperty('data')) {
			this.data = {};
		}
		this.flush = this.flush.bind(this);
	}
	
	getItem(name, def) {
		if (this.data.hasOwnProperty(name)) {
			return this.data[name];
		}
		return def;
	}
	
	setItem(name, val) {
		if ((val !== this.data[name]) || (typeof(val) === 'object')) {
			this.data[name] = val;
			this.changed();
			if(Settings.globalOnChanged) { // 99999
				Settings.globalOnChanged(name, val);
			}
		}
	}
	
	removeItem(name) {
		if (this.data.hasOwnProperty(name)) {
			delete(this.data[name]);
			this.changed();
		}
	}
	
	changed() {
		if (!this.hasOwnProperty('__flushInterval')) {
			/// #if EDITOR
			if(game.__EDITOR_mode) {
				this.flush();
				return;
			}
			/// #endif
			this.__flushInterval = setTimeout(this.flush, 10, this);
		}
	}

	clear() {
		this.data = {};
		this.changed();
	}
	
	flush() {
		if (typeof(Storage) !== "undefined") {
			delete(this.__flushInterval);
			try {
				localStorage.setItem(this._storageId, JSON.stringify(this.data,
					/// #if EDITOR
					fs.fieldsFilter
					/// #endif
				));
			} catch(er) {
				this.data = this.data || {};
			}
		}
	}
}

export default Settings;

/// #if EDITOR
Settings.prototype.changed.___EDITOR_isHiddenForChooser = true;
Settings.prototype.flush.___EDITOR_isHiddenForChooser = true;
Settings.prototype.getItem.___EDITOR_isHiddenForChooser = true;
/// #endif