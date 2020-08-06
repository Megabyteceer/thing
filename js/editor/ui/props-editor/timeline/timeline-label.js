import MovieClip from "thing-editor/js/engine/components/movie-clip/movie-clip.js";
import Timeline from "./timeline.js";


let labelNamesProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy field`s name',
	onMouseDown: window.copyTextByClick
};

const labelStartMarkerProps = {
	className: 'timeline-label-pointer'
};

export default class TimeLabel extends React.Component {
	
	constructor(props) {
		super(props);
		this.onDoubleClick = this.onDoubleClick.bind(this);
		this.onLabelMouseDown = this.onLabelMouseDown.bind(this);
		Timeline.registerDraggableComponent(this);
	}
	
	componentDidMount() {
		Timeline._justModifiedSelectable(this);
		this.props.label.___view = this;
	}

	UNSAFE_componentWillReceiveProps(props) {

		let k1 = this.props.label;
		let k2 = props.label;
		if(k1.___view === this) {
			k1.___view = null;
		}
		k2.___view = this;

		if(this.props.label.t !== props.label.t) {
			Timeline._justModifiedSelectable(this);
		}
	}


	componentWillUnmount() {
		Timeline.unregisterDraggableComponent(this);
	}

	getTime() {
		return this.props.label.t;
	}

	setTime(time) {
		const label = this.props.label;

		if(label.t !== time) {
			label.t = time;
			this.onChanged();
		}
	}

	onChanged() {
		this.props.owner.onLabelChange(this.props.label);
	}

	deleteLabel() {
		let name = this.props.labelName;
		editor.ui.modal.showEditorQuestion('Label removing', 'Delete Label "' + name + '"?', () => {
			Timeline.unselectComponent(this);
			let tl = this.props.owner.props.node._timelineData;
			delete tl.l[name];
			this.onChanged();
		}, R.span(null, R.icon('delete'), ' Delete'));
	}

	onLabelMouseDown(ev) {
		if(ev.buttons === 2) {
			this.deleteLabel();
			sp(ev);
		} else {
			this.onDraggableMouseDown(ev);
		}
	}

	static renormalizeLabel(label, movieClip) { //re find keyframes for modified label
		label.n = movieClip._timelineData.f.map((fieldTimeline) => {
			return MovieClip._findNextKeyframe(fieldTimeline.t, label.t - 1);
		});
		MovieClip.invalidateSerializeCache(movieClip);
	}
	
	static renormalizeAllLabels(movieClip) {
		for(let key in movieClip._timelineData.l) {
			if(!movieClip._timelineData.l.hasOwnProperty(key)) continue;
			TimeLabel.renormalizeLabel(movieClip._timelineData.l[key], movieClip);
		}
	}
	
	static askForLabelName(existingLabelsNames, title, defaultName = '', allowedDuplicateName = null) {
		return editor.ui.modal.showPrompt(title, defaultName, undefined, (nameToCheck) => {
			if(nameToCheck === allowedDuplicateName) {
				return;
			}
			if(existingLabelsNames.indexOf(nameToCheck) >= 0) {
				return 'Label with that name already exists.';
			}
		});
	}

	onDoubleClick  (ev) { //rename label by double click
		let tl = this.props.owner.props.node._timelineData;
		let label = this.props.label;
		let name = this.props.labelName;

		TimeLabel.askForLabelName(this.props.labelsNamesList, "Rename label", name, name).then((enteredName) => {
			if(enteredName && (name !== enteredName)) {
				tl.l[enteredName] = label;
				delete tl.l[name];
				this.onChanged();
			}
		});
		sp(ev);
	}

	render () {

		let className = 'timeline-label';
		if(this.state && this.state.isSelected) {
			className += ' timeline-label-selected';
		}

		let label = this.props.label;
		let name = this.props.labelName;
		
		return R.div({className, id:'timeline-label-' + name.replace('.', '-').replace('#', '-') , style:{left: label.t * this.props.owner.props.widthZoom},
			onMouseDown: this.onLabelMouseDown,
			onDoubleClick: this.onDoubleClick
		},
		R.div(labelStartMarkerProps),
		R.span(labelNamesProps, name)
		);
	}
}
