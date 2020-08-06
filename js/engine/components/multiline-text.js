import Text from "/thing-editor/js/engine/components/text.js";
import game from "thing-editor/js/engine/game.js";

const CENTER = 'center';
const BOTTOM = 'bottom';

export default class MultilineText extends Text {
	

	init() {
		super.init();
		this.applyWorldWrapping();
	}

	applyWorldWrapping() {
		if(this.style) {
			this.style.wordWrapWidth = (game.isPortrait ? this.maxWidthPortrait : this.maxWidthLandscape);
			this.style.wordWrap = true;
			this._applyMaxHeight();
		}
	}

	_onRenderResize() {
		this.applyWorldWrapping();
	}

	get maxHeightLandscape () {
		return this._maxHeightLandscape;
	}
	
	set maxHeightLandscape (val) {
		this._maxHeightLandscape = val;
		if(!game.isPortrait && (val !== 0)) {
			this._applyMaxHeight();
		}
	}

	get maxHeightPortrait () {
		return this._maxHeightPortrait;
	}

	set maxHeightPortrait (val) {
		this._maxHeightPortrait = val;
		if(game.isPortrait && (val !== 0)) {
			this._applyMaxHeight();
		}
	}

	get breakWords () {
		return this.style.breakWords;
	}
	
	set breakWords (val) {
		this.style.breakWords = val;
	}

	_onTextureUpdate() {
		super._onTextureUpdate();
		this._applyMaxHeight();
	}

	_applyMaxHeight() {
		if(this.style) {
			this.maxWidth = this.style.wordWrapWidth;
		}
		let h = game.isPortrait ? this._maxHeightPortrait : this._maxHeightLandscape;
		if((h > 0) && ((this.scale.y * this._texture.height) > h)) {
			var q = h / this._texture.height;
			if(this.scale.x !== q || this.scale.y !== q) {
				this.scale.x = q;
				this.scale.y = q;
				if(this.parent) {
					this.updateTransform();
				}
			}
		}
	}

	/// #if EDITOR
	__beforeSerialization() {
		super.__beforeSerialization();
		if((game.isPortrait ? this._maxHeightPortrait : this._maxHeightLandscape) > 0) {
			this.scale.x = 1;
			this.scale.y = 1;
		}
	}

	__afterDeserialization() {
		this.applyWorldWrapping();
	}

	__afterSerialization(d) {
		delete d.p.maxWidth;
		super.__afterSerialization();
		this._applyMaxHeight();
	}
	/// #endif
}

/// #if EDITOR

MultilineText.__EDITOR_group = 'Extended';
MultilineText.__EDITOR_icon = 'tree/multiline-text';

__EDITOR_editableProps(MultilineText, [ //list of editable properties
	{
		type: 'splitter',
		title: 'MultilineText',
		name: 'MultilineText'
	},
	{
		name: 'maxWidth',
		type: Number,
		override: true,
		visible: () => { }
	},
	{
		name:'maxWidthLandscape',
		type:Number,
		afterEdited: afterMaxWidthEdit,
		default: 400,
		min: 10,
		disabled: () => {
			return game.isPortrait;
		}
	},
	{
		name:'maxWidthPortrait',
		type:Number,
		afterEdited: afterMaxWidthEdit,
		default: 400,
		min: 10,
		disabled: () => {
			return !game.isPortrait;
		}
	},
	{
		name: 'maxHeightLandscape',
		type: Number,
		min: 0,
		disabled: () => {
			return game.isPortrait;
		},
		afterEdited: afterMaxHeightEdit
	},
	{
		name: 'maxHeightPortrait',
		type: Number,
		min: 0,
		disabled: () => {
			return !game.isPortrait;
		},
		afterEdited: afterMaxHeightEdit
	},
	{
		name: 'breakWords',
		type: Boolean,
		default: false,
	}
]);

function afterMaxHeightEdit() {
	let o = editor.selection[0];
	let y = game.isPortrait ? o._maxHeightPortrait : o._maxHeightLandscape;
	if(y === 0) {
		for(let t of editor.selection) {
			t.scale.x = 1;
			t.scale.y = 1;
		}
	} else {
		switch(o.verticalAlign) {
		case CENTER:
			y *= 0.5;
			break;
		case BOTTOM:
			y *= -1;
			break;
		}
		let tmpScale = o.scale.x;
		o.scale.x = 1;
		o.scale.y = 1;
		editor.overlay.guideY(y , o);
		o.scale.x = tmpScale;
		o.scale.y = tmpScale;
	}
}

function afterMaxWidthEdit() {
	for(let o of editor.selection) {
		o.applyWorldWrapping();
	}
	let o = editor.selection[0];
	let props = editor.enumObjectsProperties(o);
	for(let p of props) {
		if(p.name === 'maxWidth') {
			o.maxWidth = o.style.wordWrapWidth;
			p.afterEdited(o);
			o.maxWidth = 0;
			break;
		}
	}
}
/// #endif