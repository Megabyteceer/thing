/*
	Usage:
----------------------------------------------------------------
	// single promise
	SceneLinkedPromise.promise((resolve, reject, promise) => {
		resolve(data);
	}, owner).then((data) => {
		
	}).catch((error) => {
		
	}).finally(() => {
		
	});

------------------------------------------------------------------------
	// list of promises
	SceneLinkedPromise.all([promise, promise], owner). then((dataArray) => {

	});

*/

import Container from "./container.js";
import Pool from "../utils/pool.js";
import game from "../game.js";
/// #if EDITOR
import Lib from "../lib.js";
/// #endif

const EMPTY_RESULT_SYMBOL = {};
let promiseIDCounter = 0;

export default class SceneLinkedPromise extends Container {

	static promise(handler, container = game.currentContainer) {
		assert(!game.__EDITOR_mode, "Attempt to create SceneLinkedPromise.promise() in editing mode.", 10057);
		
		let d = Pool.create(SceneLinkedPromise);
		/// #if EDITOR
		Lib._constructRecursive(d);
		Lib.__reassignIds(d);
		/// #endif
		container.addChild(d);
		/// #if EDITOR
		d.throttlingDelay = Math.round(Math.random() * 15);
		d.name = 'Promise: ' + (handler.name || 'anonymous function');
		d.___stack = editor.__getCurrentStack('SceneLinkedPromise');
		/// #endif
		d._promiseWaitForResult = true;
		let promiseId = promiseIDCounter++;
		d._promiseId = promiseId;



		handler(
			(data) => {
				if(d._promiseId === promiseId) {
					assert(d._promiseResultWaiting === EMPTY_RESULT_SYMBOL, "SceneLinkedPromise is resolved already.", 10058);
					assert(d._promiseErrorWaiting === EMPTY_RESULT_SYMBOL, "SceneLinkedPromise is rejected already.", 10059);
					d._promiseResultWaiting = data;
				}
			},		
			(error) => {
				if(d._promiseId === promiseId) {
					assert(d._promiseResultWaiting === EMPTY_RESULT_SYMBOL, "SceneLinkedPromise is resolved already.", 10058);
					assert(d._promiseErrorWaiting === EMPTY_RESULT_SYMBOL, "SceneLinkedPromise is rejected already.", 10059);
					d._promiseErrorWaiting = error;
				}
			}, d);

		return d;
	}

	static resolve(data) {
		return SceneLinkedPromise.promise((r) => {
			r(data);
		});
	}

	static all(promises, container = game.currentContainer) {
		let results = [];
		let count = promises.length;
		return SceneLinkedPromise.promise((resolve, reject, promise) => {
			promises.some((p, i) => {
				assert(p instanceof SceneLinkedPromise, "SceneLinkedPromise expected", 10060);
				promise.addChild(p);
				p.then((data) => {
					results[i] = data;
				});
				p.catch((error) => {
					results = [];
					results[i] = error;
					reject(results);
					results = null;
				});
				p.finally(() => {
					assert(count > 0, "SceneLinkedPromise.all has more resolves that expected.");
					count--;
					if(count === 0) {
						if(results) {
							resolve(results);
						}
					}
				});
			});

		}, container);
	}

	onRemove() {
		super.onRemove();
		/// #if EDITOR
		if(!game.__EDITOR_mode && !game.__EDITOR_game_stopping) {
			if(this._promiseWaitForResult) {
				editor.ui.status.warn('SceneLinkedPromise was removed before its resolved or rejected.', 10061, this);
			}
		} else {
			this._promiseWaitForResult = false;
		}
		/// #endif

		if(this._promiseWaitForResult) {
			this._promiseWaitForResult = false;
			this._handleFinally();
		}
		
		this._promiseId = -1;
		this._rejectHandlers.length = 0;
		this._resolveHandlers.length = 0;
		this._finallyHandlers.length = 0;
		this._promiseResultWaiting = EMPTY_RESULT_SYMBOL;
		this._promiseErrorWaiting = EMPTY_RESULT_SYMBOL;
	}


	then(handler) {
		this._resolveHandlers.push(handler);
		return this;
	}

	catch(handler) {
		this._rejectHandlers.push(handler);
		return this;
	}

	finally(handler) {
		this._finallyHandlers.push(handler);
		return this;
	}
	
