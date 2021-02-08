import Container from "./container.js";
import Lib from "../lib.js";
import game from "../game.js";
import getValueByPath from '../utils/get-value-by-path.js';

/// #if EDITOR
import "/node_modules/pixi-spine/dist/pixi-spine.js";
/*
/// #endif
import "pixi-spine";
//*/

const poolMap = new Map();

function pool(name) {
	if(!poolMap.has(name)) {
		poolMap.set(name, []);
	}
	return poolMap.get(name);
}

function getSpineInstance(name) {
	let p = pool(name);
	if(p.length === 0) {
		let res = Lib.resources[name];
		
		if (!res.spineData) {
			res.spineData = generateSpineData(res.data, name);
		}
		
		let ret = new PIXI.spine.Spine(res.spineData);
		ret.autoUpdate = false;
		assert(!ret._poolName, "Spine structure changed. Pooling needs refactoring (_poolName field renaming).");
		ret._poolName = name;
		
		return ret;
	}
	return p.pop();
}
function generateSpineData(skeletonData, spineName) {
	const spineAtlas = createSpineTextureAtlas(skeletonData, spineName);
	const spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas);
	const spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);
	return spineJsonParser.readSkeletonData(skeletonData);
}
function createSpineTextureAtlas(skeletonData, spineName) {
	// Fetch all texture names used in the spine
	const nonTextureItemTypes = ['path', 'clipping', 'boundingbox', 'point'];
	const defaultSkinAttachments = Array.isArray(skeletonData.skins)
		? skeletonData.skins.find(({ name }) => name === 'default').attachments
		: skeletonData.skins.default; // spine version before 3.8 support;
	const textureNamesSet = new Set();
	Object.values(defaultSkinAttachments).forEach(slot => {
		Object.keys(slot)
			.filter(itemName => !nonTextureItemTypes.includes(slot[itemName].type))
			.forEach(textureName => textureNamesSet.add(slot[textureName].path || textureName));
	});

	const textureAtlas = new PIXI.spine.core.TextureAtlas();

	textureNamesSet.forEach(texturePath => {
		const textureFileName = texturePath.substring(texturePath.lastIndexOf('/'));
		const texture = Lib.getTextureEndingWith(texturePath + '.png') || Lib.getTextureEndingWith(texturePath + '.jpg') ||
			Lib.getTextureEndingWith(textureFileName + '.png') || Lib.getTextureEndingWith(textureFileName + '.jpg');
		assert(texture, `can't find texture (${texturePath}.png or ${texturePath}.jpg) for spine (${spineName})`);
		textureAtlas.addTexture(texturePath, texture);
	});

	return textureAtlas;
}

function disposeSpineInstance(o) {
	o.visible = true;
	o.tint = 0xffffff;
	if (o.state.getCurrent(0)) {
		o.state.clearTrack(0);
		o.skeleton.setToSetupPose();
	}
	pool(o._poolName).push(o);
}

export default class Spine extends Container {

	_initSpine() {
		assert(!this.spineContent, "spine content was not disposed released properly.");
		if(this.spineData) {
			assert(PIXI.spine.Spine, "pixi-spine.js is not imported properly.");

			if(!Lib.resources[this.spineData]) {
				this.spineData = null;
				return;
			}

			this.updateTime = 0;
			this.spineContent = getSpineInstance(this.spineData);
			this.spineContent.state.timeScale = this._speed;
			/// #if EDITOR
			__getNodeExtendData(this.spineContent).hidden = true;
			/// #endif
			this.addChild(this.spineContent);
			this._refreshAnimation(true);
		}
	}

	_refreshAnimation(setImmediately = false) {
		this._animationIsDirty = true;
		this._setImmediately = setImmediately;

		/// #if EDITOR
		if(game.__EDITOR_mode) {
			
			if(this.spineContent) {
				if(!this._currentAnimation) {
					this._currentAnimation = this.spineContent.state.data.skeletonData.animations[0].name;
					Lib.__invalidateSerializationCache(this);
				}

				if(!this.spineContent.state.data.skeletonData.findAnimation(this._currentAnimation)) {
					this._currentAnimation = this.spineContent.state.data.skeletonData.animations[0].name;
					Lib.__invalidateSerializationCache(this);
				}

				this.spineContent.skeleton.setSkin(null);
				if (this.currentSkin) {
					this.spineContent.skeleton.setSkinByName(this.currentSkin);
				}

				this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
				
				this._animationIsDirty = false;
				this.spineContent.update(this.__previewFrame);
			}
		}
		/// #endif
	}
	/// #if EDITOR

