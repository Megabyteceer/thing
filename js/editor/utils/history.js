import Lib from "thing-editor/js/engine/lib.js";
import game from "thing-editor/js/engine/game.js";
import Scene from "thing-editor/js/engine/components/scene.js";
import Signal from "./signal.js";

const HISTORY_LEN = 100;
const STRICT_HISTORY_LEN = 20;

let undosStack = {}; //separated undo/redo array for scene and each modal objects
let redosStack = {};
let historyUi;

let instance;

let lastAppliedTreeData;

function applyState(state) {
	assert(state, 'Empty history record');
	assert(game.__EDITOR_mode);
	let stateChanged = state.treeData !== lastAppliedTreeData;
	if(stateChanged) {
		instance.beforeHistoryJump.emit();
		let node = Lib._deserializeObject(state.treeData);
		game.__setCurrentContainerContent(node);
	}
	editor.selection.loadSelection(state.selectionData);
	game.stage.x = state.selectionData._stageX;
	game.stage.y = state.selectionData._stageY;
	game.stage.scale.x = game.stage.scale.y = state.selectionData._stageS;
	lastAppliedTreeData = state.treeData;
	historyUi.forceUpdate();
	if(stateChanged) {
		instance.afterHistoryJump.emit();
	}
}

function getHistoryName() {
	if((typeof game === 'undefined') || !game.currentContainer) {
		return;
	}
	let n = game.currentContainer.name;
	assert(n, 'currentContainer name is empty.');
	if(game.currentContainer instanceof Scene) {
		n = 's/' + n;
	} else {
		n = 'p/' + n;
	}
	return n;
}

class History {
	
	constructor() {
		this.undo = this.undo.bind(this);
		this.redo = this.redo.bind(this);
		this.isRedoAvailable = this.isRedoAvailable.bind(this);
		this.isUndoAvailable = this.isUndoAvailable.bind(this);
		instance = this;
		this.beforeHistoryJump = new Signal();
		this.afterHistoryJump = new Signal();

		window.addEventListener('mouseup', this.scheduleHistorySave);
		window.addEventListener('keyup', this.scheduleHistorySave);

	}

	_sceneModifiedInner(saveImmediately) {
		clearSelectionSaveTimer();
		if(game.__EDITOR_mode) {
			needHistorySave = true;
			if(saveImmediately) {
				instance.scheduleHistorySave();
			}
		}
	}

	scheduleHistorySave() {
		if(!historySaveScheduled) {
			historySaveScheduled = setTimeout(() => {
				historySaveScheduled = null;
				instance.saveHistoryNow();
			}, 1);
		}
	}
	
	scheduleSelectionSave() {
		clearSelectionSaveTimer();
		if(game.__EDITOR_mode) {
			needSaveSelectionInToHistory = setTimeout(saveSelectionState, 50);
		}
	}

	saveHistoryNow() {
		if(needHistorySave) {
			clearSelectionSaveTimer();
			instance.addHistoryState();
			needHistorySave = false;
			if(historySaveScheduled) {
				clearInterval(historySaveScheduled);
				historySaveScheduled = null;
			}
		}
	}

	isRedoAvailable() {
		let r = this._redos;
		return r && r.length > 0;
	}

	isUndoAvailable() {
		let u = this._undos;
		return u && u.length > 1;
	}

	get _undos() {
		let n = getHistoryName();
		if(!n) {
			return[];
		}
		if(!undosStack.hasOwnProperty(n)) {
			undosStack[n] = [];
		}
		return undosStack[n];
	}

	get _redos() {
		let n = getHistoryName();
		if(!n) {
			return[];
		}
		if(!redosStack.hasOwnProperty(n)) {
			redosStack[n] = [];
		}
		return redosStack[n];
	}

