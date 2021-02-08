import Lib from "../lib.js";

const Sprite = PIXI.Sprite;
const Mesh = PIXI.Mesh;

export default Sprite;

const imagePropertyDescriptor = {
	get:function () {
		return this._imageID;
	},
	set:function (v) {
		assert(typeof v === 'string', "texture's String ID expected.", 10022);
		if(this._imageID !== v) {
			this._imageID = v;
			this.texture = Lib.getTexture(v
			/// #if EDITOR
				, this
			/// #endif
			);
			assert(this.texture && this.texture.baseTexture, "baseTexture is empty.");
			/// #if EDITOR
			if(this.texture && this.texture.valid && (Lib.hasTexture(this._imageID))) {
				if(this.anchor && ((((this.texture.height & 1) !== 0) && this.anchor.x === 0.5) || (((this.texture.width & 1) !== 0) && this.anchor.y === 0.5))) {
					editor.ui.status.warn('Texture "' + v + '" has non even sized bounds ('
						+ this.texture.width + 'x'+ this.texture.height + '). It is can cause unwanted blurring for objects with centralized pivot point.', 32028,
					() => {
						editor.fs.editFile(editor.game.resourcesPath + 'img/' + v);
					});
				}
			}
			/// #endif
		}
	}
};

Object.defineProperty(Sprite.prototype, 'image', imagePropertyDescriptor);
Object.defineProperty(Mesh.prototype, 'image', imagePropertyDescriptor);

Sprite.imagePropertyDescriptor = imagePropertyDescriptor;

const tintRDesc = {
	get:function () {
		return this.tint >> 16;
	},
	set:function (v) {
		assert(!isNaN(v), "invalid value for 'tintR'. Valid number value expected.", 10001);
		this.tint = (this.tint & 0xFFFF) | (v << 16);
	}, configurable: true
};

Object.defineProperty(Sprite.prototype, 'tintR', tintRDesc);
Object.defineProperty(Mesh.prototype, 'tintR', tintRDesc);

const tintGDesc = {
	get:function () {
		return (this.tint & 0xFF00) >> 8;
	},
	set:function (v) {
		assert(!isNaN(v), "invalid value for 'tintG'. Valid number value expected.", 10001);
		this.tint = (this.tint & 0xFF00FF) | (v << 8);
	}, configurable: true
};

Object.defineProperty(Sprite.prototype, 'tintG', tintGDesc);
Object.defineProperty(Mesh.prototype, 'tintG', tintGDesc);

const tintBDesc = {
	get:function () {
		return this.tint & 0xFF;
	},
	set:function (v) {
		assert(!isNaN(v), "invalid value for 'tintB'. Valid number value expected.", 10001);
		this.tint = (this.tint & 0xFFFF00) | v;
	}, configurable: true
};

Object.defineProperty(Sprite.prototype, 'tintB', tintBDesc);
Object.defineProperty(Mesh.prototype, 'tintB', tintBDesc);


/// #if EDITOR

Sprite.prototype.__beforeDestroy = function() {
	assert(this._width === 0, "width property was assigned but not cleared to zero on object disposing.", 10065);
	assert(this._height === 0, "height property was assigned but not cleared to zero on object disposing.", 10066);
};

Sprite.prototype.destroy.___EDITOR_isHiddenForChooser = true;
Mesh.prototype.destroy.___EDITOR_isHiddenForChooser = true;

Sprite.prototype.__EDITOR_onCreate = function (isWrapping) {
	if(!isWrapping && editor.projectDesc.icon.startsWith('img/')) {
		this.image = editor.projectDesc.icon.replace('img/', '');
	}
};
Mesh.prototype.__EDITOR_onCreate = Sprite.prototype.__EDITOR_onCreate;

Sprite.__blendModesSelect = Object.keys(PIXI.BLEND_MODES).filter((k) => {
	return isNaN(parseInt(k));
}).map((k) => {
	return {name: k, value: PIXI.BLEND_MODES[k]};
}).sort((a, b) => {
	return a.value - b.value;
});

const SPRITE_EDITABLE_PROPS = [
	{
		type: 'splitter',
		title: 'Sprite:',
		name: 'sprite'
	},
	window.makeImageSelectEditablePropertyDescriptor('image', false, true),
	{
		name: 'tint',
		basis: 16,
		type: Number,
		default: 0xFFFFFF,
		max: 0xFFFFFF,
		min: 0,
		notAnimate: true
	},
	{
		name: 'tintR',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSerializable: true
	},
	{
		name: 'tintG',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSerializable: true
	},
	{
		name: 'tintB',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSerializable: true
	},
	{
		name: 'blendMode',
		type: Number,
		select: Sprite.__blendModesSelect,
		notAnimate: true
	}
];

Sprite.__EDITOR_group = 'Basic';

const MESH_EDITABLE_PROPS = SPRITE_EDITABLE_PROPS.slice();
MESH_EDITABLE_PROPS.push(
	{
		type: 'splitter',
		title: 'Mesh',
		name: 'Mesh-props'
	},
	{
		name: 'CENTRALIZE PIVOT',
		type: 'btn',
		onClick: (o) => {
			editor.onObjectsPropertyChanged(o, 'pivot.x', Math.round(o.texture.width / 2));
			editor.onObjectsPropertyChanged(o, 'pivot.y', Math.round(o.texture.height / 2));
		}
	});
__EDITOR_editableProps(Sprite, SPRITE_EDITABLE_PROPS);
__EDITOR_editableProps(Mesh, MESH_EDITABLE_PROPS);
Sprite.__EDITOR_icon = 'tree/sprite';

/// #endif