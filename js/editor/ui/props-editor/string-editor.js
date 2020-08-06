const StringEditor = (props) => {
	return R.input({onChange: props.onChange, onBlur: props.onBlur, disabled:props.disabled, title:props.value, value: props.value || ''});
};

export default StringEditor;