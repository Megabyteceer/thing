import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';
import BooleanEditor from './boolean-editor.js';
import SelectEditor from './select-editor.js';
import ColorEditor from './color-editor.js';
import TimelineEditor from "./timeline/timeline-property.js";
import DataPathEditor from "./data-path-editor.js";
import CallbackEditor from "./callback-editor.js";
import BtnProperty from "./btn-property.js";
import TilemapEditor from "./tilemap-editor.js";
import RectangleEditor from './rect-editor.js';
import RefFieldEditor from './ref-field-editor.js';
import {PowDampPresetEditor} from './pow-damp-preset-selector.js';


let typeDescriptions = new Map();

typeDescriptions.set(Number, {
	renderer: NumberEditor,
	parser: (target) => {
		return parseFloat(target.value);
	},
	default: 0
});
typeDescriptions.set(String, {
	renderer: StringEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});
typeDescriptions.set(Boolean, {
	renderer: BooleanEditor,
	parser: (target) => {
		return target.checked;
	},
	default: false
});
typeDescriptions.set('rect', {
	renderer: RectangleEditor,
	parser: (target) => {
		return target.value;
	},
	default: null
});

typeDescriptions.set('data-path', {
	renderer: DataPathEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});

typeDescriptions.set('callback', {
	renderer: CallbackEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});

typeDescriptions.set('ref', {
	renderer: RefFieldEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});

typeDescriptions.set('btn', {
	renderer: BtnProperty,
	default: null
});

typeDescriptions.set('color', {
	renderer: ColorEditor, parser:
		(target) => {
			return parseInt(target.value.replace('#', ''), 16);
		},
	default: 0xFFFFFF
});

typeDescriptions.set('timeline', {
	renderer: TimelineEditor,
	default:null
});

typeDescriptions.set('tilemap', {
	renderer: TilemapEditor,
	default:null
});

typeDescriptions.set('pow-damp-preset', {
	renderer: PowDampPresetEditor,
	default:null
});


let getTypeDescription = (field) => {
	let t = field.type || Number;
	assert(typeDescriptions.has(t), "Unknown editable property type: " + t + " for property " + field.name + " in class " + field.owner, 40000);
	return typeDescriptions.get(t);
};

let labelProps = {className: 'props-label selectable-text', title: 'Ctrl+click to copy field`s name', onMouseDown: window.copyTextByClick};
let labelInvalidProps = {className: 'props-label selectable-text', onMouseDown: window.copyTextByClick, title: 'Ctrl+click to copy'};
let labelEditorOnlyProps = {className: 'props-label props-label-editor-only selectable-text', title: 'Ctrl+click to copy field`s name', onMouseDown: window.copyTextByClick};
let wrapperProps = {className: 'props-wrapper'};

class PropsFieldWrapper extends React.Component {
	
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
		this._onBlur = this._onBlur.bind(this);
	}

	_onBlur() {
		if(this.props.field.onBlur) {
			this.props.field.onBlur();
		}
	}
	
	onChange(ev, delta, deltaVal) {
		assert((!delta) || (typeof delta === 'boolean'), "Delta expected to be bool");
		let field = this.props.field;
		let val = getTypeDescription(field).parser(ev.target);
		if(field.hasOwnProperty('parser')){
			val = field.parser(val);
		}
		
		if (field.hasOwnProperty('min')) {
			val = Math.max(field.min, val);
		}
		if (field.hasOwnProperty('max')) {
			val = Math.min(field.max, val);
		}
		if(delta) {
			this.props.onChange(field, deltaVal, true);
		} else {
			this.props.onChange(field, val);
		}
		
		this.setState({value: val});
	}

	onAutoSelect(selectPath) {
		if(this.refs.fieldRef && this.refs.fieldRef.onAutoSelect) {
			this.refs.fieldRef.onAutoSelect(selectPath);
		}
	}
	
	render() {
		let field = this.props.field;
		let node = editor.selection[0];
		editor.ui.propsEditor.__isPropsRenderingAccessTime = true;
		let value = node[field.name];
		editor.ui.propsEditor.__isPropsRenderingAccessTime = false;
		
		let renderer;
		if (field.hasOwnProperty('select')) {
			renderer = SelectEditor;
		} else {
			renderer = getTypeDescription(field).renderer;
		}
		
		let disabled = field.disabled && field.disabled(node);
		
		let className = field.important ? 'props-field props-field-important' : 'props-field';
		let isInvalid;
		if(field.hasOwnProperty('validate')) {
			let validationError = field.validate(value);
			if(validationError) {
				isInvalid = true;
				className += ' props-field-invalid';
				setTimeout(() => {
					editor.ui.status.error(validationError, 32001, node, field.name);
				}, 1);
			}
		}

		let tip;
		if(field.hasOwnProperty('tip')) {
			tip = R.tip(field.name,
				'Field "' + field.name + '" description:',
				field.tip
			);
		}
		
		return R.div({className, id:'property-editor-' + field.name.replace('.', '_'),
			title: field.name,
			'data-help': field.helpUrl
		},
		tip,
		R.div(field.name.startsWith('__') ? labelEditorOnlyProps : (isInvalid ? labelInvalidProps : labelProps), field.name),
		R.div(wrapperProps,
			React.createElement(renderer, {
				ref: (field.type === 'timeline') ? 'fieldRef' : undefined,
				value,
				onChange: this.onChange,
				onBlur: this._onBlur,
				field,
				disabled
			})
		));
	}
}

let _surrogateEventObj = {target: {value: 0}};
PropsFieldWrapper.surrogateChangeEvent = (val) => {
	_surrogateEventObj.target.value = val;
	return _surrogateEventObj;
};

PropsFieldWrapper.getTypeDescription = getTypeDescription;

export default PropsFieldWrapper;