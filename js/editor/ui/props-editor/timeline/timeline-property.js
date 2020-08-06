import Timeline from './timeline.js';
import Window from '../../window.js';
import MovieClip from 'thing-editor/js/engine/components/movie-clip/movie-clip.js';

function bringTimelineForward() {
	Window.bringWindowForward('#window-propsEditor');
	Window.bringWindowForward('#window-timeline', true);
}

export default class TimelineProperty extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {toggled:editor.settings.getItem('timeline-showed', true)};
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	componentDidMount() {
		bringTimelineForward();
		this._renderWindow();
	}

	componentWillUnmount() {
		this._hideWindow();
	}

	onToggleClick() { //show/hide timeline window
		let t = !this.state.toggled;
		this.setState({toggled: t});
		editor.settings.setItem('timeline-showed', t);
		if(t) {
			bringTimelineForward();
		}
	}

	onAutoSelect(selectPath) {
		if(!this.state.toggled) {
			this.onToggleClick();
			setTimeout(()=> {
				Timeline.onAutoSelect(selectPath);
			}, 1);
		} else {
			Timeline.onAutoSelect(selectPath);
		}
	}
	
	render () {
		return R.btn(this.state.toggled ? 'Close Timeline (Ctrl+L)' : 'Open timeline (Ctrl+L)', this.onToggleClick, undefined, undefined, 1076);
	}

	componentDidUpdate() {
		this._renderWindow();
	}

	_renderWindow() {
		if(this.state.toggled) {
			
			let timeline = editor.ui.renderWindow('timeline', 'Timeline', 'Timeline',
				R.div({title:''},
					React.createElement(Timeline, {onCloseClick:this.onToggleClick}),
				), 586, 650, 1270, 150, 1270, 407);

			ReactDOM.render(timeline, document.getElementById('additional-windows-root'));
		} else {
			this._hideWindow();
		}
	}

	_hideWindow() {
		ReactDOM.render(R.fragment(), document.getElementById('additional-windows-root'));
		if(editor.game.currentContainer && editor.game.__EDITOR_mode) {
			for(let m of editor.game.currentContainer.findChildrenByType(MovieClip)) {
				m.resetTimeline();
			}
		}
	}
}

