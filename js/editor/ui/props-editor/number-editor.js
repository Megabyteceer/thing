import PropsFieldWrapper from './props-field-wrapper.js';

const numberEditorProps = {className:'number-input'};

let draggingElement;
let preventClickBecauseOfDragging;

function onMouseUp() {
	if(draggingElement) {
		document.exitPointerLock();
		draggingElement = undefined;
	}
}

document.addEventListener('mouseup', onMouseUp);

document.addEventListener('mousemove', (ev) => {
	if (!draggingElement) return;
	
	let d = -ev.movementY;
	if (d !== 0) {
		preventClickBecauseOfDragging = true;
		d = d * (draggingElement.step);
		draggingElement.deltaValue(d, ev.ctrlKey);
	}
});

class NumberEditor extends React.Component {
	constructor (props){
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onUpClick = this.onUpClick.bind(this);
		this.onDownClick = this.onDownClick.bind(this);
		this.onBlur = this.onBlur.bind(this);
		this.btnUp = R.span({className:'number-input-btn number-input-btn-up', onMouseUp:this.onUpClick, onMouseDown:this.onMouseDown}, '▲');
		this.btnDown = R.span({className:'number-input-btn number-input-btn-down', onMouseUp:this.onDownClick, onMouseDown:this.onMouseDown}, '▼');
	}

	componentWillUnmount() {
		onMouseUp();
	}

	onBlur() {
		if(this.state) {
			delete this.state.tmpVal;
			this.forceUpdate();
		}
	}

	get step() {
		if(this.props.field) {
			return this.props.field.step || 1;
		}
		return this.props.step || 1;
	}

	get max() {
		if(this.props.field && !isNaN(this.props.field.max)) {
			return this.props.field.max;
		}
		return !isNaN(this.props.max) ? this.props.max : Number.POSITIVE_INFINITY;
	}

	get min() {
		if(this.props.field && !isNaN(this.props.field.min)) {
			return this.props.field.min;
		}
		return !isNaN(this.props.min) ? this.props.min : Number.NEGATIVE_INFINITY;
	}

	onUpClick(ev) {
		if(!preventClickBecauseOfDragging) {
			this.deltaValue(this.step, ev.ctrlKey);
		}
	}
		
	onDownClick(ev) {
		if(!preventClickBecauseOfDragging) {
			this.deltaValue(-this.step, ev.ctrlKey);
		}
	}
		
	onChange (ev, forceFormat = false) {
		forceFormat = (forceFormat===true);
		let props = this.props;
		if(forceFormat) {
			this.setState({tmpVal: undefined});
		} else {
			this.setState({tmpVal: ev.target.value});
		}
		let val = (props.field && props.field.basis) ? parseInt(ev.target.value, props.field.basis) : parseFloat(ev.target.value);
		if(isNaN(val) && !forceFormat) {
			return;
		}
		if(!val) {
			val = 0;
		}
		props.onChange(PropsFieldWrapper.surrogateChangeEvent(this.cropVal(val)));
	}

	onDoubleClick(ev) {
		ev.target.select();
	}

	onMouseDown(ev) {
		ev.target.requestPointerLock();
		draggingElement = this;
		preventClickBecauseOfDragging = false;
	}

	onKeyDown(ev) {
		switch(ev.keyCode) {
		case 38:
			this.deltaValue(this.step, ev.ctrlKey);
			sp(ev);
			break;
		case 40:
			this.deltaValue(-this.step, ev.ctrlKey);
			sp(ev);
			break;
		}
	}

	deltaValue(d, x10) {
		if(x10) {
			d *= 10;
		}
		let step = this.step;
		let val = this.state.value;
		let croppedVal = this.cropVal(val + d);
		croppedVal = Math.round(croppedVal / step) * step;
		d = croppedVal - val;
		
		let e = PropsFieldWrapper.surrogateChangeEvent(croppedVal);
		this.setState({tmpVal:undefined, value: croppedVal});
		this.props.onChange(e, true, d);
	}

	cropVal(val) {
		val = Math.max(val, this.min);
		val = Math.min(val, this.max);
		return val;
	}

	static getDerivedStateFromProps(props, state) {
		if(!state) {
			state = {};
		}
		state.value = props.value;
		if(state.o !== editor.selection[0]) {
			delete state.tmpVal;
		}
		state.o = editor.selection[0];
		return state;
	}

	render() {
		let props = this.props;
		let val = (typeof this.state.tmpVal !== 'undefined') ? this.state.tmpVal : this.state.value;
		return R.span(numberEditorProps,
			R.input({
				onBlur: this.onBlur,
				onChange: this.onChange,
				disabled:props.disabled,
				value: (props.field && props.field.basis) ? val.toString(props.field.basis) : val,
				onDoubleClick: this.onDoubleClick,
				onKeyDown:this.onKeyDown
			}),
			props.disabled ? undefined : this.btnUp,
			props.disabled ? undefined : this.btnDown
		);
	}
}

export default NumberEditor;