	constructor() {
		super();
		this.__exitPreviewMode = this.__exitPreviewMode.bind(this);
	}

	__EDITOR_onCreate() {
		this.spineData = Object.keys(Lib.resources).find((res) => res.spineData);
	}

	__beforeDestroy() {
		this._releaseSpine();
	}

	set __duration(v) {}

	get __duration() {
		return this.spineContent && Math.ceil(this.spineContent.state.data.skeletonData.animations.find((a) => {
			return a.name === this.currentAnimation;
		}).duration * 60);
	}

	__goToPreviewMode() {
		if(this.spineContent) {
			this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
			this.spineContent.autoUpdate = true;
		}
	}

	set __previewFrame(v) {
		this.___previewFrame = v;
		if(game.__EDITOR_mode && this.spineContent) {
			this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
			this.spineContent.update(this.__previewFrame);
		}
	}

	get __previewFrame() {
		return this.___previewFrame || 0;
	}
	
	__exitPreviewMode() {
		if(this.spineContent) {
			this.spineContent.autoUpdate = false;
			this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
			this.spineContent.update(this.__previewFrame);
		}
	}

	__afterDeserialization() {
		this.tint = this.tint; // eslint-disable-line no-self-assign
	}

	/// #endif

	gotoLabelRecursive(labelName) {
		for (let c of this.children) {
			if(c !== this.spineContent) {
				c.gotoLabelRecursive(labelName);
			}
		}
	}

	setCurrentAnimation(v) {
		this.currentAnimation = v;
	}

	set currentAnimation(v) {
		if(this._currentAnimation === v) return;

		const isNeedSetInitialAnimation = !this._currentAnimation && this.spineContent;
		this._currentAnimation = v;

		if (isNeedSetInitialAnimation) {
			this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
			this.spineContent.update(
				/// #if EDITOR
				game.__EDITOR_mode ? this.__previewFrame :
				/// #endif
					0
			);
		} else {
			this._refreshAnimation();
		}
	}

	get currentAnimation() {
		return this._currentAnimation;
	}

	setCurrentSkin(v) {
		this.currentSkin = v;
	}

	set currentSkin(v) {
		if(this._currentSkin !== v) {
			this._currentSkin = v;
			this._refreshAnimation();
		}
	}

	get currentSkin() {
		if (this._currentSkin && this.spineContent && this.spineContent.skeleton.data.findSkin(this._currentSkin)) {
			return this._currentSkin;
		}

		return 'default';
	}

	get loop() {
		return this._loop;
	}

	set loop(v) {
		if(this._loop !== v) {
			this._loop = v;
			this._refreshAnimation();
		}
	}
	
	setLoop(v) {
		this.loop = v;
	}

	set spineData(v) {
		if(this.spineData !== v) {
			this._spineData = v;
			this._releaseSpine();
			this._initSpine();
		}
	}

	get spineData() {
		return this._spineData;
	}

	get speed() {
		return this._speed;
	}

	set speed(v) {
		this._speed = v;
		if(this.spineContent) {
			this.spineContent.state.timeScale = v;
		}
	}

	get tint() {
		return this.useParentTint && this.parent && !isNaN(this.parent.tint)
			? this.parent.tint
			: this._tint;
	}

	set tint(v) {
		this._tint = v;
		if (this.spineContent) {
			this.spineContent.tint = this.tint;
			this._refreshAnimation();
		}
	}

	_releaseSpine() {
		if(this.spineContent) {
			this.removeChild(this.spineContent);
			if(!this.spinesPooling) {
				this.spineContent.destroy();
			} else {
				disposeSpineInstance(this.spineContent);
			}
			this.spineContent = null;
		}
	}

	onRemove() {
		this._releaseSpine();		
		super.onRemove();
		this._spineData = null;
		this._currentAnimation = null;
		this._currentSkin = null;
	}

	play(animationName, mixDuration = this.mixDuration) {
		if (!this.spineContent) return;

		if(animationName) {
			this.currentAnimation = animationName;
			const trackEntry = this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
			trackEntry.mixDuration = mixDuration;
		}
		this.isPlaying = true;
	}

