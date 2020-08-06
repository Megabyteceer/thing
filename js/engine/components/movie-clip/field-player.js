import callByPath from "../../utils/call-by-path.js";

export default class FieldPlayer {
	
	init(target, data, pow, damper) {
		
		this.target = target;
		this.fieldName = data.n;
		this.timeline = data.t;
		this.pow = pow;
		this.damper = damper;
		this.reset();
	}
	
	reset(
		/// #if EDITOR
		ignoreRandom = false
		/// #endif
	) {
		this.time = 0;
		this.currentFrame = this.timeline[0];
		if(this.currentFrame.hasOwnProperty('r')
			/// #if EDITOR
			&& !ignoreRandom
			/// #endif
		) {
			this.time += Math.round(Math.random() * this.currentFrame.r);
		}
		this.val = this.currentFrame.v;
		this.targetVal = this.val;
		this.speed = 0;
		
		/// #if EDITOR
		if(editor.game.__EDITOR_mode && this.target.__previewFrame) {
			let kf = this.timeline.find((kf) => {
				return kf.t >= this.target.__previewFrame;
			}) || this.timeline[this.timeline.length - 1];
			if(kf) {
				this.target[this.fieldName] = kf.v;
				return;
			}
		}
		/// #endif
		this.target[this.fieldName] = this.val;
	}
	
	goto(time, nextKeyframe) {
		this.time = time;
		this.currentFrame = nextKeyframe;
		if(nextKeyframe.m === 1) { //LINEAR
			let dist = nextKeyframe.t - this.time;
			if(dist > 0) {
				this.speed = (nextKeyframe.v - this.val) / dist;
			} else {
				this.speed = 0;
			}
		} else if (nextKeyframe.m === 2) {//DISCRETE
			this.speed = 0;
		}
		
		
	}
	
	update(
		/// #if EDITOR
		ignoreRandom = false
		/// #endif
	) {
		let currentFrame = this.currentFrame;
		if (this.time === currentFrame.t) {
			/// #if EDITOR
			this.__lastFiredKeyframe = currentFrame;
			/// #endif
			let action;
			if (currentFrame.hasOwnProperty('a')) {
				action = currentFrame.a;
			}
			
			if (currentFrame.m === 1 || currentFrame.m === 2) { //LINEAR and DISCRETE Mode fields apply exact value at the end
				this.val = currentFrame.v;
			}
			
			this.time = currentFrame.j;
			if(currentFrame.hasOwnProperty('r')
				/// #if EDITOR
				&& !ignoreRandom
				/// #endif
			) {
				this.time += Math.round(Math.random() * currentFrame.r);
			}

			if (currentFrame.m === 0 && this.currentFrame.m === 0) { //- SMOOTH
				this.speed += (currentFrame.v - this.val) * this.pow;
				this.val += this.speed;
				this.speed *= this.damper;
			}

			if(currentFrame.hasOwnProperty('s')) {
				this.speed = currentFrame.s;
			}
			
			this.currentFrame = currentFrame = currentFrame.n;
			if(currentFrame.m === 1) {// LINEAR Mode
				let dist = currentFrame.t - this.time;
				if(dist > 0) {
					this.speed = (currentFrame.v - this.val) / dist;
				} else {
					this.speed = 0;
				}
			}
			
			if (action) {
				/// #if EDITOR
				if(!this.__doNotCallActions) {
					if(this.target.__logLevel > 1) {
						editor.ui.status.warn('action call: ' + action + '; timeline time: ' + this.time, 99999, this.target, undefined, true);
					}
					/// #endif
					callByPath(action, this.target);
					/// #if EDITOR
				}
				/// #endif
			}
		} else {
			/// #if EDITOR
			this.__lastFiredKeyframe = null;
			/// #endif
		
			if (currentFrame.m === 0) { //- SMOOTH
				this.speed += (currentFrame.v - this.val) * this.pow;
				this.val += this.speed;
				this.speed *= this.damper;
			} else if(currentFrame.m === 1) { //LINEAR
				this.val += this.speed;
			} else if(currentFrame.m === 3) { //BOUNCE ⬇
				this.speed += currentFrame.g;
				this.val += this.speed;
				if(this.val >= currentFrame.v) {
					this.val = currentFrame.v;
					this.speed *= -currentFrame.b;
				}
			} else if(currentFrame.m === 4) { //BOUNCE ⬆
				this.speed -= currentFrame.g;
				this.val += this.speed;
				if(this.val <= currentFrame.v) {
					this.val = currentFrame.v;
					this.speed *= -currentFrame.b;
				}
			}
		}
		this.time++;
		this.target[this.fieldName] = this.val;
	}
	

}
