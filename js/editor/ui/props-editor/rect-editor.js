import NumberEditor from "./number-editor.js";
import BooleanEditor from "./boolean-editor.js";
import Lib from "thing-editor/js/engine/lib.js";

const rectEditorProps = {className:'rect-editor'};
const propGroupProps = {className:'rect-editor-group'};

const propLabelProps = {className:'rect-prop-label'};
const xLabel = R.div(propLabelProps, 'x:');
const yLabel = R.div(propLabelProps, 'y:');
const wLabel = R.div(propLabelProps, 'w:');
const hLabel = R.div(propLabelProps, 'h:');

export default class RectangleEditor extends React.Component {

	constructor(props) {
		super(props);
		this.onXChange = this.onXChange.bind(this);
		this.onYChange = this.onYChange.bind(this);
		this.onWChange = this.onWChange.bind(this);
		this.onHChange = this.onHChange.bind(this);
		this.onNullCheckboxChange = this.onNullCheckboxChange.bind(this);
	}

	componentWillMount() {
		this.checkNullability();
	}

	UNSAFE_componentWillReceiveProps() {
		if(!this.timeout) {
			this.timeout = setTimeout(() => {
				this.checkNullability();
				clearTimeout(this.timeout);
				this.timeout = null;
			}, 6);
		}
	}

	componentWillUnmount() {
		if(this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}

	checkNullability() {
		if(!editor.selection[0][this.props.field.name] && !this.props.field.nullable) {
			this.onNullCheckboxChange();
		}
	}

	onXChange(ev, isDelta, delta) {
		this.changeRectProperty(ev, isDelta, delta, 'x');
	}

	onYChange(ev, isDelta, delta) {
		this.changeRectProperty(ev, isDelta, delta, 'y');
	}

	onWChange(ev, isDelta, delta) {
		this.changeRectProperty(ev, isDelta, delta, 'w');
	}

	onHChange(ev, isDelta, delta) {
		this.changeRectProperty(ev, isDelta, delta, 'h');
	}

	changeRectProperty(ev, isDelta, delta, name) {
		let val = ev.target.value;
		let fieldName = this.props.field.name;
		let updated = false;

		for(let o of editor.selection) {
			if(isDelta && delta !== 0) {
				o[fieldName][name] += delta;
				Lib.__invalidateSerializationCache(o);
				updated = true;
			} else if(o[fieldName][name] !== val) {
				o[fieldName][name] = val;
				Lib.__invalidateSerializationCache(o);
				updated = true;
			}
			if(this.props.field.hasOwnProperty('parser')){
				o[fieldName] = this.props.field.parser(o[fieldName], o);
			}
		}
		if(updated) {
			this.forceUpdate();
			editor.sceneModified();
		}
	}

	onNullCheckboxChange() {
		let fieldName = this.props.field.name;

		for(let o of editor.selection) {
			let extData = __getNodeExtendData(o);
			if(o[fieldName]) {
				extData['removedRect' + fieldName] = o[fieldName];
				o[fieldName].removed = true;
				editor.overlay.drawRect(this.props, o);
				o[fieldName] = null;
			} else {
				o[fieldName] = extData['removedRect' + fieldName] || {x:0,y:0,w:100,h:50};
				delete o[fieldName].removed;
			}
		}
		this.forceUpdate();
		editor.sceneModified();
	}

	render() {
		let f = this.props.field;

		editor.selection.some((o) => {
			let r = o[f.name];
			editor.overlay.drawRect(this.props, o, this.props.disabled ? undefined : r);
		});
		
		let r = editor.selection[0][f.name];
		let body;
		if(r) {
			body = R.div(null,
				R.div(propGroupProps,
					xLabel,
					React.createElement(NumberEditor,{field:{min: f.minX, max: f.maxX}, disabled:this.props.disabled, onChange: this.onXChange, value:r.x})
				),
				R.div(propGroupProps,
					yLabel,
					React.createElement(NumberEditor,{field:{min: f.minY, max: f.maxY}, disabled:this.props.disabled, onChange: this.onYChange, value:r.y}),
				),
				R.div(propGroupProps,
					wLabel,
					React.createElement(NumberEditor,{field:{min: f.minW, max: f.maxW}, disabled:this.props.disabled, onChange: this.onWChange, value:r.w}),
				),
				R.div(propGroupProps,
					hLabel,
					React.createElement(NumberEditor,{field:{min: f.minH, max: f.maxH}, disabled:this.props.disabled, onChange: this.onHChange, value:r.h})
				)
			);
		}

		return R.div(rectEditorProps,
			f.nullable ? React.createElement(BooleanEditor, {disabled:this.props.disabled, onChange: this.onNullCheckboxChange, value:r !== null}) : undefined,
			body
		);
	}
}