import PropsFieldWrapper from './props-field-wrapper.js';

const CLASS_NAME = 'select-editor-current clickable';
const CLASS_NAME_DISABLED = 'select-editor-current disabled';

let openedList;

class SelectEditor extends React.Component {

	constructor(props) {
		super(props);
		if (this.props.field) {
			this.filterName = (this.props.field.filterName || this.props.field.name) + '-filter';
		}
		this.state = {};

		this.checkForNeedClearFilter = true;

		this.onToggle = this.onToggle.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.hide = this.hide.bind(this);
		this.onFilterChange = this.onFilterChange.bind(this);
		this.renderItem = this.renderItem.bind(this);
		this.onBlur = this.onBlur.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
	}

	componentWillUnmount() {
		if(this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		this._hideList();
	}

	_hideList() {
		if(openedList === this) {
			ReactDOM.render(R.fragment(), document.getElementById('select-lists-root'));
			openedList = null;
		}
	}

	onMouseMove() {
		this.mouseLeaved = false;
	}

	onBlur() {
		this.isBlurred = true;
		if(this.hideTimeout) {
			clearTimeout(this.hideTimeout);
		}
		this.hideTimeout = setTimeout(() => {
			this.checkIfCanHide();
			this.hideTimeout = null;
		}, 5);
	}

	onFocus(event) {
		this.isBlurred = false;
		event.target.select();
	}

	onMouseLeave() {
		this.mouseLeaved = true;
		this.checkIfCanHide();
	}

	checkIfCanHide() {
		if (this.isBlurred && this.mouseLeaved) {
			this.hide();
		}
	}

	hide() {
		if (this.state.toggled) {
			this.setState({
				toggled: false
			});
			this._hideList();
		}
	}

	onToggle() {
		if (!this.state.toggled && !this.props.disabled) {
			this.setState({
				toggled: true,
				filter: editor.settings.getItem(this.filterName, '')
			});
		}
	}

	onSelect(item) {
		this.props.onChange(PropsFieldWrapper.surrogateChangeEvent(item.value));
		this.hide();
	}

	renderItem(i) {
		return R.div({
			key: i.name,
			className: i === this.selectedItem ? 'select-item selected-item' : 'select-item clickable',
			onMouseDown: (ev) => {
				sp(ev);
				this.onSelect(i);
			}
		}, i.visibleName || i.name);
	}

	onFilterChange(ev) {
		this.setFilter(ev.target.value);
	}

	setFilter(flt) {
		editor.settings.setItem(this.filterName, flt);
		this.setState({
			filter: flt
		});
	}

	render() {

		let list = this.props.select || this.props.field.select;
		if (typeof list === "function") {
			list = list();
			if(list.length === 0) {
				return R.span({className: 'danger'}, "empty values list");
			}
		}
		let filterInput;

		let item;
		if (this.props.value) {
			item = list.find((i) => {
				if (i.value === this.props.value) return i;
			});
			if(!item) {
				item = R.span({className:'danger'}, this.props.value);
				if(this.props.field && !this.props.field.isTranslatableKey) {
					setTimeout(() => {
						editor.ui.status.error('Invalid enum value: ' + this.props.value + ' ▾', 32002, editor.selection[0], this.props.field.name);
					}, 1);
				}
			}
		}

		if (this.state.toggled) {
			let a = list;
			if (this.props.field) {
				if (this.state.filter) {
					let flt = this.state.filter.toLocaleLowerCase();
					a = a.filter((i) => {
						return i === this.selectedItem || (i.name.toLowerCase().indexOf(flt) >= 0) || (i.name === "EMPTY") || !i.value;
					});
				}
				a = a.slice(0, 20);

			}

			filterInput = R.input({
				autoFocus: true,
				onBlur: this.onBlur,
				onFocus: this.onFocus,
				className: 'select-editor-filter',
				placeholder: 'Filter',
				onChange: this.onFilterChange,
				value: this.state.filter,
				style: this.props.field ? undefined : {width: 0, margin: 0, position:'fixed', padding: 0, height: 0}
			});

			if (this.checkForNeedClearFilter && a.length < 1) {
				this.checkForNeedClearFilter = false;
				setTimeout(() => {
					this.setFilter('');
				}, 1);
			}

			this.selectedItem = item;

			setTimeout(() => {
				setTimeout(() => {
					let b = ReactDOM.findDOMNode(this.refs.body);
					if(b) {
						b = b.getBoundingClientRect();
						let l = document.getElementById('select-list-content');
						if(b.top > window.innerHeight * 0.6) {
							b.y -= l.clientHeight;
						}
						if(l) {
							l.style.left = b.left + 'px';
							l.style.top = b.top + 'px';
						}
					}
				}, 0);
				openedList = this;

				ReactDOM.render( R.div({
					className: 'select-editor-list',
					id: 'select-list-content',
				}, filterInput, a.map(this.renderItem)), document.getElementById('select-lists-root'));
			}, 0);
		}

		if (!item) {
			item = list[0];
		}

		return R.div({
			className: 'select-editor',
			onClick: this.onToggle,
			onMouseMove: this.onMouseMove,
			onMouseLeave: this.onMouseLeave,
			ref: 'body'
		},
		R.div({
			className: this.props.disabled ? CLASS_NAME_DISABLED : CLASS_NAME
		}, R.span({
			ctrlclickcopyvalue: (typeof item.value === 'undefined') ? item : item.value,
			className: 'selectable-text',
			title: 'Ctrl+click to copy value.',
			onClick(ev) {
				if(ev.ctrlKey) {
					sp(ev);
				}
			},
			onMouseDown:window.copyTextByClick
		}, item.name ? item.name : item),' ▾')
		);
	}

}

export default SelectEditor;