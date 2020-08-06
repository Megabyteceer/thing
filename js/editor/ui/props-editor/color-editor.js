const ColorEditor = (props) => {
	let val = props.value || 0;
	
	return R.input({
		onChange:(ev) => {
			props.onChange(ev);
			editor.scheduleHistorySave();
		},
		disabled:props.disabled,
		className: 'clickable',
		type: 'color',
		value: '#' + val.toString(16).padStart(6, '0')
	});
};

export default ColorEditor;