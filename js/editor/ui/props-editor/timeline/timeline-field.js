import MovieClip from "thing-editor/js/engine/components/movie-clip/movie-clip.js";
import Timeline from "./timeline.js";
import Line from "./timeline-line.js";
import TimelilneFieldControls from "./timeline-field-controls.js";

export default class FieldsTimeline extends React.Component {

	constructor(props) {
		super(props);
		this.onRemoveFieldClick = this.onRemoveFieldClick.bind(this);
		this.onGoLeftClick = this.onGoLeftClick.bind(this);
		this.onGoRightClick = this.onGoRightClick.bind(this);
		this.onToggleKeyframeClick = this.onToggleKeyframeClick.bind(this);
		this.toggleKeyframe = this.toggleKeyframe.bind(this);
		props.field.___view = this;
	}

	UNSAFE_componentWillReceiveProps(props) {
		let k1 = this.props.field;
		let k2 = props.field;
		if(k1.___view === this) {
			k1.___view = null;
		}
		k2.___view = this;
	}

	componentWillUnmount() {
		if(this.props.field.___view === this) {
			this.props.field.___view = null;
		}
	}

	onToggleKeyframeClick() {
		this.toggleKeyframe(this.props.owner.props.owner.getTime());
	}

	toggleKeyframe(time) {
		let field = this.props.field;
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, time-1);
		if(currentKeyframe.t !== time) {
			this.props.owner.createKeyframeWithTimelineValue(field, time);
			this.forceUpdateDebounced();
		} else {
			this.deleteKeyframe(currentKeyframe);
		}
	}

	deleteKeyframe(keyFrame) {
		let f = this.props.field;
		let i = f.t.indexOf(keyFrame);
		assert(i >= 0, "can't delete keyFrame.");
		if(i > 0) {
			Timeline.unselectKeyframe(keyFrame);
			f.t.splice(i, 1);
			this.onChanged();
			this.forceUpdateDebounced();
		}
	}
	
	onRemoveFieldClick() {
		editor.ui.modal.showEditorQuestion("Field animation delete", "Are you sure you want to delete animation track for field '" + this.props.field.n + "'?",
			() => {
				this.props.owner.deleteAnimationField(this.props.field);
			}, 'Delete'
		);
	}
	
	gotoNextKeyframe(direction) {
		let field = this.props.field;
		let timeline = this.props.owner.props.owner;
		let currentTime = timeline.getTime();
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		
		let i = field.t.indexOf(currentKeyframe);
		
		let moved = (currentKeyframe.t - currentTime);
		
		if(!(((direction > 0) === (moved > 0)) && ((direction < 0) === (moved < 0)))) {
			i += direction;
			if(i < 0) {
				i = field.t.length -1;
			}
			else if(i >= field.t.length) {
				i = 0;
			}
		}
		timeline.selectKeyframe(field.t[i]);
	}
	
	onGoLeftClick() {
		this.gotoNextKeyframe(-1);
	}
	
	onGoRightClick() {
		this.gotoNextKeyframe(1);
	}

	forceUpdateDebounced() {
		if(!this.forceUpdateDebouncedTimer) {
			this.forceUpdateDebouncedTimer = setTimeout(() => {
				this.forceUpdateDebouncedTimer = null;
				this.forceUpdate();
			}, 0);
		}
	}

	onChanged() {
		let node = this.props.owner.props.node;
		let field = this.props.field;
		Timeline.fieldDataChanged(field, node);
		this.forceUpdateDebounced();
		setTimeout(() => {
			node.__applyValueToMovieClip(field, this.props.owner.props.owner.getTime());
		}, 1);
	}

	render() {
		let p = this.props.owner.props;
		let height = p.heightZoom;
		return R.div({
			className: 'field-timeline',
			style: {
				backgroundSize:  (60 * p.widthZoom)  + 'px ' + (height - 10) + 'px',
				height 
			}
		},
		React.createElement(TimelilneFieldControls, {owner: this}),
		React.createElement(Line, {owner: this})
		);
	}
}
