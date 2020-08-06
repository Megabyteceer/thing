import Group from "./group.js";
import Scene from "thing-editor/js/engine/components/scene.js";
import Lib from "thing-editor/js/engine/lib.js";
import game from "thing-editor/js/engine/game.js";
import PrefabReference from "thing-editor/js/engine/components/prefab-reference.js";
import Container from "thing-editor/js/engine/components/container.js";
import ClassesView from "./classes-view.js";
import OrientationTrigger from "thing-editor/js/engine/components/orientation-trigger.js";
import getValueByPath from "thing-editor/js/engine/utils/get-value-by-path.js";
import {_searchByRegexpOrText} from "../utils/editor-utils.js";

let bodyProps = {className: 'list-view'};

const prefabFileFiler = /^prefabs\/.*\.prefab.json$/gm;
const prefabExtRemover = /.prefab.json$/gm;
const fileNameToPrefabName = (fn) => {
	return fn.replace('prefabs/', '').replace(prefabExtRemover, '');
};

const prefabNameFilter = /[^a-z\-\/0-9_]/g;

let prefabNameProps = {
	className: "selectable-text", title: 'Ctrl+click to copy prefabs`s name', onMouseDown:window.copyTextByClick
};

let instance;

let prefabsStack = [];

export default class PrefabsList extends React.Component {
	
	constructor(props) {
		super(props);
		let filter = editor.settings.getItem('prefabs-filter', '');
		this.state = {filter};
		this.onSelect = this.onSelect.bind(this);
		this.onSaveSelectedAsClick = this.onSaveSelectedAsClick.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddChildClick = this.onAddChildClick.bind(this);
		this.reselectAllowed = true;
		this.searchInputProps = {
			className: 'prefabs-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: filter
		};
		instance = this;
	}

	onSearchChange(ev) {
		let filter= ev.target.value.toLowerCase();
		editor.settings.setItem('prefabs-filter', filter);
		this.setState({filter});
	}
	
	onAddClick(ev) {
		PrefabsList.exitPrefabEdit();
		if (this.state.selectedItem) {
			editor.addToScene(this._loadPrefab(this.state.selectedItem, ev.altKey));
		}
	}

	_loadPrefab(item, asReference) {
		let prefabName = Lib.__getNameByPrefab(item);
		if(!asReference) {
			return Lib.loadPrefab(prefabName);
		} else {
			let ret = ClassesView.loadSafeInstanceByClassName('PrefabReference');
			ret.prefabName = prefabName;
			return ret;
		}
	}
	
	onAddChildClick(ev) {
		PrefabsList.exitPrefabEdit();
		if (this.state.selectedItem) {
			this._addPrefabToChild(this.state.selectedItem, ev.altKey);
		}
	}

	_addPrefabToChild(item, asReference) {
		if(getCurrentPrefabName() === Lib.__getNameByPrefab(item)) {
			PrefabsList.exitPrefabEdit(); // exit to level up
		}
		editor.attachToSelected(this._loadPrefab(item, asReference));
	}
	
	onSaveSelectedAsClick() {
		if (editor.selection.length === 0) {
			editor.ui.modal.showInfo('Nothing is selected in scene.', undefined, 32035);
		} else if (editor.selection.length > 1) {
			editor.ui.modal.showInfo('More that one object selected.', undefined, 32036);
		} else if (editor.ClassesLoader.getClassType(editor.selection[0].constructor) === Scene) {
			editor.ui.modal.showInfo('You can not save Scene as prefab. Please select some object from scene first.', undefined, 32037);
		} else {
			
			let defaultPrefabName = '';
			if (this.state.selectedItem && this.state.selectedItem.p.name) {
				defaultPrefabName = this.state.selectedItem.p.name.split('/');
				defaultPrefabName.pop();
				defaultPrefabName = defaultPrefabName.join('/');
				if (defaultPrefabName) {
					defaultPrefabName += '/';
				}
			}
			
			editor.ui.modal.showPrompt(R.span(null, 'Enter name for new prefab: ', R.sceneNode(editor.selection[0])),
				defaultPrefabName,
				(val) => { // filter
					return val.toLowerCase().replace(prefabNameFilter, '-');
				},
				(val) => { //accept
					if (Lib.prefabs.hasOwnProperty(val)) {
						return "Prefab with such name already exists";
					}
					if (val.endsWith('/') || val.startsWith('/')) {
						return 'name can not begin or end with "/"';
					}
				}
			).then((enteredName) => {
				if (enteredName) {

					const fin = (isConvertedToRef) => {
						if(editor.overlay.isPreviewShowed && !isConvertedToRef) {
							PrefabsList.editPrefab(enteredName);
						}
						this.forceUpdate();
					};

					let s = editor.selection[0];
					Lib.__savePrefab(s, enteredName);
					if(s !== game.currentContainer) {
						editor.ui.modal.showEditorQuestion('Reference?', 'Turn selected in to prefab reference?', () => {
							
							let data = Lib.__serializeObject(s);
							data = {c :"PrefabReference", p: data.p};
							let ref = Lib._deserializeObject(data);
							
							ref.x = s.x; // for cases when save orientation trigger. its clear's x/y before serialization
							ref.y = s.y;
							ref.alpha = s.alpha;
							ref.rotation = s.rotation;
							ref.scale.x = s.scale.x;
							ref.scale.y = s.scale.y;
							
							ref.prefabName = enteredName;
							ref.inheritProps = !(s instanceof OrientationTrigger);

							s.parent.addChildAt(ref, s.parent.getChildIndex(s));
							s.remove();
							
							Lib.__invalidateSerializationCache(ref.parent);

							editor.ui.sceneTree.selectInTree(ref);

							editor.refreshTreeViewAndPropertyEditor();
							editor.sceneModified(true);
							fin(true);
						}, 'Convert to PrefabReference', fin, 'Keep as copy', true);
					} else {
						fin();
					}
					
				}
			});
		}
	}

