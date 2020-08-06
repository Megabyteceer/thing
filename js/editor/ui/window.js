import Help from "../utils/help.js";

const WORKAREA_TOP_PADDING = 30;

let emptyImage = new Image();

class CornerDragger extends React.Component {
	
	constructor(props) {
		super(props);
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
	}
	
	dragStartHandler(ev) {
		this.prevX = ev.pageX;
		this.prevY = ev.pageY;
		ev.dataTransfer.setDragImage(emptyImage, 0, 0);
	}
	
	dragHandler(ev) {
		if (this.prevX !== ev.pageX || this.prevY !== ev.pageY) {
			if (ev.pageX !== 0 || ev.pageY !== 0) {
				let ret = this.props.onDrag(ev.pageX - this.prevX, ev.pageY - this.prevY);
				if (ret) {
					this.prevX += ret.x;
					this.prevY += ret.y;
				} else {
					this.prevX = ev.pageX;
					this.prevY = ev.pageY;
				}
			}
		}
	}
	
	dragEndHandler() {
		this.props.onDragEnd();
	}
	
	render() {
		return R.div({
			className: this.props.className,
			onDragStart: this.dragStartHandler,
			onDrag: this.dragHandler,
			onDragEnd: this.dragEndHandler,
			draggable: true
		});
	}
}

function  getResolutionPrefix() {
	return '_' + Math.round(window.innerWidth / 20) + 'x' + Math.round(window.innerHeight / 20) ;
}

class Window extends React.Component {
	
	constructor(props) {
		super(props);
		const id = 'window-' + props.id;
		this.id = id;
		
		this.state = {};
		this.onClientResize();
		this.saveState = this.saveState.bind(this);
		this.deltaPosition = this.deltaPosition.bind(this);
		this.deltaLBCorner = this.deltaLBCorner.bind(this);
		this.deltaRBCorner = this.deltaRBCorner.bind(this);
		this.deltaRTCorner = this.deltaRTCorner.bind(this);
		this.deltaLTCorner = this.deltaLTCorner.bind(this);
		this.deltaR = this.deltaR.bind(this);
		this.deltaL = this.deltaL.bind(this);
		this.deltaB = this.deltaB.bind(this);
		this.deltaT = this.deltaT.bind(this);
		
		this.onMouseDown = this.onMouseDown.bind(this);
		
		window.addEventListener('resize', this.onClientResize.bind(this));
	}
	
	componentDidMount() {
		this.$ = document.querySelector('#' + this.id);
		Window.all[this.props.id] = this;
	}

	componentWillUnmount() {
		delete Window.all[this.props.id];
	}
	
	onClientResize() {
		let id = this.id + getResolutionPrefix();
		this.setSize(editor.settings.getItem(id + '.w', this.props.w), editor.settings.getItem(id + '.h', this.props.h));
		this.setPosition(editor.settings.getItem(id + '.x', this.props.x), editor.settings.getItem(id + '.y', this.props.y));
	}
	
	saveState() {
		const settings = editor.settings;
		let id = this.id + getResolutionPrefix();
		settings.setItem(id + '.x', this.state.x);
		settings.setItem(id + '.y', this.state.y);
		settings.setItem(id + '.w', this.state.w);
		settings.setItem(id + '.h', this.state.h);
	}
	
	deltaPosition(x, y) {
		let ret = {x: this.state.x, y: this.state.y};
		this.setPosition(this.state.x + x, this.state.y + y);
		ret.x = this.state.x - ret.x;
		ret.y = this.state.y - ret.y;
		return ret;
	}
	
