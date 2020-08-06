/// #if EDITOR
import PrefabsList from "thing-editor/js/editor/ui/prefabs-list.js";
import game from "../game.js";
import MovieClip from "./movie-clip/movie-clip.js";

const allRefs = {};
/// #endif

import Container from "./container.js";
import Lib from "../lib.js";
import getValueByPath from "../utils/get-value-by-path.js";


export default class PrefabReference extends Container {

	/// #if EDITOR

	__getPrefabName() {
		if(this.dynamicPrefabName) {
			return getValueByPath(this.dynamicPrefabName, this);
		}
		return this.prefabName;
	}

	set prefabName(n) {
		this._prefabName = n;
		if(game.__EDITOR_mode) {
			this.__exitPreview();
			this.__refreshPreview();
		}
	}

	get prefabName() {
		return this._prefabName;
	}

	__goToPreview() {
		if(this.__previewNode) {
			return;
		}
		let prefabName = this.__getPrefabName();

		if(prefabName && (this.scale.x !== 0) && (this.scale.y !== 0)) {

			if(!Lib.hasPrefab(prefabName)) {
				editor.ui.status.warn("Prefab with name " + prefabName + " is not exists.", 32024, this, 'prefabName');
			} else {

				this.__previewNode = Lib.loadPrefab(prefabName);
				if(!allRefs[prefabName]) {
					allRefs[prefabName] = [];
				}
				allRefs[prefabName].push(this);
				this.__appliedPreviewName = prefabName;

				__getNodeExtendData(this.__previewNode).hidden = true;
				if(this.inheritProps) {
					this.__previewNode.x = 0;
					this.__previewNode.y = 0;
					this.__previewNode.rotation = 0;
					this.__previewNode.scale.x = 1;
					this.__previewNode.scale.y = 1;
					this.__previewNode.skew.x = 0;
					this.__previewNode.skew.y = 0;
					this.__previewNode.pivot.x = 0;
					this.__previewNode.pivot.y = 0;
					if((this.__previewNode instanceof MovieClip) && this.__previewNode._timelineData) {
						for(let fn in editor.ClassesLoader.classesDefaultsById['PrefabReference']) {
							for(let f of this.__previewNode._timelineData.f) {
								if(fn === f.n && this[fn] !== f.t[0].v) {
									this[fn] = f.t[0].v;
									editor.ui.status.warn('Value of PrefabReference property "' + fn + '" was changed to ' +  this[fn] + ' because its refers to MovieClip where animation starts with that value.', 99999, this, fn);
									editor.sceneModified();
								}
							}
						}
					}
				}
				this.addChildAt(this.__previewNode, 0);
				editor.game.__loadDynamicTextures();
			}
		}
	}

	__exitPreview() {
		if(this.__previewNode) {
			let a = allRefs[this.__appliedPreviewName];
			let i = a.indexOf(this);
			if(i < 0) {
				editor.ui.status.warn("Reference to prefab " + this.__appliedPreviewName + " is not registered.");
			} else {
				a.splice(i, 1);
			}
			this.__previewNode.remove();
			this.__previewNode = null;
			editor.game.__loadDynamicTextures();
		}
	}

	__beforeDeserialization() {
		this.__exitPreview();
		this.__canApplyPreview = false;
	}

	__afterDeserialization() {
		this.__canApplyPreview = true;
		this.__refreshPreview();
	}

	__EDITOR_onCreate() {
		this.__canApplyPreview = true;
	}

	__beforeDestroy() {
		this.__exitPreview();
	}

	get __preview() {
		return this.__isPreviewModeEnabled;
	}

	set __preview(v) {
		this.__isPreviewModeEnabled = v;
		this.__refreshPreview();
	}

	__refreshPreview() {

		if(game.__EDITOR_mode) {
			PrefabsList.checkPrefabReferenceForLoops(this);
		}

		if(this.__isPreviewModeEnabled && this.__canApplyPreview) {
			this.__goToPreview();
		} else {
			this.__exitPreview();
		}
	}

	static __refreshPrefabRefs(name) {
		let a = allRefs[name];
		if(!a) {
			return;
		}
		a = a.slice(0);		
		for(let r of a) {
			r.__exitPreview();
			r.__refreshPreview();
		}
	}
	/// #endif
}

/// #if EDITOR
PrefabReference.__EDITOR_group = 'Basic';
__EDITOR_editableProps(PrefabReference, [
	{
		type: 'splitter',
		title: 'Prefab:',
		name: 'prefab'
	},
	{
		type: 'btn',
		name: 'EDIT',
		hotkey: 1069,
		title: "Edit prefab (Ctrl+E)",
		onClick: (o) => {
			PrefabsList.editPrefab(o.__getPrefabName(), true);
		}
	},
	{
		type: String,
		select:window.makePrefabSelector(undefined, true),
		name: 'prefabName'
	},
	{
		name: 'dynamicPrefabName',
		type: 'data-path'
	},
	{
		type: Boolean,
		name: 'inheritProps',
		tip: 'if false - prefab will be added on stage as is. If true - properties of this reference component will be applied to loaded prefab.',
		default: true
	},
	{
		name: '__preview',
		type: Boolean,
		default: true		
	}
]);

PrefabReference.__EDITOR_icon = 'tree/ref';
/// #endif