	static editPrefab(name, stepInToStack = false) {
		if (game.__EDITOR_mode) {
			if(!Lib.hasPrefab(name)) {
				editor.ui.modal.showError("No prefab with name " + name + " exists.");
				return;
			}
			let a = prefabsStack.slice();
			PrefabsList.acceptPrefabEdition();
			if(stepInToStack) {
				prefabsStack = a;
			}
			let preview = Lib.loadPrefab(name);
			__getNodeExtendData(preview).isPreviewObject = true;
			editor.overlay.showPreview(preview);
			editor.ui.sceneTree.selectInTree(preview);
			editor.ui.viewport.setPrefabMode(name);
			editor.history.clearHistory();
			prefabsStack.push(name);
			instance.setState({selectedItem: (Lib._getAllPrefabs())[name]});
		}
	}
	
	onSelect(item, ev, currentItem) {
		if(ev.altKey) {
			while(editor.selection[0] instanceof PrefabReference) {
				let p = editor.selection[0].parent;
				if(p === editor.game.stage) {
					break;
				}
				editor.selection.clearSelection();
				editor.selection.add(p);
			}
			this._addPrefabToChild(item, true);
			return currentItem;
		} else {
			PrefabsList.editPrefab( Lib.__getNameByPrefab(item));
		}
	}
	
	onPrefabDeleteClick(prefabName) {
		editor.ui.modal.showEditorQuestion('Are you sure?', R.span({className:'danger'},
			'Are you sure you want to delete prefab: ', R.b(null, prefabName), ' ?',
			R.br(),
			'You cannot undo this action.'
		),() => {
			Lib.__deletePrefab(prefabName);
			if(getCurrentPrefabName() === prefabName) {
				PrefabsList.exitPrefabEdit();
			}
			this.forceUpdate();
		}, 'Delete');

	}

	renderItem(prefabName, item) {
		let cls;
		if(Lib.__hasClass(item.c)) {
			cls = Lib.getClass(item.c);
		} else {
			cls = Container;
			editor.ui.status.warn('Prefab "' + prefabName + '" has unknown type: ' + item.c, 32018, () => {
				PrefabsList.editPrefab(prefabName);
			});
		}
		return R.div({onDoubleClick:() => {
			editor.editClassSource(cls);
		}, key: prefabName, className:'prefab-list-item'},
		R.listItem(R.span(null,
			item.___libInfo ? item.___libInfo.icon : undefined,
			R.classIcon(cls), R.b(prefabNameProps, prefabName), ' (' + cls.name + ')',
			R.btn('×', () => {
				this.onPrefabDeleteClick(prefabName);
			}, 'Delete prefab...', 'danger-btn delete-scene-btn')
		
		), item, prefabName, this)
		);
	}
	
