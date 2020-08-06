import game from "../game.js";
import Sound from "../utils/sound.js";
import Lib from "../lib.js";
import Container from "./container.js";
import callByPath from "../utils/call-by-path.js";
import getValueByPath from "../utils/get-value-by-path.js";
import MusicFragment from "../utils/music-fragment.js";

const MIN_VOL_THRESHOLD = 0.0101; // howler has min threshold 0.01

const allActiveMusics = [];

let musicRecalculationIsScheduled;

export default class BgMusic extends Container {

	constructor() {
		super();
		this._externalVolume = 0;
	}

	init() {
		this._externalVolume = 0;
		super.init();
		assert(allActiveMusics.indexOf(this) < 0, "BgMusic reference already registered");
		allActiveMusics.push(this);
		BgMusic._recalculateMusic();
		if(!this.dynamicPreloading) {
			Lib.preloadSound(this.intro
				/// #if EDITOR
				, this
				/// #endif
			);
			Lib.preloadSound(this.loop
				/// #if EDITOR
				, this
				/// #endif
			);
		}
		this._musInitialized = true;
		this.applyResetPosition();
		BgMusic._recalculateMusic();
	}

	onRemove() {
		super.onRemove();
		let i = allActiveMusics.indexOf(this);
		assert(i >= 0, 'BgMusic reference lost');
		allActiveMusics.splice(i, 1);
		BgMusic._recalculateMusic();
		this._externalVolume = 0;
		this._musInitialized = false;
		this.customFade = null;
	}

	setVolume(v) {
		this.volume = v;
	}

	update() {
		super.update();
		if(this._isPlaying && this.globalVolumePath) {
			if(this._appliedPathVol !== getValueByPath(this.globalVolumePath, this)) {
				BgMusic._recalculateMusic();
			}
		}
	}

	applyResetPosition() {
		if(this.isPlaying && this.resetPositionOnPlay) {
			this.resetPosition();
		}
	}

	get isPlaying() {
		return this._isPlaying;
	}

	set isPlaying(v) {
		if(this._isPlaying !== v) {
			this._isPlaying = v;
			this.applyResetPosition();
			BgMusic._recalculateMusic();
		}
	}

	get intro() {
		return this._intro;
	}

	set intro(v) {
		if(this._intro !== v) {
			this._intro = v;
			this.musicFragmentHash = (this._intro || '') + '#' + (this._loop || '');
			BgMusic._recalculateMusic();
		}
	}

	get loop() {
		return this._loop;
	}

	set loop(v) {
		if(this._loop !== v) {
			this._loop = v;
			this.musicFragmentHash = (this._intro || '') + '#' + (this._loop || '');
			BgMusic._recalculateMusic();
		}
	}

	get volume() {
		return this._volume;
	}

	set volume(v) {
		if(this._volume !== v) {
			this._volume = v;
			BgMusic._recalculateMusic();
		}
	}

	_getTargetVol() {
		if(!this._isPlaying || !this._musInitialized) {
			return 0;
		}
		assert(!isNaN(this._volume * this._externalVolume * Sound.musicVol), 'MgMusic volume is invalid');
		let globalVolume;
		if(this.globalVolumePath) {
			this._appliedPathVol = getValueByPath(this.globalVolumePath, this);
			globalVolume = this._appliedPathVol;
		} else {
			globalVolume = Sound.musicVol;
		}
		
		return this._volume * this._externalVolume * globalVolume || 0;
	}

	play(fade) {
		this.customFade = fade;
		this.isPlaying = true;
	}

	stop(fade) {
		this.customFade = fade;
		this.isPlaying = false;
	}
	
	_getFade() {
		return typeof this.customFade === 'number' ? this.customFade : this.fade;
	}

	resetPosition() {
		MusicFragment.resetPosition(this.musicFragmentHash);
	}

	_onIntroFinish() {
		if(this.onIntroFinish) {
			callByPath(this.onIntroFinish, this);
		}
	}

	static _recalculateMusic() {
		if(!musicRecalculationIsScheduled) {
			setTimeout(recalculateMusic, 1);
			musicRecalculationIsScheduled = true;
		}
	}

	static _clearCustomFades(fade = null) {
		for(let m of allActiveMusics) {
			m.customFade = fade;
		}
		MusicFragment._applyFadeForAll(fade);
	}

	/// #id EDITOR
	static get __allActiveMusics() {
		return allActiveMusics;
	}

	get ___currentPos() {
		let f = MusicFragment.___currentPos(this.musicFragmentHash);
		if(f) {
			return f.___currentPos;
		}
		return 0;
	}
	set ___currentPos(val) {
		
	}

