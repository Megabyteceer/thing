import Timeline from "./timeline.js";
import Window from "../../window.js";

let timelineRect;
let isDragging;

let x;
let y;
let w;
let h;

export default class TimelineSelectFrame extends React.Component {

	onMouseDown(ev) {
		timelineRect = Timeline.timelineDOMElement.getBoundingClientRect();
		isDragging = true;
		let s = Window.all.timeline.renderedScale;
		x = (ev.clientX - timelineRect.x) / s;
		y = (ev.clientY - timelineRect.y) / s;
		w = 0;
		h = 0;
		this.forceUpdate();
	}

	onMouseMove(ev) {
		if(isDragging) {
			let s = Window.all.timeline.renderedScale;

			w = (ev.clientX - timelineRect.x) / s - x;
			h = (ev.clientY - timelineRect.y) / s - y;
			this.forceUpdate();
		}
	}

	cancelSelection() {
		if(isDragging) {
			isDragging = false;
			this.forceUpdate();
		}
	}

	getRectAndFinishDragging() {
		if(isDragging) {
			isDragging = false;
			
			let a = document.querySelector('.timelilne-select-frame');
			if(!a) {
				return;
			}
			let ret = a.getBoundingClientRect();
			this.forceUpdate();

			return ret;
		}
	}

	render() {
		if(isDragging) {
			return R.div({className: 'timelilne-select-frame',
				style: {
					left: (w >= 0) ? x : x + w,
					top: (h >= 0) ? y : y + h,
					width: Math.abs(w),
					height: Math.abs(h)
				}});
		}
		return R.span();
	}
}