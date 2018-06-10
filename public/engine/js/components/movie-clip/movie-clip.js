import DSprite from '../sprite.js';
import Pool from "utils/pool.js";
import FieldPlayer from "./field-player.js";

export default class MovieClip extends DSprite {

	constructor() {
		super();
		this.fieldPlayers = [];
	}

	update() {
		if (this.isPlaying) {
			if (this.delay > 0) {
				this.delay--;
			} else {
				for(let p of this.fieldPlayers) {
					if (this.isPlaying) {
						p.update();
					}
				}
			}
		}
		super.update();
	}

/// #if EDITOR
//timeline reading has sense in editor mode only
	get timeline() { //serialize timeline to save in Lib as json. Replace keyframes references to indexes
		if(!this._timelineData || editor.ui.propsEditor.__isPropsRenderingAccessTime) {
			return null;
		}
		if(!serializeCache.has(this._timelineData)) {
			console.warn("MovieClip serialization invoked >>>");
			let tl = this._timelineData;
			let fields = tl.f.map((f) => {
				return {
					n: f.n,
					t: f.t.map((k) => {
						let ret = Object.assign({}, k);
						if(ret.j === ret.t) {
							delete(ret.j);
						}
						if(ret.m === 0) {
							delete ret.m;
						}
						delete ret.n;
						return ret;
					})
				};
			});

			let labels = {};
			for(let key in tl.l) {
				let label = tl.l[key];
				labels[key] = label.t;
			}
			let c = {
				l: labels,
				p: tl.p,
				d: tl.d,
				f: fields
			};
			serializeCache.set(this._timelineData, c);
		}
		return serializeCache.get(this._timelineData);
	}

	static invalidateSerializeCache (timelineData) {
		deserializeCache.delete(serializeCache.get(timelineData));
		serializeCache.delete(timelineData);
	}
/// #endif

	static _findNextKeyframe (timeLineData, time) {
		let ret;
		for(let f of timeLineData) {
			if(f.t > time) {
				return f;
			}
			ret = f;
		}
		return ret;
	}

	static _deserializeTimelineData(tl) {
		let fields = tl.f.map((f) => {

			let fieldTimeline = f.t.map((k) => {
				let ret =  Object.assign({}, k);
				if(!ret.hasOwnProperty('j')) {
					ret.j = ret.t;
				}
				if(!ret.hasOwnProperty('m')) {
					ret.m = 0; //- SMOOTH
				}
				return ret;
			});
			for(let f of fieldTimeline) {
				f.n = MovieClip._findNextKeyframe(fieldTimeline, f.j);
			}
			return {
				n: f.n,
				t: fieldTimeline
			};
		});

		let labels = {};
		for(let key in tl.l) {
			let labelTime = tl.l[key];
			let nexts = fields.map((field) => {
				return MovieClip._findNextKeyframe(field.t, labelTime - 1);
			});
			labels[key] = {t: labelTime, n: nexts};
		}
		return {
			l: labels,
			p: tl.p,
			d: tl.d,
			f: fields
		};
	}

	set timeline(data) {
		if(data === null) return;

		if(!deserializeCache.has(data)
/// #if EDITOR
			|| editor.disableFieldsCache
/// #endif
		) {
			let desData = MovieClip._deserializeTimelineData(data);
			deserializeCache.set(data, desData);
/// #if EDITOR
			serializeCache.set(desData, data);
/// #endif
		}
		data = deserializeCache.get(data);


		assert(Array.isArray(data.f), "Wrong timeline data?");
		this._timelineData = data;

		let pow = data.p; //smooth fields dynamic parameters
		let damper = data.d;

		while (this.fieldPlayers.length > 0) {
			Pool.dispose(this.fieldPlayers.pop());
		}
		let fieldsData = data.f;
		for(let i = 0; i < fieldsData.length; i++) {
			let p = Pool.create(FieldPlayer);
			p.init(this, fieldsData[i], pow, damper);
			this.fieldPlayers.push(p);
		}
	}

	resetTimeline() {
		for (let p of this.fieldPlayers) {
			p.reset();
		}
	}

	hasLabel(labelName) {
		return this._timelineData.l.hasOwnProperty(labelName);
	}

	gotoLabel(labelName) {
		let label = this._timelineData.l[labelName];
		let l = this.fieldPlayers.length;
		for(let i =0; i < l; i++) {
			this.fieldPlayers[i].goto(label.t, label.n[i]);
		}
		this.play();
	}

	play() {
		this.isPlaying = true;
	}

	stop() {
		this.isPlaying = false;
	}

	playRecursive() {
		for (let c of this.findChildrenByType(MovieClip)) {
			c.isPlaying = true;
		}
	}

	stopRecursive() {
		for (let c of this.findChildrenByType(MovieClip)) {
			c.isPlaying = false;
		}
	}
}


let deserializeCache = new WeakMap();

/// #if EDITOR

let serializeCache = new WeakMap();
MovieClip.EDITOR_group = 'Basic';
MovieClip.EDITOR_icon = 'tree/movie';
MovieClip.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'MovieClip:',
		name: 'movieclip'
	},
	{
		name: 'isPlaying',
		type: Boolean,
		default: true
	},
	{
		name: 'delay',
		type: Number,
		min: 0
	},
	{
		name: 'timeline',
		type: 'timeline'
	}
];

/// #endif