	__getVolume() {
		return this._currentFragment && this._currentFragment.volume();
	}

	get _currentFragment() {
		if(this._getTargetVol() > MIN_VOL_THRESHOLD) {
			return MusicFragment.__getFragment(this.musicFragmentHash);
		}
		return undefined;
	}
	/// #endif
}


const FADER_MUSIC_PRIORITY = 1000000;
const CURRENT_CONTAINER_MUSIC_PRIORITY = 100000;

function recalculateMusic() {
	
	musicRecalculationIsScheduled = false;

	/// #if EDITOR
	if(!game.projectDesc) {
		return;
	}
	/// #endif
	
	if(game._isWaitingToHideFader) {
		return;
	}
	let priorities = [];
	let musicsMap = new Map();

	let currentFader = game.currentFader;

	if(currentFader) { //to enforce mute all musics under fader
		musicsMap.set(FADER_MUSIC_PRIORITY, []);
		priorities.push(FADER_MUSIC_PRIORITY);
	}

	for(let m of allActiveMusics) {
		let root = m.getRootContainer();
		let priority;
		if(root === game.currentContainer) {
			priority = CURRENT_CONTAINER_MUSIC_PRIORITY;
		} else if(root === currentFader) {
			priority = FADER_MUSIC_PRIORITY;
		} else if(root.parent) {
			priority = root.parent.getChildIndex(root);
		} else {
			m._externalVolume = 0;
			continue;
		}
		if(!musicsMap.has(priority)) {
			priorities.push(priority);
			musicsMap.set(priority, []);
		}
		musicsMap.get(priority).push(m);
	}

	priorities.sort(sortReverted);
	let muteAllNext = game._loadingErrorIsDisplayed || ((!game.isFocused
	/// #if EDITOR
		&& false
	/// #endif
	) && game.projectDesc.muteOnFocusLost);

	/// #if EDITOR
	muteAllNext = muteAllNext || game.__EDITOR_mode;
	/// #endif
	for(let priority of priorities) {
		let a = musicsMap.get(priority);
		for(let m of a) {
			if(muteAllNext) {
				m._externalVolume = 0;
			} else if(priority < CURRENT_CONTAINER_MUSIC_PRIORITY) {
				m._externalVolume = m.volumeUnderModals;
			} else {
				m._externalVolume = 1;
			}
		}
		muteAllNext = true;
	}

	let playingFragments = [];

	for(let m of allActiveMusics) {
		let vol = m._getTargetVol();
		if((vol >= MIN_VOL_THRESHOLD) && (m._loop || m._intro)) {
			m._cachedTargetVol = vol;
			playingFragments.push(m);
		}
	}
	MusicFragment.setPlayingBGMusics(playingFragments);
}

const sortReverted = (a, b) => {
	return b - a;
};

/// #if EDITOR

BgMusic.__EDITOR_icon = 'tree/music';
BgMusic.__EDITOR_group = 'Basic';
BgMusic.prototype.play.___EDITOR_isGoodForCallbackChooser = true;
BgMusic.prototype.stop.___EDITOR_isGoodForCallbackChooser = true;

__EDITOR_editableProps(BgMusic, [
	{
		type: 'splitter',
		title: 'BgMusic:',
		name: 'bg-music'
	},
	{
		name: 'intro',
		type: String,
		select:window.makeSoundSelector(),
		filterName:'musSelector'
	},
	window.makePreviewSoundButton('intro'),
	{
		name: 'visible',
		type: Boolean,
		override: true,
		default: false,
		visible: () => {}
	},
	{
		name: 'loop',
		type: String,
		select:window.makeSoundSelector(),
		filterName:'musSelector'
	},
	window.makePreviewSoundButton('loop'),
	{
		name: 'isPlaying',
		type: Boolean,
		default: true
	},
	{
		name: 'resetPositionOnPlay',
		type: Boolean,
		default: true
	},
	{
		name: 'volume',
		type: Number,
		default: 1,
		min: 0,
		max: 1,
		step: 0.01
	},
	{
		name: 'globalVolumePath',
		type: 'data-path'
	},
	{
		name: 'fade',
		type: Number,
		default: 0.2,
		min: 0,
		step: 0.01
	},
	{
		name: 'volumeUnderModals',
		type: Number,
		default: 0.25,
		min: 0,
		max: 1,
		step: 0.01
	},
	{
		name: 'onIntroFinish',
		type: 'callback'
	},
	{
		name: 'dynamicPreloading',
		type: Boolean
	},
	{
		name: '___currentPos',
		type: 'ref'
	}
]);

/// #endif