	playIfDifferent(animationName, mixDuration, playIfStopped = true) {
		const isSameAnimationPlayed = this.isPlaying && animationName === this.currentAnimation;
		const isStoppedAndCantPlay = !this.isPlaying && !playIfStopped;

		if (isSameAnimationPlayed || isStoppedAndCantPlay) return;
		
		this.play(animationName, mixDuration);
	}

	playIfNot(animationName, mixDuration, playIfStopped = true, animationNamesRegexp) {
		try {
			if (RegExp(animationNamesRegexp).test(this.currentAnimation)) return;
		} catch(e) {
			assert(true, 'Invalid regular expression for playIfNot function (Spine)');
		}
		
		if (!this.isPlaying && !playIfStopped) return;

		this.play(animationName, mixDuration);
	}

	stop(isNeedRefresh) {
		if (!this.isPlaying) return;

		this.isPlaying = false;
		if (isNeedRefresh) {
			this._refreshAnimation(true);
		}
	}

	stopByName(animationName, isNeedRefresh) {
		if (!this.isPlaying) return;
		if (animationName !== this.currentAnimation) return;
		this.stop(isNeedRefresh);
	}

	update() {
		if(this.spineContent) {
			let isNeedUpdate = false;

			if (this.tint !== this.spineContent.tint) {
				this.spineContent.tint = this.tint;
				if(!this.isPlaying) {
					isNeedUpdate = true;
				}
			}
			
			if(this._animationIsDirty && this._currentAnimation) {
				this.spineContent.skeleton.setSkin(null);
				if (this.currentSkin) {
					this.spineContent.skeleton.setSkinByName(this.currentSkin);
				}
				
				const trackEntry = this.spineContent.state.setAnimation(0, this._currentAnimation, this._loop);
				trackEntry.mixDuration = this._setImmediately ? 0 : this.mixDuration;
				this.updateTime = 0;
				this._animationIsDirty = false;
				this._setImmediately = false;
				if(!this.isPlaying) {
					isNeedUpdate = true;
				}
			}
			if(this.isPlaying) {
				this.updateTime += 0.01666666666667;
			} else if (isNeedUpdate) {
				this.spineContent.update(0);
			}
		}

		if(game.isUpdateBeforeRender && this.updateTime > 0) {
			this.spineContent.update(this.updateTime);
			this.updateTime = 0;
		}

		for (let c of this.children) {
			if(c !== this.spineContent) {
				c.update();
			}
		}
	}

	hackTextureBySlotName(slotName, texture) {
		if (!this.spineContent) return;

		Spine.currentHackingSpine = this;
		if (typeof texture === 'string') {
			texture = getValueByPath(texture, this);
		}
		
		assert(texture !== PIXI.Texture.EMPTY, 'There is problems with setting EMPTY texture to slot (texture should have width and height');
		
		if (texture) {
			this.spineContent.hackTextureBySlotName(slotName, texture, texture.orig || texture.frame);
		} else {
			this.spineContent.hackTextureBySlotName(slotName, null);
		}
	}

	static allocatePool(name, count) {
		if(count > 0) {
			let a = [];
			let i;
			while(count-- > 0) {
				i = getSpineInstance(name);
				i.update(1);
				a.push(i);
			}
			while(a.length > 0) {
				disposeSpineInstance(a.pop());
			}
		}
	}

	static clearPool(name = null) {
		if(name) {
			let a = pool(name);
			while(a.length > 0) {
				a.pop().destroy();
			}
		}
		else {
			for(let a of poolMap.values()) {
				while(a.length > 0) {
					a.pop().destroy();
				}
			}
			poolMap.clear();
		}
	}
}

/// #if EDITOR
Spine.__EDITOR_group = 'Extended';
Spine.__EDITOR_icon = 'tree/spine';

const animationNamePropDesc = {
	name: 'currentAnimation',
	type: String,
	visible: (o) => {
		return o.spineContent;
	},
	disabled: () => {
		return editor.selection.length !== 1;
	},
	select: () => {
		let o = editor.selection[0];
		let ret = o.spineContent.state.data.skeletonData.animations.map((a) => {
			return {name: a.name, value: a.name};
		});
		return ret;
	},
};

