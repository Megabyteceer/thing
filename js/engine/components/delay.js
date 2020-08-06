
/*
Usage: 
	function callback() {
		
	}
	let d = Delay.delay(callback, 30); //30 frames (half of second) delay


	d.remove(); // to cancel delay.

	
	Why should you use this delay instead of standard JS setTimeout?
	This delay will be linked to current scene,
	and if user will close scene and return to main menu,
	or modal popup will appear,
	delay will be postponed until user return to scene which delay created in, and exactly 30 frames in scene will past.
	If scene will be destroyed, this delay will be canceled automaticly.
	So you will avoid tons of bugs.

	You can see all currently scheduled delays in scene's tree in editor. Аlso you can see it`s 'delay' editable property and edit it due debugging purposes.
*/


import Container from "./container.js";
import Pool from "../utils/pool.js";
import game from "../game.js";
/// #if EDITOR
import Lib from "../lib.js";
/// #endif

export default class Delay extends Container {

	static delay(callback, delayFrames, container = game.currentContainer) {
		assert(!game.__EDITOR_mode, "Attempt to create Delay.delay() in editing mode.", 10007);
		assert(callback, "Delay.delay(). Function expected as first parameter, but " + (typeof callback) + ' received.', 10008);
		assert(typeof delayFrames === 'number', "Delay.delay(). Number expected as second parameter, but " + (typeof delayFrames) + ' received.', 10009);
		
		if(delayFrames <= 0) {
			callback();
			/// #if DEBUG
			return "call back was called immediately because time were: " + delayFrames;
			/// #endif
		} else {
		
			let d = Pool.create(Delay);
			/// #if EDITOR
			Lib._constructRecursive(d);
			Lib.__reassignIds(d);
			/// #endif
			d.delay = delayFrames;
			d.callback = callback;
			container.addChild(d);
			/// #if EDITOR
			d.name = container.name + '; ' + (callback.name || 'anonymous function');
			d.___stack = editor.__getCurrentStack('Delay');

			/// #endif
			return d;
		}
	}

	/// #if EDITOR
	onRemove() {
		super.onRemove();
		if(!game.__EDITOR_mode && !game.__EDITOR_game_stopping) {
			if(this.callback) {
				editor.ui.status.warn('Delay was removed before its triggered', 32021, this);
			}
		}
		this.callback = null;
	}
	/// #endif
	
	constructor() {
		super();
		this.visible = false;
	}

	skip() { // 99999
		this.callback();
		this.callback = null;
		this.remove();
	}

	update() {
		this.delay--;
		if(this.delay < 1) {
			this.callback();
			/// #if EDITOR
			this.callback = null;
			/// #endif
			this.remove();
		}
	}
}

/// #if EDITOR
__EDITOR_editableProps(Delay, [
	{
		type: 'splitter',
		title: 'Delay:',
		name: 'delay-props'
	},
	{
		name: 'delay',
		type: Number
	},
	{
		name: '___stack',
		type: "ref",
		onClick: (val) => {
			editor.showStack(val);
		}
	}
]);
Delay.__EDITOR_icon = 'tree/timer';
/// #endif
