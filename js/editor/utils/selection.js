import Tilemap from "thing-editor/js/engine/components/tilemap.js";
import game from "thing-editor/js/engine/game.js";
import TreeNode from "../ui/tree-view/tree-node.js";
import Overlay from "./overlay.js";
import PrefabReference from "thing-editor/js/engine/components/prefab-reference.js";
import PrefabsList from "../ui/prefabs-list.js";
import getValueByPath from "thing-editor/js/engine/utils/get-value-by-path.js";

let IS_SELECTION_LOADING_TIME = false;


class Selection extends Array {
	
	select(object, add) {
		if (!add) {
			this.clearSelection();
		}
		if (__getNodeExtendData(object).isSelected) {
			this.remove(object);
		} else {
			this.add(object);
		}
		this.sortSelectedNodes();
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	sortSelectedNodes() {
		recalculateNodesDeepness();
		this.sort(sortByDeepness);
	}
	
	loadSelection(data) {
		IS_SELECTION_LOADING_TIME = true;
		if (!data || data.length === 0) {
			editor.selection.clearSelection();
		} else {
			editor.selection.clearSelection();
			data.some(selectNodeByPath);
		}
		TreeNode.clearLastClicked();
		editor.refreshTreeViewAndPropertyEditor();
		IS_SELECTION_LOADING_TIME = false;
	}
	
	saveSelection() {
		return this.map(getPathOfNode);
	}
	
	clearSelection(refresh) {
		while (this.length > 0) {
			this.remove(this[this.length - 1]);
		}
		TreeNode.clearLastClicked();
		if (refresh) {
			editor.refreshTreeViewAndPropertyEditor();
		}
	}
	
	add(o) {
		let nodePath = getPathOfNode(o);
		let hidingParent = Overlay.getParentWhichHideChildren(o, true);
		if(hidingParent && (hidingParent !== o)) {
			if(hidingParent instanceof PrefabReference) {
				let parentPath = getPathOfNode(hidingParent);
				nodePath.length -= parentPath.length;

				let prefabName;
				if(hidingParent.dynamicPrefabName) {
					prefabName = getValueByPath(hidingParent.dynamicPrefabName, game);
				} else {
					prefabName = hidingParent.prefabName;
				}
				if(prefabName) {
					editor.ui.modal.showEditorQuestion("Object is in inside prefab", "Do you want to go to prefab '" + prefabName + "', containing this object?", () => {
						PrefabsList.editPrefab(prefabName);
						editor.selection.loadSelection([nodePath]);
					});
				}
			}
			editor.ui.modal.showInfo('Can not select object, because it is hidden by parent ' + hidingParent.constructor.name + '; ' + o.___info, 'Can not select object', 30015);
			return;
		}
		assert(!__getNodeExtendData(o).isSelected, "Node is selected already.");
		assert(this.indexOf(o) < 0, "Node is registered in selected list already.");
		__getNodeExtendData(o).isSelected = true;
		let p = o.parent;
		while(p && p !== game.stage) {
			let data = __getNodeExtendData(p);
			if(!data.hidden) {
				data.childrenExpanded = true;
			}
			p = p.parent;
		}
		if(!(o instanceof Tilemap)) {
			o.addFilter(selectionFilter);
			selectionFilter.enabled = 5;
		}
		this.push(o);
		o.__onSelect();

		editor.ui.viewport.scrollInToScreen(o);
		editor.ui.classesList.refresh();
		if(!IS_SELECTION_LOADING_TIME) {
			editor.history.scheduleSelectionSave();
		}
	}
	
	remove(o) {
		assert(__getNodeExtendData(o).isSelected, "Node is not selected.");
		let i = this.indexOf(o);
		assert(i >= 0, "Node is not registered in selected list.");
		__getNodeExtendData(o).isSelected = false;
		if(!(o instanceof Tilemap)) {
			o.removeFilter(selectionFilter);
		}
		this.splice(i, 1);
		o.__EDITOR_inner_exitPreviewMode();
		if(!IS_SELECTION_LOADING_TIME) {
			editor.history.scheduleSelectionSave();
		}
		if(o.__onUnselect) {
			o.__onUnselect();
		}
		editor.ui.classesList.refresh();
	}
}

export default Selection;

const selectionFilter = new PIXI.filters.OutlineFilter(2, 0xffff00);
selectionFilter.padding = 2;

setInterval(() => {
	if (window.editor && editor.selection.length > 0) {
		if(document.fullscreenElement) {
			selectionFilter.enabled = 0;
			return;
		}
		selectionFilter.color ^= 0x063311;
		if(!editor.overlay.helpersIsVisible) {
			if(selectionFilter.enabled > 0) {
				selectionFilter.enabled--;
			}
		} else {
			selectionFilter.enabled = 5;
		}
	}
}, 1000 / 60 * 3);

//save/load selection

let getPathOfNode = (node) => {
	let ret = [];
	while (node !== game.stage) {
		if(node.name && node.parent.children.filter((c)=>{return c.name === node.name;}).length === 1) {
			ret.push(node.name);
		} else {
			ret.push(node.parent.getChildIndex(node));
		}
		node = node.parent;
	}
	return ret;
};

let selectNodeByPath = (path) => {
	let ret = game.stage;
	for (let i = path.length - 1; i >= 0 && ret; i--) {
		let p = path[i];
		if(typeof p === 'number') {
			if(p < ret.children.length) {
				ret = ret.getChildAt(p);
			} else {
				return;
			}
		} else {
			ret = ret.getChildByName(p);
		}
	}
	
	if(ret && ret !== game.stage) {
		editor.selection.add(ret);
	}
};


//-------- sorting selection --------------------------------
let curDeepness;

let recalculateNodesDeepness = () => {
	curDeepness = 0;
	recalculateNodesDeepnessRecursive(game.stage);
};

let recalculateNodesDeepnessRecursive = (n) => {
	__getNodeExtendData(n).deepness = curDeepness++;
	if (n.hasOwnProperty('children')) {
		n.children.some(recalculateNodesDeepnessRecursive);
	}
};

let sortByDeepness = (a, b) => {
	return __getNodeExtendData(a).deepness - __getNodeExtendData(b).deepness;
};

