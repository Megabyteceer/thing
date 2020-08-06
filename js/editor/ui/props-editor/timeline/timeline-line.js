import TimelineKeyframe from "./timeline-keyframe.js";
import TimelineLoopPoint from "./timeline-loop-point.js";
import MovieClip from "thing-editor/js/engine/components/movie-clip/movie-clip.js";

let _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
};

let widthZoom;
let heightZoom;

let chartsCache = new WeakMap();

export default class Line extends React.Component {

	constructor(props) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.renderKeyframe = this.renderKeyframe.bind(this);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
	}

	renderKeyframeChart(keyFrame) {
		let field = this.props.owner.props.field;

		if(keyFrame.n && (keyFrame.t < keyFrame.n.t)) {
			let ret = [];
			if(keyFrame.n.m === 2) { //DISCRETE next frame is
				let startTime = ((keyFrame.t) * widthZoom);
				let endTime = ((keyFrame.n.t) * widthZoom);
				let startValue = scale(MovieClip.__getValueAtTime(field, (keyFrame.t)));
				if(!isNaN(startValue)) {
					let endValue = scale(MovieClip.__getValueAtTime(field, (keyFrame.n.t)));
					if(!isNaN(endValue)) {
						ret.push(startTime + ',' + startValue);
						ret.push(endTime + ',' + startValue);
						ret.push(endTime + ',' + endValue);
					}
				}
				
			} else {
				let n = keyFrame.n;
				for(let i = keyFrame.t + ((keyFrame.t > 0) ? 1 : 0); i <= n.t; i++) {
					let v = scale(MovieClip.__getValueAtTime(field, i));
					if(isNaN(v)) {
						break;
					}
					ret.push((i * widthZoom) + ',' + v);
				}
			}
			return ret.join(' ');
		}
		return '';
	}

	renderKeyframe(keyFrame) {
		return React.createElement(TimelineKeyframe, {key: keyFrame.___react_id, keyFrame, owner:this});
	}

	static invalidateChartsRenderCache(field = null) {
		if(field) {
			chartsCache.delete(field);
		} else {
			chartsCache = new WeakMap();
		}
	}

	onMouseDown(ev) {
		if(ev.buttons === 2 && !ev.ctrlKey) {
			this.props.owner.toggleKeyframe(editor.Timeline.mouseEventToTime(ev));
		}
	}

	render() {
		widthZoom = this.props.owner.props.owner.props.widthZoom;
		heightZoom = this.props.owner.props.owner.props.heightZoom;
		const ownerProps =this.props.owner.props;
		let field = ownerProps.field;

		let lastKeyframe = field.t[field.t.length - 1];
		let width = 0;
		if(lastKeyframe) {
			width = Math.max(lastKeyframe.t, lastKeyframe.j);
		}
		width += 300;
		width *= widthZoom;
		let height = heightZoom;
		
		MovieClip.__getValueAtTime(field, lastKeyframe.t); //cache timeline's values
		_scale = field.___cacheTimeline.max - field.___cacheTimeline.min;
		if(_scale === 0) {
			_scale = 1;
		}
		_scale = (heightZoom - 10) / _scale;
		_shift = field.___cacheTimeline.max + 1 / _scale;
		
		if(!chartsCache.has(field)) {
			if(isNaN(field.___cacheTimeline.max)) {
				chartsCache.set(field, R.span());
			} else {
				chartsCache.set(field,
					R.svg({className:'timeline-chart', height, width},
						R.polyline({points:field.t.map(this.renderKeyframeChart, field).join(' ')})
					)
				);
			}
		}

		let keyframes = [];
		let loopPoints = [];

		for(let k of field.t) {
			keyframes.push(this.renderKeyframe(k));
			if(k.t !== k.j || k.___keepLoopPoint) {
				loopPoints.push(
					React.createElement(TimelineLoopPoint, {key: k.___react_id, owner:this, keyFrame:k, widthZoom})
				);
			}
		}
			

		return R.div(
			{
				style:{width, height}, onMouseDown:this.onMouseDown},
			keyframes,
			loopPoints,
			chartsCache.get(field),
			React.createElement(PlayingDisplay, this.props)
		);
	}
}

class PlayingDisplay extends React.Component {
	componentDidMount() {
		this.interval = setInterval(this.update.bind(this), 35);
	}
	
	componentWillUnmount() {
		clearInterval(this.interval);
	}
	
	update() {
		let fieldPlayer = this.props.owner.props.owner.props.node.fieldPlayers[this.props.owner.props.fieldIndex];
		this.fieldPlayer = fieldPlayer;
		if(fieldPlayer && fieldPlayer.time !== this.renderedTime) {
			this.renderedTime = fieldPlayer.time;
			this.forceUpdate();
		}
	}
	
	render () {
		if(!this.fieldPlayer) {
			return R.div();
		} else {
			let firedFrame;
			if(this.fieldPlayer.__lastFiredKeyframe) {
				firedFrame = R.div({className:'timeline-fire-indicator', style:{left: this.fieldPlayer.__lastFiredKeyframe.t * widthZoom}});
			}
			return R.fragment(
				R.div({className:'timeline-play-indicator', style:{left: (this.fieldPlayer.time - 1) * widthZoom}}),
				firedFrame
			);
		}
		
	}
}