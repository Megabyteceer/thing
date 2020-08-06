import Timeline from "./timeline.js";

export default class TimelineLoopPoint extends React.Component {
	
	constructor(props) {
		super(props);
		this.onLoopPointMouseDown = this.onLoopPointMouseDown.bind(this);
		Timeline.registerDraggableComponent(this);
	}
	
	componentDidMount() {
		Timeline._justModifiedSelectable(this);
		this.props.keyFrame.___loopPointView = this;
	}

	UNSAFE_componentWillReceiveProps(props) {
		let t1 = this.props.keyFrame;
		let t2 = props.keyFrame;
		if(t1 !== t2) {
			delete t1.___loopPointView;
			t2.___loopPointView = this;
			Timeline._justModifiedSelectable(this);
		}
	}

	getTime() {
		const keyFrame = this.props.keyFrame;
		return keyFrame.j;
	}

	setTime(time) {
		const keyFrame = this.props.keyFrame;
		if(keyFrame.j !== time) {
			keyFrame.j = time;
			this.onChanged();
		}
	}

	onLoopPointMouseDown(ev) {
		if(ev.buttons === 2) {
			this.deleteLoopPoint();
			sp(ev);
		} else {
			this.onDraggableMouseDown(ev);
		}
	}

	deleteLoopPoint() {
		Timeline.unselectComponent(this);
		let keyFrame = this.props.keyFrame;
		keyFrame.j = keyFrame.t;
		this.onChanged();
		this.props.owner.forceUpdate();
	}

	onChanged() {
		this.props.owner.props.owner.onChanged();
	}

	componentWillUnmount() {
		delete this.props.keyFrame.___loopPointView;
		Timeline.unregisterDraggableComponent(this);
	}

	render() {
		let width = this.props.widthZoom;
		let keyFrame = this.props.keyFrame;

		let className = 'timeline-loop-point';
		if(this.state && this.state.isSelected) {
			className += ' timeline-loop-point-selected';
		}
		else if(keyFrame.___view.state && keyFrame.___view.state.isSelected) {
			className += ' timeline-loop-point-owner-selected';
		}

		let w = (width < 8) ? 8 : width;
		let l = keyFrame.j * width;
		if(keyFrame.j > keyFrame.t) {
			l = l - w;
		}
		return R.div({className:className,
			title: 'Loop point',
			onMouseDown: this.onLoopPointMouseDown,
			style:{width: w, left:l}},
		);
	}
}