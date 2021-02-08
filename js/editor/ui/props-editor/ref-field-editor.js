import DisplayObject from "thing-editor/js/engine/components/display-object.js";

export default class RefFieldEditor extends React.Component {

	render() {

		let val = this.props.value;

		if(val instanceof DisplayObject) {
			return R.span({onMouseEnter: () => {
				if(this.props.value) {
					editor.overlay.highlightObject(this.props.value);
				}
			}},R.btn(R.sceneNode(val),
				() => {
					if(this.props.value) {
						editor.selection.select(this.props.value);
					}
				}
			));
		} else {

			let title;
			if(val) {
				if(typeof val === 'object') {
					title = '[object]';
				} else if(typeof val === 'function') {
					title = 'function: ' + val.name;
				} else {
					title = '' + val;
				}
			} else {
				title = '' + val;
			}
			if (!this.props.value) {
				return '' + this.props.value;
			}
			return R.btn(title, () => {
				if(this.props.value) {
					if(React.isValidElement(this.props.value)) {
						editor.ui.modal.showModal(this.props.value);
					} else if(this.props.field.onClick) {
						this.props.field.onClick(this.props.value);
					} else {
						try {
							editor.ui.modal.showModal(JSON.stringify(this.props.value, undefined, '\n').split('\n').map((l, key) => {
								return R.span({key},l, R.br());
							}));
						} catch (er) {
							editor.ui.modal.showInfo("Object has circular structures and can not be represented as text. Please check browser's console to see reference's value.", undefined, 32039);
						}
					}
					console.dir(this.props.value);
				}
			});
		}
	}
}