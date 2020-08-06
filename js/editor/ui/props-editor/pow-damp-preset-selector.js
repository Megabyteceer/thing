import SelectEditor from "./select-editor.js";

export default class PowDampPresetSelector extends React.Component {

	constructor() {
		super();
		this.onSelect = this.onSelect.bind(this);
	}

	onSelect(ev) {
		let selected = ev.target.value;
		if(selected.p) {
			this.props.onPresetSelected(selected.p, selected.d);
		}
	}

	getPow() {
		return this.props.pow;
	}

	getDamp() {
		return  this.props.damp;
	}

	render() {
		let pow = this.getPow();
		let damp = this.getDamp();
		let presetSelectedValue = presets.find((p) => {
			return pow === p.value.p && damp === p.value.d;
		}) || presets[0];
		
		return React.createElement(SelectEditor, {value:presetSelectedValue.value, onChange: this.onSelect, select:presets});
	}
}

const presets = [
	{name : 'None', value:{}},
	{name: 'Alive     1s', value:{
		d:0.85,
		p:0.02
	}},
	{name: 'Alive   0.5s', value:{
		d:0.7,
		p:0.06
	}},
	{name: 'Alive  0.25s', value:{
		d:0.55,
		p:0.16
	}},


	{name: 'Smooth    1s', value:{
		p:0.012,
		d:0.8
	}},
	{name: 'Smooth  0.5s', value:{
		p:0.032,
		d:0.7
	}},
	{name: 'Smooth 0.25s', value:{
		p:0.1,
		d:0.52
	}},
	{name: 'Bouncy    3s', value:{
		d:0.95,
		p:0.03
	}},
	{name: 'Bouncy    1s', value:{
		d:0.85,
		p:0.05
	}},
	{name: 'Bouncy   0.5s', value:{
		d:0.73,
		p:0.3
	}},

	{name: 'Balloon', value:{
		d:0.9,
		p:0.001
	}},
	{name: 'Inert', value:{
		d:0.98,
		p:0.002
	}},
	{name: 'Discrete', value:{
		d:0,
		p:1
	}}
];

export class PowDampPresetEditor extends PowDampPresetSelector {

	getPow() {
		return editor.selection[0].pow;
	}
	
	getDamp() {
		return editor.selection[0].damp;
	}

	onSelect(ev) {
		let selected = ev.target.value;
		if(selected.p) {
			editor.onSelectedPropsChange('pow', selected.p);
			editor.onSelectedPropsChange('damp', selected.d);
		}
	}
}