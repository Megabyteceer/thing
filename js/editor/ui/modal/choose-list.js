import Group from "../group.js";
let listProps = {className:'list-view'};
let bodyProps = {className:'resizable-dialog left-align-text'};

export default class ChooseList extends React.Component {
	
	
	constructor(props) {
		super(props);
		this.state = {search: ''};
		this.searchInputProps = {
			autoFocus:true,
			onChange: this.onSearchChange.bind(this),
			onKeyDown:this.onKeyDown.bind(this),
			placeholder: 'Search'
		};
		this.onSearchCliearClick = this.onSearchCliearClick.bind(this);
		this.renderChoosingItem = this.renderChoosingItem.bind(this);
		this.searchFilter = this.searchFilter.bind(this);
	}
	
	onSearchChange(ev) {
		let val = ev.target.value;
		this.setState({search: val});
	}
	
	onSearchCliearClick() {
		this.setState({search: ''});
	}
	
	onKeyDown(ev) {
		if((ev.keyCode === 13) && (this.list.leading === 1)) {
			editor.ui.modal.hideModal(this.list[0]);
		}
	}
	
	renderChoosingItem(i, key) {
		assert((typeof i.name === 'string') || i.pureName, "pureName property expected for non plain text named items.");
		
		let icon;
		if(i.__EDITOR_icon) {
			icon = R.classIcon(i);
		}
		let name = i.name;
		
		if(typeof name === 'string') {
			key = name;
		}
		
		return R.div({
			onClick: ()=>{
				editor.ui.modal.hideModal(i);
			},
			className: 'clickable choosing-item',
			key: key
		}, icon, name);
	}
	
	get list() {
		if(this.state.search) {
			return this.props.list.filter(this.searchFilter);
		}
		
		return this.props.list;
	}
	
	searchFilter(i) {
		let f = this.state.search.toLocaleLowerCase();
		return i.noFilter || (i.pureName || i.name).toLocaleLowerCase().indexOf(f) >= 0;
	}
	
	render() {
		return R.div(bodyProps,
			this.props.noSearchField ? undefined : R.input(this.searchInputProps),
			R.btn(R.icon('clear'), this.onSearchCliearClick),
			R.div(listProps,
				Group.groupArray(this.list.map(this.renderChoosingItem))
			)
		);
	}
}