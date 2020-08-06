const BtnProperty = (props) => {
	
	const field = props.field;
	
	return R.btn(field.name, () => {
		editor.selection.some(field.onClick);
	}, field.title, field.className, field.hotkey);
};

export default BtnProperty;