	constructor() {
		super();
		assert(arguments.length === 0, "Please use SceneLinkedPromise.promise((resolve, reject) => {}), instead of 'new SceneLinkedPromise'");
		this._resolveHandlers = [];
		this._finallyHandlers = [];
		this._rejectHandlers = [];
		this.visible = false;
		this._promiseResultWaiting = EMPTY_RESULT_SYMBOL;
		this._promiseErrorWaiting = EMPTY_RESULT_SYMBOL;
	}

	_handleFinally() {
		/// #if DEBUG
		let id = this._promiseId;
		let errorTimeout = setTimeout(() => {
			if(id === this._promiseId) {
				this._turnPromiseRejected('Exception in SceneLinkedPromise finally handler.');
			}
			game._reanimateTicker();
		});
		
		/// #endif

		while(this._finallyHandlers.length > 0) {
			/// #if DEBUG
			(this._finallyHandlers.shift())();
			continue;
			/// #endif

			try { // eslint-disable-line no-unreachable
				(this._finallyHandlers.shift())();
			} catch (err) { // eslint-disable-line no-empty
				setTimeout(() => {
					throw(err);
				}, 0);
				this._turnPromiseRejected(err); // eslint-disable-line no-unreachable
				return;
			}
		}
		/// #if DEBUG
		clearTimeout(errorTimeout);
		/// #endif
		this._promiseWaitForResult = false;
	}

	_turnPromiseRejected(err) {
		if(this._promiseErrorWaiting === EMPTY_RESULT_SYMBOL) {
			this._resolveHandlers.length = 0;
			this._promiseResultWaiting = EMPTY_RESULT_SYMBOL;
			this._promiseErrorWaiting = err;
		}
	}

	update() {
		/// #if EDITOR
		if(this.throttlingDelay > 0) {
			this.throttlingDelay--;
			return;
		}
		/// #endif

		if(this._promiseResultWaiting !== EMPTY_RESULT_SYMBOL) {
			let r = this._promiseResultWaiting;
			/// #if DEBUG
			let __passedHandlersDebug = [];

			let id = this._promiseId;
			let errorTimeout = setTimeout(() => {
				if(id === this._promiseId) {
					this._turnPromiseRejected('Exception in SceneLinkedPromise handler.');
				}
				game._reanimateTicker();
			});

			/// #endif
			while(this._resolveHandlers.length > 0) {
				/// #if DEBUG
				let handler = this._resolveHandlers.shift(); //in debug build no catch errors to 
				let currentResult = handler(r);
				__passedHandlersDebug.push({handler, currentResult});
				if(typeof currentResult !== 'undefined') {
					r = currentResult;
				}
				continue;
				/// #endif
				
				try { // eslint-disable-line no-unreachable
					let currentResult = (this._resolveHandlers.shift())(r);
					if(typeof currentResult !== 'undefined') {
						r = currentResult;
					}
				} catch (err) { // eslint-disable-line no-empty
					if(this._rejectHandlers.length === 0) {
						setTimeout(() => {
							throw(err);
						}, 0);
					}

					this._turnPromiseRejected(err); // eslint-disable-line no-unreachable
					return;
				}
			}
			/// #if DEBUG
			clearTimeout(errorTimeout);
			/// #endif

			this._handleFinally();
		}
		if(this._promiseErrorWaiting !== EMPTY_RESULT_SYMBOL) {
			let r = this._promiseErrorWaiting;
			/// #if DEBUG
			let __passedHandlersDebug = [];

			/// #endif
			while(this._rejectHandlers.length > 0) {
				/// #if DEBUG
				
				let handler = this._rejectHandlers.shift();
				let currentResult = handler(r);
				__passedHandlersDebug.push({handler, currentResult});
				if(typeof currentResult !== 'undefined') {
					r = currentResult;
				}
				continue;
				/// #endif

				try { // eslint-disable-line no-unreachable
					let currentResult = (this._rejectHandlers.shift())(r);
					if(typeof currentResult !== 'undefined') {
						r = currentResult;
					}
				} catch (err) { // eslint-disable-line no-empty
					if(this._rejectHandlers.length === 0) {
						setTimeout(() => {
							throw(err);
						}, 0);
					}
				}
			}
			this._handleFinally();
		}
		super.update();
		if(!this._promiseWaitForResult) {
			this.remove();
		}
	}
}

/// #if EDITOR
__EDITOR_editableProps(SceneLinkedPromise, [
	{
		type: 'splitter',
		title: 'SceneLinkedPromise:',
		name: 'SceneLinkedPromise'
	},
	{
		name: '___stack',
		type: "ref",
		onClick: (val) => {
			editor.showStack(val);
		}
	}
]);
SceneLinkedPromise.__EDITOR_icon = 'tree/promise';
/// #endif