	render() {
		let scenePrefabs = Lib._getAllPrefabs();
		
		let panelClassName = this.state.selectedItem ? '' : 'unclickable';
		
		let prefabs = [];
		let prefabsNames = Object.keys(scenePrefabs);
		prefabsNames.sort();

		for (let prefabName of prefabsNames) {
			let item = scenePrefabs[prefabName];
			if(_searchByRegexpOrText(prefabName, this.state.filter) || (this.state.selectedItem === item)) {
				prefabs.push(this.renderItem(prefabName, item));
			}
		}
		if(!this.state.filter) {
			prefabs = Group.groupArray(prefabs);
		}
		return R.fragment(
			R.span({className: panelClassName},
				R.btn('Add', this.onAddClick, 'Add prefab to scene. (Hold Alt key to add prefab as Reference)'),
				R.btn('Child', this.onAddChildClick, 'Add prefab as children. (Hold Alt key to add prefab as Reference)')
			),
			R.btn('Save...', this.onSaveSelectedAsClick, 'Save currently selected on scene object as new prefab.'),
			R.input(this.searchInputProps),
			R.div(bodyProps, prefabs)
		);
	}

	static acceptPrefabEdition(oneStepOnly = false) {
		for(let f of editor.checkSceneHandlers) {
			f();
		}

		if(document.activeElement && document.activeElement.tagName === "INPUT") {
			document.activeElement.blur();
		}
		let name = getCurrentPrefabName();
		let isChanged = prefabsStack.length && editor.isCurrentContainerModified;
		if(isChanged) {
			editor.history.setCurrentStateUnmodified();
			editor._callInPortraitMode(() => {
				Lib.__savePrefab(game.currentContainer, getCurrentPrefabName());
			});
			editor.ui.prefabsList.forceUpdate();
		}
		PrefabsList.exitPrefabEdit(oneStepOnly);
		if(isChanged) {
			PrefabReference.__refreshPrefabRefs(name);
		}
	}
	
	static exitPrefabEdit(oneStepOnly = false) {
		if(editor.overlay) {
			editor.overlay.exitIsolation();
		}
		if(prefabsStack.length) {
			editor.ui.viewport.setPrefabMode(false);
			editor.overlay.hidePreview();
			if(oneStepOnly) {
				prefabsStack.pop();
				if(prefabsStack.length > 0) {
					PrefabsList.editPrefab(prefabsStack.pop(), true);
				}
			} else {
				prefabsStack.length = 0;
			}
		}
	}
	
	static choosePrefab(title, noEasyClose) {
		
		let libsPrefabs = Lib._getAllPrefabs();
		
		let prefabs = [];
		for (let name in libsPrefabs) {
			let sceneData = libsPrefabs[name];
			let c = Lib.getClass(sceneData.c);
			prefabs.push({name:name, __EDITOR_icon: c.__EDITOR_icon});
		}
		return editor.ui.modal.showListChoose(title || "Choose prefab", prefabs, noEasyClose).then((choosed) => {
			if(choosed) {
				return choosed.name;
			}
			return null;
		});
	}

	static checkPrefabReferenceForLoops(o) {
		let loopName = getCurrentPrefabName();
		let prefabName = o.__getPrefabName();
		if(loopName && prefabName) {
			checkedPrefabsNames = {};
			checkedPrefabsNames[prefabName] = true;
			if(checkPrefabDataForLoops((Lib._getAllPrefabs())[prefabName], loopName)) {
				editor.ui.status.error('PrefabReference to prefab "' + prefabName + '" was cleared because of loop referencing. ', 32038, o);
				o.dynamicPrefabName = null;
				o.prefabName = null;
				Lib.__invalidateSerializationCache(o);
			}
		}
	}

	static readAllPrefabsList() {
		let prefabs = {};
		return Promise.all(
			editor.fs.filesExt.prefabs.filter(fn => fn.name.match(prefabFileFiler))
				.map((fn) => {
					return editor.fs.openFile(fn.name)
						.then((data) => {
							if(fn.lib) {
								data.___libInfo = R.libInfo(fn.lib);
							}
							prefabs[fileNameToPrefabName(fn.name)] = data;
						});
				})
		).then(() => {
			Lib._setPrefabs(prefabs);
		});
	}
}

let checkedPrefabsNames;
function checkPrefabDataForLoops(data, loopName) {
	if(!data) {
		return;
	}
	if(data.c === "PrefabReference") {
		let prefabName;

		if(data.p.dynamicPrefabName) {
			prefabName = getValueByPath(data.p.dynamicPrefabName, game);
		} else {
			prefabName = data.p.prefabName;
		}
		if(prefabName === loopName) {
			return true;
		}
		if(!checkedPrefabsNames[prefabName]) {
			checkedPrefabsNames[prefabName] = true;
			checkPrefabDataForLoops(Lib._getAllPrefabs()[prefabName], loopName);
		}
	}
	if(data[':']) {
		return Object.values(data[':']).some((d) => {
			return checkPrefabDataForLoops(d, loopName);
		});
	}
}

function getCurrentPrefabName() {
	return prefabsStack[prefabsStack.length - 1];
}