const skinNamePropDesc = {
	name: 'currentSkin',
	type: String,
	visible: (o) => {
		return o.spineContent && o.spineContent.skeleton.data.skins.length;
	},
	disabled: () => {
		return editor.selection.length !== 1;
	},
	select: () => {
		let o = editor.selection[0];
		let ret = o.spineContent.skeleton.data.skins.map(({name}) => ({name, value: name}));
		return ret;
	}
};

Object.defineProperty(Spine.prototype, 'tintR', {
	get:function () {
		return this.tint >> 16;
	},
	set:function (v) {
		this.tint = (this.tint & 0xFFFF) | (v << 16);
	}, configurable: true
});
Object.defineProperty(Spine.prototype, 'tintG', {
	get:function () {
		return (this.tint & 0xFF00) >> 8;
	},
	set:function (v) {
		this.tint = (this.tint & 0xFF00FF) | (v << 8);
	}, configurable: true
});
Object.defineProperty(Spine.prototype, 'tintB', {
	get:function () {
		return this.tint & 0xFF;
	},
	set:function (v) {
		this.tint = (this.tint & 0xFFFF00) | v;
	}, configurable: true
});

__EDITOR_editableProps(Spine, [
	{
		type: 'splitter',
		title: 'Spine:',
		name: 'spine'
	},
	window.makeResourceSelectEditablePropertyDescriptor('spineData', true, true,(r) => {
		let res = Lib.resources[r.name];
		return res.data && res.data.hasOwnProperty('skeleton');
	}),
	animationNamePropDesc,
	skinNamePropDesc,
	{
		name:'isPlaying',
		type:Boolean,
		default:true
	},
	{
		name:'loop',
		type:Boolean,
		default:true
	},
	{
		name:'speed',
		type:Number,
		default: 1,
		min: -1,
		step: 0.01
	},
	{
		name:'mixDuration',
		type:Number,
		default: 0.25,
		min: 0,
		step: 0.01
	},
	{
		name: 'tint',
		basis: 16,
		type: Number,
		default: 0xFFFFFF,
		max: 0xFFFFFF,
		min: 0,
		notAnimate: true,
		disabled:(node) => node.useParentTint
	},
	{
		name: 'tintR',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSerializable: true,
		disabled:(node) => node.useParentTint
	},
	{
		name: 'tintG',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSerializable: true,
		disabled:(node) => node.useParentTint
	},
	{
		name: 'tintB',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSerializable: true,
		disabled:(node) => node.useParentTint
	},
	{
		name:'useParentTint',
		type:Boolean,
		default: false
	},
	{
		name:'spinesPooling',
		type:Boolean,
		default: true
	},
	{
		name:'interactiveChildren',
		type:Boolean,
		default: true
	},
	{
		name:'__duration',
		type:'ref'
	},
	{
		name:'__previewFrame',
		type:Number,
		min: 0,
		step: 0.001
	},
	window.makePreviewModeButton('Preview animation', 'components.Spine#preview-animation'),
]);

Spine.prototype.play.___EDITOR_isGoodForCallbackChooser = true;
Spine.prototype.stop.___EDITOR_isGoodForCallbackChooser = true;
Spine.prototype.setCurrentAnimation.___EDITOR_isGoodForCallbackChooser = true;
Spine.prototype.setCurrentAnimation.___EDITOR_callbackParameterChooserFunction = (context) => {
	const spineContent = context.spineContent;
	const list = spineContent.skeleton.data.animations.map((a) => ({name: a.name}));
	return editor.ui.modal.showListChoose("Choose spine skin", list)
		.then((choose) => choose ? choose.name : null);
};
Spine.prototype.setCurrentSkin.___EDITOR_isGoodForCallbackChooser = true;
Spine.prototype.setCurrentSkin.___EDITOR_callbackParameterChooserFunction = (context) => {
	const spineContent = context.spineContent;
	if (!context.spineContent || !context.spineContent.skeleton.data.skins) {
		return Promise.resolve('enterSkinNameHere');
	}

	const list = spineContent.skeleton.data.skins.map((skin) => ({name: skin.name}));
	return editor.ui.modal.showListChoose("Choose spine skin", list)
		.then((choose) => choose ? choose.name : null);
};

/// #endif
