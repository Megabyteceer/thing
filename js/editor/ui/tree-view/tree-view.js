import TreeNode from './tree-node.js';
import Window from '../window.js';
import game from "thing-editor/js/engine/game.js";
import Selection from "../../utils/selection.js";
import Lib from "thing-editor/js/engine/lib.js";
import Scene from 'thing-editor/js/engine/components/scene.js';
import DataPathFixer from 'thing-editor/js/editor/utils/data-path-fixer.js';
import Overlay from 'thing-editor/js/editor/utils/overlay.js';

let classViewProps = {className: 'vertical-layout'};
let leftPanelProps = {className: 'left-panel'};

let searchEntries = new Map();
let currentSearchedField;
function addSearchEntry(o, field) {
	let a;
	if(!searchEntries.has(o)) {
		a = [];
		searchEntries.set(o, a);
	} else {
		a = searchEntries.get(o);
	}
	a.push(field);
}

R.renderSceneNode = (node) => {
	if(__getNodeExtendData(node).hidden) {
		return;
	}
	assert(typeof node.___id === 'number', "scene object without ___id detected.", 40902);
	return React.createElement(TreeNode, {node: node, key: node.___id});
};

function onEmptyClick(ev) {
	if(!window.isEventFocusOnInputElement(ev)) {
		editor.selection.clearSelection(true);
	}
}

export default class TreeView extends React.Component {
	
	constructor (props) {
		super(props);
		this.selectInTree = this.selectInTree.bind(this);
		this.onCopyClick = this.onCopyClick.bind(this);
		this.onCutClick = this.onCutClick.bind(this);
		this.onDeleteClick = this.onDeleteClick.bind(this);
		this.onUnwrapClick = this.onUnwrapClick.bind(this);
		this.onBringUpClick = this.onBringUpClick.bind(this);
		this.onMoveUpClick = this.onMoveUpClick.bind(this);
		this.onMoveDownClick = this.onMoveDownClick.bind(this);
		this.onBringDownClick = this.onBringDownClick.bind(this);
		this.onSearchKeyDown = this.onSearchKeyDown.bind(this);
		this.onSearchChange = this.onSearchChange.bind(this);
		this.fundNextBySearch = this.fundNextBySearch.bind(this);
		this.findNext = this.findNext.bind(this);
		this.searchString = editor.settings.getItem('tree-search', '');
	}
	
	selectInTree(node, add, fieldName) {
		assert(node, "Attempt to select in tree empty node");
		editor.selection.select(node, add);
		setTimeout(() => {
			
			if(fieldName && !add) {
				editor.ui.propsEditor.selectField(fieldName);
			}
			
			let e = document.querySelector('.scene-tree-view .item-selected');
			if (e) {
				Window.bringWindowForward(e.closest('.window-body'));
				e.scrollIntoView({block: "center", inline: "center"});
				e.closest('.scene-tree-view').scrollLeft = 0;
			}
		}, 1);
	}

	onCloneClick() {
		editor.cloneSelected();
	}

