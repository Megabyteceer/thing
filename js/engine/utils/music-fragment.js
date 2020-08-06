import {stepTo} from "../utils/utils.js";
import Lib from "../lib.js";
import game from "../game.js";

const MIN_VOL_THRESHOLD = 0.0101; // howler has min threshold 0.01

const FADE_INTERVAL = 40;
const FADE_STEP = 1.0 / FADE_INTERVAL;

const allFragments = {};

const allActiveFragments = {};

setInterval(() => {
	for(let h in allActiveFragments) {
		allActiveFragments[h]._updateFading();
	}
}, FADE_INTERVAL);

export default class MusicFragment {

	constructor(bgMusic) {
		if(bgMusic.dynamicPreloading) {
			bgMusic.loop && Lib.preloadSound(bgMusic.loop
				/// #if EDITOR
				, bgMusic
				/// #endif
			);
			bgMusic.intro && Lib.preloadSound(bgMusic.intro
				/// #if EDITOR
				, bgMusic
				/// #endif
			);
		}
		this.onIntroEnd = this.onIntroEnd.bind(this);
		this.intro = bgMusic.intro;
		this.loop = bgMusic.loop;
		this.musicFragmentHash = bgMusic.musicFragmentHash;
	}

	_updateFading() {
		assert(this._currentFragment, "MusicFragment wrongly registered as active");
		let curVol = this.getVolume();
		if(this._fadeToVol !== curVol) {
			curVol = stepTo(curVol, this._fadeToVol, 1 / (this._fadeSpeed + 0.0001) * FADE_STEP);
			
			if(curVol < MIN_VOL_THRESHOLD && this._fadeToVol < MIN_VOL_THRESHOLD) {
				this._releaseCurrentFragment();
			} else {
				this._currentFragment.volume(curVol);
			}
		}
	}

	getVolume() {
		assert(this._currentFragment, "BgMusic component is not paying to getVolume.");
		if(this._currentFragment) {
			assert(this._currentFragment._sounds && this._currentFragment._sounds[0] && !isNaN(this._currentFragment._sounds[0]._volume), "BgMusic component is not paying to getVolume.");
			return this._currentFragment._sounds[0]._volume;
		}
		return 0;
	}

	static resetPosition(musicFragmentHash) {
		if(allFragments.hasOwnProperty(musicFragmentHash)) {
			allFragments[musicFragmentHash].resetPosition();
		}
	}

	resetPosition() {
		let restorePlaying;
		if(this._currentFragment) {
			this._releaseCurrentFragment();
			restorePlaying = true;
		}
		this.introPos = 0;
		this.loopPos = 0;
		this.isLoopPos = false;
		if(restorePlaying) {
			this.startPlay();
		}
	}

	startPlay() {

		if(this.intro && !this.isLoopPos) {
			this._playMusicFragment(this.intro, this.introPos, this._fadeToVol);
			if(this._currentFragment) {
				this._currentFragment.loop(false);
				this._currentFragment.on('end', this.onIntroEnd);
			}
		} else if(this.loop) {
			this.isLoopPos = true;
			this._playMusicFragment(this.loop, this.loopPos);
			if(this._currentFragment) {
				this._currentFragment.loop(true);
			}
		}
		assert(this._currentFragment || (!this.loop && this.isLoopPos), "Failed to play Music intro: " + (this.intro || 'EMPTY') + '; loop: ' + (this.loop || 'EMPTY'));
	}

	onIntroEnd() {
		if(this._currentFragment) {
			let vol = this.getVolume();
			this._releaseCurrentFragment();
			this._playMusicFragment(this.loop, 0, vol);
			this.isLoopPos = true;
			if(this._currentFragment) {
				this._currentFragment.loop(true);
			}
		}
		if(this.owner) {
			this.owner._onIntroFinish();	
		}
	}

	_playMusicFragment(s, pos = 0, startVol = MIN_VOL_THRESHOLD) {
		assert(!this._currentFragment, 'MusicFragment already playing.');

		if(s) {
			try {
				s = Lib.getSound(s, true);
				s.volume(startVol);
				/// #if DEBUG
				s.rate(game.__speedMultiplier);
				/// #endif
				s.seek(pos);
				s.soundIdSaved = s.play(s.soundIdSaved);

				this._currentFragment = s;
				assert(s._sounds.length === 1, "Music started in more that one instance.");
				allActiveFragments[this.musicFragmentHash] = this;
			} catch(er) {} // eslint-disable-line no-empty
		}
	}

	_releaseCurrentFragment() {
		if(this._currentFragment) {
			this._currentFragment.off('end', this.onIntroEnd);
			if(this.isLoopPos) {
				this.loopPos = this._currentFragment.seek();
			} else {
				this.introPos = this._currentFragment.seek();
			}
			this._currentFragment.stop();
		
			this._currentFragment = null;
			delete allActiveFragments[this.musicFragmentHash];
		}
	}

	static _applyFadeForAll(fade) {
		for(let h in allActiveFragments) {
			allActiveFragments[h]._fadeSpeed = fade;
		}
	}

	static setPlayingBGMusics(bgMusics) {
		let hashesToPlay = {};
		for(let f of bgMusics) {
			let fragment;

			hashesToPlay[f.musicFragmentHash] = true;

			if(!allFragments.hasOwnProperty(f.musicFragmentHash)) {
				fragment = new MusicFragment(f);
				allFragments[f.musicFragmentHash] = fragment;
			} else {
				fragment = allFragments[f.musicFragmentHash];
			}

			fragment._fadeToVol = f._cachedTargetVol;
			fragment._fadeSpeed = f._getFade();
			fragment.owner = f;
			if(!allActiveFragments.hasOwnProperty(f.musicFragmentHash)) {
				fragment.startPlay();
			}
			assert(fragment._currentFragment || (!fragment.loop && fragment.isLoopPos));
		}

		for(let h in allActiveFragments) {
			if(!hashesToPlay.hasOwnProperty(h)) {
				allActiveFragments[h]._fadeToVol = 0;
				if (allActiveFragments[h].owner) {
					allActiveFragments[h]._fadeSpeed = allActiveFragments[h].owner._getFade();
					allActiveFragments[h].owner.customFade = null;
					allActiveFragments[h].owner = null;
				}
			}
		}
	}
	/// #if DEBUG
	static __applyGameSpeed(rate) {
		for(let h in allActiveFragments) {
			let f = allActiveFragments[h];
			if(f._currentFragment) {
				f._currentFragment.rate(rate);
			}
		}
	}

	/// #endif

	/// #if EDITOR
	static ___currentPos(musicFragmentHash) {
		let f = MusicFragment.__getFragment(musicFragmentHash);
		return f ? f.seek() : 0;
	}

	static __getFragment(musicFragmentHash) {
		if(allActiveFragments[musicFragmentHash]) {
			return allActiveFragments[musicFragmentHash]._currentFragment;
		}
	}

	static __stopAll() {
		for(let h in allActiveFragments) {
			MusicFragment.resetPosition(h);
			allActiveFragments[h]._releaseCurrentFragment();
		}
	}
	/// #endif

}
