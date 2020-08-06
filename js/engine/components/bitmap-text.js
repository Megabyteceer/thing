import L from "thing-editor/js/engine/utils/l.js";
import getValueByPath from "thing-editor/js/engine/utils/get-value-by-path.js";

const CENTER = 'center';
const LEFT = 'left';
const RIGHT = 'right';
const TOP = 'top';
const BOTTOM = 'bottom';

const alignValues = {
	'center': 0.5,
	'left': 0.0,
	'right': 1.0,
	'top': 0.0,
	'bottom': 1.0
};

export default class BitmapText extends PIXI.BitmapText {
	
	constructor() {
		super('', {font: {name:'', size: 32}, align: "left", tint: 0xFFFFFF});
	}

	init() {
		super.init();
		this.updateText();
		if(this.textProvider) {
			this._textProvider = getValueByPath(this.textProvider, this);
		} else {
			this._textProvider = null;
		}
	}

	updateText() {
		if(!this.font.name) {
			return;
		}

		/// #if EDITOR
		if(!BitmapText.fonts[this._font.name]) {
			setTimeout(() => {
				editor.ui.status.error('BitmapFont is not exists: ' + this._font.name, 99999, this, 'font.name');
			}, 0);
			return;
		}
		/// #endif

		super.updateText();
		this.maxW = this._maxW || 0; // recalculate max width
	}

	get maxW () {
		return this._maxW;
	}

	forAllChildren(cb) {
		/// #if EDITOR
		if(editor.game.__EDITOR_mode) {
			super.forAllChildren(cb);
		}
		/// #endif
	}

	set maxW(val) {
		this._maxW = val;
		if(this._maxW !== 0) {
			if(this._textWidth > this._maxW) {
				var q = this._maxW / this._textWidth;
				if(this.scale.x !== q || this.scale.y !== q) {
					this.scale.x = q;
					this.scale.y = q;
					if(this.parent) {
						this.updateTransform();
					}
				}
			} else {
				if(this.scale.x !== 1 || this.scale.y !== 1) {
					this.scale.x = 1;
					this.scale.y = 1;
					if(this.parent) {
						this.updateTransform();
					}
				}
			}
		}
	}

	clearBitmapText() {
		this._glyphs.length = 0;
		this.children.length = 0;
	}

	onRemove() {
		super.onRemove();
		this.clearBitmapText();
	}

	update() {
		super.update();
		if(this._textProvider) {
			this.text = this._textProvider.text;
		}
	}

	set "font.name" (v) {
		this.font.name = v;
		/// #if EDITOR
		this.updateText();
		/// #endif
	}

	get "font.name" () {
		return this.font.name;
	}

	set "font.size" (v) {
		/// #if EDITOR
		if(this.font) {
		/// #endif
			this.font.size = v;
		/// #if EDITOR
		}
		if((v === 0) && this.font.name) {
			this.font.size = BitmapText.fonts[this.font.name].size;
		}
		this.updateText();
		/// #endif
	}

	get "font.size" () {
		return this.font.size;
	}

	set "font.align" (v) {
		this.font.align = v;
		this.anchor.x = alignValues[v];
		/// #if EDITOR
		this.updateText();
		/// #endif
	}

	get "font.align" () {
		return this.font.align;
	}

	set verticalAlign (v) {
		this._verticalAlign = v;
		this.anchor.y = alignValues[v];
	}

	get verticalAlign () {
		return this._verticalAlign;
	}

	onLanguageChanged() {
		if(this._translatableText) {
			let t = this._translatableText;
			this._translatableText = null;
			this.translatableText = t;
		}
	}

	get translatableText () {
		return this._translatableText;
	}

	set translatableText (val) {
		if(this._translatableText !== val) {
			if(val) {
				/// #if EDITOR
				if(!L.has(val)) {
					editor.ui.status.warn("translatableText refers to not existing key.", 32032, this, 'translatableText');
				}
				/// #endif
				this.text = L(val);
			}
			this._translatableText = val;
		}
	}

	/// #if EDITOR