	onDeleteClick() {
		if((editor.selection.length > 0) && (editor.selection[0] !== game.currentContainer)) {
			
			DataPathFixer.rememberPathReferences();
			
			let p = editor.selection[0].parent;
			let i = p.getChildIndex(editor.selection[0]);

			while(editor.selection.length > 0) {
				let o = editor.selection[0];
				Lib.__invalidateSerializationCache(o);
				o.remove();
			}
			
			let isNextChildSelected = false;

			while(i < p.children.length) {
				let c = p.getChildAt(i++);
				if(!Overlay.getParentWhichHideChildren(c, true)) {
					this.selectInTree(c);
					isNextChildSelected = true;
					break;
				}
			}
			i--;
			if(!isNextChildSelected) {
				while(i >= 0) {
					let c = p.getChildAt(i--);
					if(!Overlay.getParentWhichHideChildren(c, true)) {
						this.selectInTree(c);
						isNextChildSelected = true;
						break;
					}
				}
			}

			if (!isNextChildSelected && (p !== game.stage)) {
				this.selectInTree(p);
			}

			DataPathFixer.validatePathReferences();

			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	}

	isCanBeUnwrapped() {
		if(editor.selection.length !== 1) {
			return;
		}
		let o = editor.selection[0];
		if((o.parent === game.stage) && !game.__EDITOR_mode) {
			return;
		}
		if(o === game.currentContainer) {
			return !(o instanceof Scene) && (o.children.length === 1);
		}
		return o.children.length > 0;
	}

	onIsolateClick() {
		editor.overlay.toggleIsolation();
	}

	onExportAsPngClick() {
		let s = editor.selection[0];
		if(s.width > 0 && s.height > 0) {
			let tmpVisible = s.visible;
			s.visible = true;
			let p = s.parent;
			let i = p.children.indexOf(s);
			let f = s.filters;
			let c = new PIXI.Container();
			let c2 = new PIXI.Container();
			c.addChild(s);
			c2.addChild(c);
			s.filters = [];
			editor.ui.modal.showSpinner();
			let b = c2.getLocalBounds();
			c2.getLocalBounds = () => {
				if(b.x < 0 ) {
					b.x = Math.ceil(b.x);
				} else {
					b.x = Math.floor(b.x);
				}
				if(b.y < 0 ) {
					b.y = Math.ceil(b.y);
				} else {
					b.y = Math.floor(b.y);
				}
				return b;
			};
			game.pixiApp.renderer.extract.canvas(c2).toBlob(function(b){
				s.visible = tmpVisible;
				delete c2.getLocalBounds;
				var a = document.createElement('a');
				document.body.append(a);
				a.download = (s.name || 'image') + '.png';
				a.href = URL.createObjectURL(b);
				a.click();
				a.remove();
				s.filters = f;
				p.addChildAt(s, i);
				editor.ui.modal.hideSpinner();
			}, 'image/png');
		} else {
			editor.ui.modal.showModal("Nothing visible selected to export.");
		}
	}

	onUnwrapClick() {
		if(this.isCanBeUnwrapped()) {

			DataPathFixer.rememberPathReferences();

			let o = editor.selection[0];
			let parent = o.parent;
			let i = parent.getChildIndex(o);

			let isPrefab = (o === game.currentContainer);

			editor.selection.clearSelection();

			if(isPrefab && o.children.length !== 1) {
				editor.ui.modal.showError("To unwrap prefab it is should have exactly one children.", 30005);
				return;
			}

			while(o.children.length > 0) {
				let c = o.getChildAt(o.children.length - 1);
				c.detachFromParent();

				parent.toLocal(c, o, c);

				if(isPrefab) {
					c.name = o.name;
					Lib.__invalidateSerializationCache(c);
					game.__setCurrentContainerContent(c);
				} else {
					parent.addChildAt(c, i);
				}
				
				c.rotation += o.rotation;
				this.selectInTree(c, true);
			}

			
			if(!isPrefab) {
				Lib.__invalidateSerializationCache(o.parent);
				o.remove();
			}
			
			DataPathFixer.validatePathReferences();
			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	}
	
	onCopyClick() {
		if(editor.selection.length > 0) {
			editor.clipboardData = editor.selection.map(Lib.__serializeObject);
			editor.refreshTreeViewAndPropertyEditor();
		}
	}
	
	onCutClick() {
		this.onCopyClick();
		this.onDeleteClick();
	}
	
	onPasteWrapClick() {
		editor.wrapSelected();
	}

	onPasteClick() {
		if(editor.clipboardData && editor.clipboardData.length > 0) {
			editor.disableFieldsCache = true;
			let added = [];
			editor.clipboardData.some((data) => {
				let o = Lib._deserializeObject(data);
				added.push(o);
				editor.attachToSelected(o, true);
			});
			editor.selection.clearSelection();
			while (added.length > 0) {
				editor.selection.add(added.shift());
			}
			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
			editor.disableFieldsCache = false;
			return added;
		}
	}
	
	onBringUpClick() {
		let i = 0;
		while(this.onMoveUpClick(true) && i++ < 100000); //moves selected object up until its become top
		editor.sceneModified(true);
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	onMoveUpClick(doNotSaveHistoryState) {
		let ret = false;
		
		editor.selection.some((o) => {
			if(o.parent !== game.stage) {
				let i = o.parent.getChildIndex(o);
				if (i > 0) {
					let upper = o.parent.getChildAt(i - 1);
					if(!__getNodeExtendData(upper).isSelected) {
						o.parent.swapChildren(o, upper);
						Lib.__invalidateSerializationCache(o.parent);
						ret = true;
					}
				}
			}
		});
		if(doNotSaveHistoryState !== true) {
			editor.sceneModified(true);
			editor.refreshTreeViewAndPropertyEditor();
		}
		return ret;
	}
	
	onMoveDownClick(doNotSaveHistoryState) {
		let ret = false;
		let a = editor.selection.slice(0);
		a.reverse();
		a.some((o) => {
			if(o.parent !== game.stage) {
				let i = o.parent.getChildIndex(o);
				if(i < (o.parent.children.length - 1)) {
					let lower = o.parent.getChildAt(i + 1);
					if(!__getNodeExtendData(lower).isSelected) {
						o.parent.swapChildren(o, lower);
						Lib.__invalidateSerializationCache(o.parent);
						ret = true;
					}
				}
			}
		});
		if(doNotSaveHistoryState !== true) {
			editor.sceneModified(true);
			editor.refreshTreeViewAndPropertyEditor();
		}
		return ret;
	}
	
	onBringDownClick() {
		let i = 0;
		while(this.onMoveDownClick(true) && i++ < 100000); //move selected element down until its become bottom.
		editor.sceneModified(true);
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	onSearchKeyDown(ev) {
		if(this.searchString && (ev.keyCode === 13) && !ev.repeat) {
			this.fundNextBySearch();
		}
	}
	
	onSearchChange(ev) {
		let val = ev.target.value.toLowerCase();
		let needSearch = this.searchString.length < val.length;
		this.searchString = val;
		editor.settings.setItem('tree-search', this.searchString);
		if(needSearch) {
			this.fundNextBySearch();
		}
	}
	
	fundNextBySearch() {
	
		this.findNext((o) => {
			let ret;
			if(Overlay.getParentWhichHideChildren(o)) {
				return;
			}

			if(o.constructor.name.toLowerCase().indexOf(this.searchString) >= 0) return true;
			
			let props = editor.enumObjectsProperties(o);
			for(let p of props) {
				if(p.type === 'timeline') {
					let timeline = o[p.name];
					if(timeline) {
						for(let field of timeline.f) {
							for(let k of field.t) {
								if(k.a && (k.a.toLowerCase().indexOf(this.searchString) >= 0)) {
									addSearchEntry(o, p.name + ',' + field.n + ',' + k.t);
									ret = true;
								}
							}
						}
						for(let label in timeline.l) {
							if(label.toLowerCase().indexOf(this.searchString) >= 0) {
								addSearchEntry(o, p.name + ',,' + label);
								ret = true;
							}
						}
					}
				} else if(p.type !== 'splitter') {
					let val = '' + o[p.name];
					if(val.toLowerCase().indexOf(this.searchString) >= 0) {
						addSearchEntry(o, p.name);
						ret = true;
					}
				}
			}
			return ret;
		}, 1);
	}
	
	findNext(condition, direction) {
		searchEntries.clear();

		let a = new Selection();
		
		if(game.__EDITOR_mode) {

		
			if(condition(game.currentContainer)) {
				a.push(game.currentContainer);
			}
			game.currentContainer.forAllChildren((o) => {
				if(condition(o)) {
					a.push(o);
				}
			});
		} else {
			game.stage.forAllChildren((o) => {
				if(condition(o)) {
					a.push(o);
				}
			});
		}
		
		if (a.length > 0) {
			
			a.sortSelectedNodes();
			
			let field;
			let i = a.indexOf(editor.selection[0]);
			if (i >= 0) {
				let o = editor.selection[0];
				if(searchEntries.has(o)) {
					let entries = searchEntries.get(o);
					let i = entries.findIndex(e => (e === currentSearchedField));
					if(i >= 0) {
						i++;
						field = entries[i];
					} else {
						field = entries[0];
					}
				}
				if(!field) {
					i += direction;
					if (i < 0) i = a.length - 1;
					if (i >= a.length) i = 0;
				}
			} else {
				i = 0;
			}
			if(!field) {
				let o = a[i];
				if(searchEntries.has(o)) {
					field = searchEntries.get(o)[0];
				}
			}

			currentSearchedField = field;
			this.selectInTree(a[i], false, field);
		} else {
			editor.selection.clearSelection(true);
		}
	}
	
	render() {
		if (!game.stage) return R.spinner();
		
		let isEmpty = editor.selection.length === 0;
		let isRoot = editor.selection.some(isObjectRoot);


		return R.div(classViewProps,
			R.div(leftPanelProps,
				R.btn(R.icon('bring-up'), this.onBringUpClick, 'Bring selected up', "tool-btn", undefined, isEmpty || isRoot),
				R.btn(R.icon('move-up'), this.onMoveUpClick, 'Move selected up', "tool-btn", undefined, isEmpty || isRoot),
				R.btn(R.icon('move-down'), this.onMoveDownClick, 'Move selected down', "tool-btn", undefined, isEmpty || isRoot),
				R.btn(R.icon('bring-down'), this.onBringDownClick, 'Bring selected down', "tool-btn", undefined, isEmpty || isRoot),
				R.hr(),
				R.btn(R.icon('copy'), this.onCopyClick, 'Copy selected in to clipboard (Ctrl+C)', "tool-btn", 1067, isEmpty),
				R.btn(R.icon('cut'), this.onCutClick, 'Cut selected (Ctrl+X)', "tool-btn", 1088, isEmpty || isRoot),
				R.btn(R.icon('paste'), this.onPasteClick, 'Paste (Ctrl+V)', "tool-btn", 1086, !editor.clipboardData || !editor.isCanBeAdded()),
				R.btn(R.icon('paste-wrap'), this.onPasteWrapClick, 'Paste wrap', "tool-btn", undefined, !editor.clipboardData || !game.__EDITOR_mode || isEmpty),
				R.hr(),
				R.btn(R.icon('clone'), this.onCloneClick, 'Clone (Ctrl + D)', "tool-btn", 1068, isEmpty || isRoot),
				R.btn(R.icon('delete'), this.onDeleteClick, 'Remove selected (Del)', "tool-btn", 46, isEmpty || isRoot),
				R.btn(R.icon('unwrap'), this.onUnwrapClick, 'Unwrap (remove selected but keep children)', "tool-btn", undefined, !this.isCanBeUnwrapped()),
				R.btn(R.icon('export-selected'), this.onExportAsPngClick, 'Export selected', "tool-btn", undefined, isEmpty),
				editor.overlay.isIsolated ? /// 99999
					R.btn(R.icon('exit-isolation'), this.onIsolateClick, 'Exit isolation (Ctrl + I)', "tool-btn", 1073) :
					R.btn(R.icon('isolate-selected'), this.onIsolateClick, 'Isolate selected (Ctrl + I)', "tool-btn", 1073, isEmpty)
			),
			R.div({className: 'scene-tree-view-wrap', onMouseDown: onEmptyClick},
				R.input({onKeyDown: this.onSearchKeyDown, onChange: this.onSearchChange, className:'tree-view-search', defaultValue: this.searchString, placeholder: 'Search'}),
				R.div({className: 'scene-tree-view', onMouseDown: onEmptyClick},
					game._getScenesStack().map(renderSceneStackItem),
					game.stage.children.map(renderRoots)
				)
			)
		);
	}
}

const isObjectRoot = (node) => {
	return node.parent === game.stage;
};

const renderRoots = (node, i) => {
	if((node === game.currentContainer) || !game.__EDITOR_mode) {
		return R.renderSceneNode(node);
	} else {
		let style;
		if(__getNodeExtendData(node).hidden) {
			style = {display:'none'};
		}
		return R.div({className:'inactive-scene-item', style, key:'na-' + i, title:'This scene node is blocked by modal object for now.'}, R.sceneNode(node));
	}
};

const renderSceneStackItem = (s, i, a) => {
	let body;
	if((s === game.currentScene) && (i === (a.length -1))) {
		return undefined;
	} else if(typeof s === "string") {
		body = R.span(null, "waiting for instancing: " + s);
	} else {
		body = R.sceneNode(s);
	}


	return R.div({className:'stacked-scene-item', title: 'This scene currently in stack.', key: i},
		body
	);
};