import Container from "./container.js";
import game from "../game.js";
import Lib from "../lib.js";

export default class Resizer extends Container {

	init() {
		super.init();
		this.recalculateSize();
	}

	_onRenderResize() {
		this.recalculateSize();
	}

	recalculateSize() {
		if(this.resizeX) {
			this.scale.x = game.W / game.projectDesc.width;
		}
		if(this.resizeY) {
			this.scale.y = game.H / game.projectDesc.height;
		}
		if(this.relativeX) {
			this.x = Math.round(game.W * this.xPos);
		}
		if(this.relativeY) {
			this.y = Math.round(game.H * this.yPos);
		}
	}

	set xPos(v) {
		this._xPos = v;
		if(this.relativeX) {
			this.x = Math.round(game.W * v);
		}
	}

	get xPos() {
		return this._xPos;
	}

	set yPos(v) {
		this._yPos = v;
		if(this.relativeY) {
			this.y = Math.round(game.H * v);
		}
	}

	get yPos() {
		return this._yPos;
	}

	/// #if EDITOR
	__beforeSerialization() {

		if(!game.projectDesc.dynamicStageSize && !Lib.__getSceneOrPrefabLibName(this.getRootContainer() || game.currentContainer)) {
			editor.ui.status.warn("Resizer is not useful if projects dynamicStageSize is not set to true", 32025, this);
		}

		if(this.resizeX) {
			this.scale.x = 1;
		}
		if(this.resizeY) {
			this.scale.y = 1;
		}
		if(this.relativeX) {
			this.x = 0;
		}
		if(this.relativeY) {
			this.y = 0;
		}
	}

	set resizeX(v) {
		this._resizeX = v;
		if(editor.game.__EDITOR_mode) {
			if(!v) {
				this.scale.x = 1;
			}
		}
	}

	get resizeX() {
		return this._resizeX;
	}

	set resizeY(v) {
		this._resizeY = v;
		if(editor.game.__EDITOR_mode) {
			if(!v) {
				this.scale.y = 1;
			}
		}
	}

	get resizeY() {
		return this._resizeY;
	}

	__afterDeserialization() {
		this.recalculateSize();
	}

	__afterSerialization() {
		this.recalculateSize();
	}
	/// #endif
}


/// #if EDITOR

Resizer.__EDITOR_group = 'Extended';
__EDITOR_editableProps(Resizer, [
	{
		type: 'splitter',
		title: 'Resizer:',
		name: 'resizer'
	},
	{
		type:Boolean,
		name: 'resizeX'
	},
	{
		type:Boolean,
		name: 'resizeY'
	},
	{
		type:Boolean,
		name: 'relativeX'
	},
	{
		type: Number,
		name: 'xPos',
		min:-1,
		max:1,
		step:0.01,
		visible:(o) => {
			return o.relativeX;
		}

	},
	{
		type:Boolean,
		name: 'relativeY'
	},
	{
		type: Number,
		name: 'yPos',
		min:-1,
		max:1,
		step:0.01,
		visible:(o) => {
			return o.relativeY;
		}

	}
]);

Resizer.__EDITOR_icon = 'tree/resizer';

Resizer.__EDITOR_tip = `<b>Resizer</b> - component has sense only for project with <b>dynamicStageSize</b>`;

/// #endif