	_pushCurrentStateToUndoHistory(selectionData, selectionOnly) {
		assert(game.__EDITOR_mode, "Attempt to use history in running time.");

		let historyRecord = {fieldName: editor._lastChangedFiledName};
		editor._lastChangedFiledName = null;
		if(selectionOnly) {
			if(!this.currentState || arraysEqual(selectionData, this.currentState.selectionData)) {
				return;
			}
			historyRecord.treeData = this.currentState.treeData;
		} else {
			Lib.__invalidateSerializationCache(game.currentContainer);
			historyRecord.treeData = Lib.__serializeObject(game.currentContainer);
			historyRecord.treeData._isModified = true;
		}

		lastAppliedTreeData = historyRecord.treeData;

		this._undos.push(historyRecord);
		this.currentState.selectionData = selectionData;

		//reduce and limit history
		if(this._undos.length > HISTORY_LEN) {
			let i = HISTORY_LEN - 1;
			while (i > STRICT_HISTORY_LEN) {
				i -= 2;
				this._undos.splice(i, 1);
			}
		}
		historyUi.forceUpdate();
	}

	addSelectionHistoryState() {
		this.addHistoryState(true);
	}

	addHistoryState(selectionOnly = false) {
		let selectionData = editor.selection.saveSelection();
		selectionData._stageX = game.stage.x;
		selectionData._stageY = game.stage.y;
		selectionData._stageS = game.stage.scale.x;
		if(!selectionOnly) {
			this._redos.length = 0;
		}
		this._pushCurrentStateToUndoHistory(selectionData, selectionOnly);
	}
	
	undo() {
		if (this.isUndoAvailable()) {
			if(this.currentState.fieldName) {
				editor.ui.propsEditor.selectField(this.currentState.fieldName);
			}
			this._redos.push(this._undos.pop());
			applyState(this.currentState);
		}
	}
	
	redo() {
		if (this.isRedoAvailable()) {
			this._undos.push(this._redos.pop());
			applyState(this.currentState);
			if(this.currentState.fieldName) {
				editor.ui.propsEditor.selectField(this.currentState.fieldName);
			}
		}
	}
	
	get currentState() {
		let undos = this._undos;
		if(undos) {
			return undos[undos.length - 1];
		}
		return null;
	}
	
	clearHistory() {
		this.setCurrentStateUnmodified();
		historyUi.forceUpdate();
	}
	
	updateUi() {
		historyUi.forceUpdate();
	}
	
	setCurrentStateUnmodified() {
		if(this._undos.length === 0 && this._redos.length === 0) {
			this.addHistoryState();
		}
		this._undos.some((s) => {
			s.treeData._isModified = true;
		});
		delete this.currentState.treeData._isModified;
	}
	
	get isStateModified() {
		return this.currentState && this.currentState.treeData._isModified;
	}
	
	buttonsRenderer() {
		return React.createElement(HistoryUi);
	}
}



let historySaveScheduled;
let needHistorySave = false;

class HistoryUi extends React.Component {
	constructor(props) {
		super(props);
		historyUi = this;
	}
	
	render() {
		if(!instance._undos) {
			return R.span();
		}
		return R.span(null,
			R.btn('Undo', editor.history.undo, '(Ctrl + Z)', 'menu-btn', 1090, !instance.isUndoAvailable() || !game.__EDITOR_mode),
			//instance._undos.length,
			R.btn('Redo', editor.history.redo, '(Ctrl + Y)', 'menu-btn', 1089, !instance.isRedoAvailable() || !game.__EDITOR_mode),
			//instance._redos.length
		);
	}
}

let needSaveSelectionInToHistory = false;

function clearSelectionSaveTimer() {
	if(needSaveSelectionInToHistory) {
		clearInterval(needSaveSelectionInToHistory);
		needSaveSelectionInToHistory = null;
	}
}

function saveSelectionState() {
	if(game.__EDITOR_mode) {
		editor.history.addSelectionHistoryState();
	}
	needSaveSelectionInToHistory = false;
}

function arraysEqual(a, b) {
	if(a === b) return true;
	if(a == null || b == null) return false;
	if(a.length !== b.length) return false;

	for (var i = 0; i < a.length; ++i) {
		if(Array.isArray(a[i])) {
			if(!arraysEqual(a[i], b[i])) return false;
		} else {
			if(a[i] !== b[i]) return false;
		}
	}
	return true;
}



let historyInstance = new History();

export default historyInstance;