	__beforeSerialization() {
		if(this._translatableText) {
			this.text = '';
		}

		this.clearBitmapText();

		if(this.maxW > 0) {
			this.scale.x = 1;
			this.scale.y = 1;
		}
	}

	__afterSerialization() {
		if(this._translatableText) {
			this.text = L(this._translatableText);
		}
		this.updateText();
		if(this.maxW > 0) {
			let tmp = this.maxW;
			this.maxW = 0;
			this.maxW = tmp;
		}
	}

	__EDITOR_onCreate() {
		let fontName = Object.keys(BitmapText.fonts)[0];
		if(fontName) {
			this.text = 'New BitmapText 1';
			this.font.name = fontName;
			this.font.size = BitmapText.fonts[fontName].size;
		}
		this.__afterDeserialization();
	}

	__beforeDestroy() {
		this.text = '';
		this.clearBitmapText();
	}

	__afterDeserialization() {
		__getNodeExtendData(this).hideAllChildren = true;
	}
	/// #endif
}

/// #if EDITOR

BitmapText.__EDITOR_icon= "tree/bitmap-text";
BitmapText.__EDITOR_group = "Basic";
BitmapText.__canNotHaveChildren = true;

import LanguageView from "thing-editor/js/editor/ui/language-view.js";

__EDITOR_editableProps(BitmapText, [ //list of editable properties
	{
		type: 'splitter',
		title: 'BitmapText',
		name: 'BitmapText-props'
	},
	{
		name:'text',
		type:String,
		default:'',
		disabled:(node) => {
			return node.translatableText;
		}
	},
	window.makeTranslatableSelectEditablePropertyDecriptor('translatableText'),
	{
		type: 'btn',
		title: 'Edit or create new translatable key.',
		name: 'Edit text',
		helpUrl: 'components.Text#edit-text',
		onClick: (o) => {
			LanguageView.editKey(o.translatableText);
		}
	},
	{
		name:'font.name',
		type:String,
		default:'',
		select:() => {
			let names = Object.keys(BitmapText.fonts);
			if(names.length === 0) {
				setTimeout(() => {
					editor.ui.status.warn("It is no any bitmap fonts (xml) files in '/img' subfolders.", 32046, editor.selection[0]);
				}, 0);
			}
			return names.map((n) => {
				return {name:n, value: n};
			});
		}
	},
	{
		name:'font.size',
		type:Number
	},
	{
		name: 'letterSpacing',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'tint',
		basis: 16,
		type: Number,
		default: 0xFFFFFF,
		max: 0xFFFFFF,
		min: 0
	},
	{
		name: 'font.align',
		type: String,
		select: [
			{name: CENTER, value: CENTER},
			{name: LEFT, value: LEFT},
			{name: RIGHT, value: RIGHT}
		],
		default: CENTER
	},
	{
		name: 'verticalAlign',
		type: String,
		select: [
			{name: TOP, value: TOP},
			{name: CENTER, value: CENTER},
			{name: BOTTOM, value: BOTTOM}
		],
		default: CENTER
	},
	{
		name: 'textProvider',
		type: 'data-path',
		isValueValid: (o) => {
			return o.text;
		}

	},
	{
		name: 'maxW',
		type: Number,
		afterEdited: (overrideO) => {
			let o = overrideO || editor.selection[0];
			afterEdited(o, o.maxW);
		},
		min: 0
	}
]);


function afterEdited (overrideO, x) {
	let o = overrideO || editor.selection[0];
	if(x === 0) {
		for(let t of editor.selection) {
			t.scale.x = 1;
			t.scale.y = 1;
		}
	} else {
		switch(o.font.align) {
		case CENTER:
			x *= 0.5;
			break;
		case RIGHT:
			x *= -1;
			break;
		}
		let tmpScale = o.scale.x;
		o.scale.x = 1;
		o.scale.y = 1;
		editor.overlay.guideX(x , o);
		o.scale.x = tmpScale;
		o.scale.y = tmpScale;
	}
}

/// #endif