	deltaL(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w - x, this.state.h);
		ret.x = -(this.state.w - ret.x);
		ret.y = this.state.h - ret.y;
		this.setPosition(this.state.x + ret.x, this.state.y);
		return ret;
	}
	
	deltaR(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w + x, this.state.h);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}
	
	deltaB(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w, this.state.h + y);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}
	
	deltaT(x, y) { // eslint-disable-line no-unused-vars
		if(this.state.y + y < WORKAREA_TOP_PADDING) {
			y += WORKAREA_TOP_PADDING - (this.state.y + y);
		}

		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w, this.state.h - y);
		ret.x = this.state.w - ret.x;
		ret.y = -(this.state.h - ret.y);
		this.setPosition(this.state.x, this.state.y + ret.y);
		
		return ret;
	}
	
	deltaLBCorner(x, y) {
		let ret = this.deltaL(x, y);
		let ret2 = this.deltaB(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	deltaRBCorner(x, y) {
		let ret = this.deltaR(x, y);
		let ret2 = this.deltaB(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	deltaRTCorner(x, y) {
		let ret = this.deltaR(x, y);
		let ret2 = this.deltaT(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	deltaLTCorner(x, y) {
		let ret = this.deltaL(x, y);
		let ret2 = this.deltaT(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	setPosition(x, y) {
		x = Math.max(0, x);
		y = Math.max(WORKAREA_TOP_PADDING, y);
		x = Math.min(x, window.innerWidth - this.state.w);
		y = Math.min(y, window.innerHeight - this.state.h);
		this.state.x = x;
		this.state.y = y;
		if (this.$) {
			this.$.style.left = x + 'px';
			this.$.style.top = y + 'px';
		}
	}
	
	setSize(w, h) {
		w = Math.max(w, 100);
		h = Math.max(h, 120);
		w = Math.min(w, window.innerWidth);
		h = Math.min(h, window.innerHeight - WORKAREA_TOP_PADDING);
		if((this.state.w !== w) || (this.state.h !== h)) {
			if(this.props.onResize) {
				this.props.onResize();
			}
		}
		this.state.w = w;
		this.state.h = h;
		if (this.$) {
			this.$.style.width = w + 'px';
			this.$.style.height = h + 'px';
			let s = this.$.querySelector('.window-content').style;
				
			if(this.state.w < this.props.minW || this.state.h < this.props.minH) {
				let scale = Math.min(this.state.w / this.props.minW, this.state.h / this.props.minH);
				this.state.renderedScale = scale;
				s.transform = 'scale(' + scale + ')';
				s.transformOrigin = 'left top';
				s.width = ((Math.max(this.state.w / scale, this.props.minW)) - 4 / scale) + 'px';
				s.height = (Math.max(this.state.h / scale, this.props.minH) - 20 / scale) + 'px';
			} else {
				this.state.renderedScale = 1;
				s.transform = null;
				s.transformOrigin = null;
				s.width = null;
				s.height = null;
			}
		}
	}
	
	onMouseDown() {
		Window.bringWindowForward(this.$);
	}
	
	render() {

		let contentProps = {
			className: 'window-content'
		};
		if(this.state.w < this.props.minW || this.state.h < this.props.minH) {
			let scale = Math.min(this.state.w / this.props.minW, this.state.h / this.props.minH);
			this.state.renderedScale = scale;
			contentProps.style = {
				transform: 'scale(' + scale + ')',
				transformOrigin: 'left top',
				width: ((Math.max(this.state.w / scale, this.props.minW)) - 4 / scale) + 'px',
				height: (Math.max(this.state.h / scale, this.props.minH) - 20 / scale) + 'px'
			};
		} else {
			this.state.renderedScale = 1;
		}

		return R.div({
			id: this.id, onMouseDown: this.onMouseDown, className: 'window-body', style: {
				left: this.state.x,
				top: this.state.y,
				width: this.state.w,
				height: this.state.h
			},
			'data-help': 'editor.' + this.props.helpId
		},
		R.div({
			className: 'window-header',
			onDragStart: this.dragStartHandler,
			onDrag: this.dragHandler,
			onDragEnd: this.dragEndHandler,
			draggable: true
		}, this.props.title,
		React.createElement(CornerDragger, {
			className: 'window-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaPosition
		})
		),
		R.div(contentProps, this.props.content),
		React.createElement(CornerDragger, {
			className: 'window-r-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaR
		}),
		React.createElement(CornerDragger, {
			className: 'window-l-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaL
		}),
		React.createElement(CornerDragger, {
			className: 'window-b-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaB
		}),
		React.createElement(CornerDragger, {
			className: 'window-t-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaT
		}),
		React.createElement(CornerDragger, {
			className: 'window-rb-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaRBCorner
		}),
		React.createElement(CornerDragger, {
			className: 'window-lb-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaLBCorner
		}),
		React.createElement(CornerDragger, {
			className: 'window-rt-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaRTCorner
		}),
		React.createElement(CornerDragger, {
			className: 'window-lt-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaLTCorner
		})
		);
	}
}

Window.all = {};

Window.bringWindowForward = (windowBody, setCurrentHelp) => {
	setTimeout(() => {
		if(typeof windowBody === 'string') {
			windowBody = document.querySelector(windowBody);
		}
		if(setCurrentHelp && windowBody) {
			Help.setCurrenHelp(windowBody.dataset.help);
		}
		Array.from(document.getElementsByClassName('window-body')).sort((a, b) => {
			return a.style.zIndex - b.style.zIndex;
		}).some((w, i, a) => {
			w.style.zIndex = (w === windowBody) ? a.length + 2 : i;
		});
	}, 1);
};

export default Window;