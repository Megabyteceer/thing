import Window from "./window.js";
import game from "thing-editor/js/engine/game.js";
import Group from "./group.js";
import DisplayObject from "thing-editor/js/engine/components/display-object.js";
import Help from "../utils/help.js";

const errorIcon = R.icon('error-icon');
const warnIcon = R.icon('warn-icon');


const needAddInToList = (map, owner, fieldName) => {
	if(!(owner instanceof DisplayObject)) {
		return true;
	} else {
		let exData = __getNodeExtendData(owner);

		exData.statusWarnOwnerId = owner.___id;

		if(!fieldName) {
			fieldName = '_no_field_name_';
		}
		if(!map.has(exData)) {
			let o = {};
			o[fieldName] = true;
			map.set(exData, o);
			return true;
		} else {
			let o = map.get(exData);
			let ret = !o[fieldName];
			o[fieldName] = true;
			return ret;
		}
	}
};

export default class Status extends React.Component {
	
	constructor(props) {
		super(props);
		this.errorsMap = new WeakMap();
		this.warnsMap = new WeakMap();
		
		this.state = {};
		this.errors = [];
		this.warns = [];
		
		
		this.warnsListRef = this.warnsListRef.bind(this);
		this.errorsListRef = this.errorsListRef.bind(this);
		this.clear = this.clear.bind(this);
	}
	
	errorsListRef(ref) {
		this.errorsList = ref;
	}
	
	warnsListRef(ref) {
		this.warnsList = ref;
	}
	
	error (message, errorCode, owner, fieldName) {
		assert((!errorCode) || (typeof errorCode === 'number'), 'Error code expected.');
		console.error(errorCode + ': ' + message);
		let item = {owner, ownerId: owner && owner.___id, message, fieldName, errorCode};
		if(owner && fieldName) {
			item.val = owner[fieldName];
		}
		if(needAddInToList(this.errorsMap, owner, fieldName)) {
			this.errors.push(item);
			if(this.errorsList) {
				this.errorsList.forceUpdate();
			} else {
				this.show();
			}
			editor.pauseGame();
		}
	}
	
	warn (message, errorCode, owner, fieldName, doNoFilterRepeats = false) {
		assert((!errorCode) || (typeof errorCode === 'number'), 'Error code expected.');
		console.warn(message);
		if(doNoFilterRepeats || needAddInToList(this.warnsMap, owner, fieldName)) {
			let item = {owner, ownerId: owner && owner.___id, message, fieldName, errorCode};
			if(owner && fieldName) {
				item.val = owner[fieldName];
			}
			this.warns.push(item);
			if(this.errorsList) {
				this.warnsList.forceUpdate();
			} else {
				this.show();
			}
		}
	}

	clear () {
		this.errors.length = 0;
		this.warns.length = 0;
		
		this.errorsMap = new WeakMap();
		this.warnsMap = new WeakMap();
		
		this.hide();
	}
	
	show() {
		this.setState({toggled:true});
	}
	
	hide() {
		this.setState({toggled:false});
	}
	
	render() {
		if(this.state.toggled && ((this.errors.length > 0) || (this.warns.length > 0))) {
			Window.bringWindowForward('#window-info');
			return editor.ui.renderWindow('info', 'Notifications', 'Notifications', R.fragment(
				R.btn('×', this.clear, 'Hide all', 'close-window-btn'),
				R.div({className:"status-body"},
					React.createElement(InfoList, {ref: this.errorsListRef, id:'errors-list', title:'Errors:', icon: errorIcon, className:'info-errors-list info-list', list:this.errors, itemsMap:this.errorsMap}),
					React.createElement(InfoList, {ref: this.warnsListRef, id:'warns-list', title:'Warnings:', icon: warnIcon, className:'info-warns-list info-list', list:this.warns, itemsMap: this.warnsMap})
				)
			), 586, 650, 400, 150, 1137, 407);
		}
		return R.span();
	}
}

const selectableSceneNodeProps = {className:"selectable-scene-node"};

class InfoList extends React.Component {
	
	constructor(props) {
		super(props);
		this.renderItem = this.renderItem.bind(this);
	}

	clearItem(item) {
		let i = this.props.list.indexOf(item);
		assert(i >= 0, "info list is corrupted");
		this.props.list.splice(i, 1);
		if(item.owner instanceof DisplayObject) {
			let exData = __getNodeExtendData(item.owner);
			this.props.itemsMap.delete(exData);
		}
		editor.ui.status.forceUpdate();
	}
	
	renderItem(item, i) {
		
		let node;
		if(item.owner && item.owner instanceof DisplayObject) {
			node = R.div(selectableSceneNodeProps, R.sceneNode(item.owner));
		}
		return R.div({key:i, className:'info-item clickable', title: "Click line to go problem.", onClick:() => {
			if(!item) {
				return;
			}
			if(typeof item.owner === "function") {
				item.owner();
			} else if(item.owner && (item.owner instanceof DisplayObject)) {
				let extendData = __getNodeExtendData(item.owner);
				if((item.owner.___id !== item.ownerId) || (extendData.statusWarnOwnerId !== item.ownerId)) {
					let newOwnerFinded;

					game.forAllChildrenEverywhere((o) => {
						if(o.constructor === item.owner.constructor && o.___id === item.ownerId) {
							if(!newOwnerFinded) {
								item.owner = o;
								newOwnerFinded = true;
							}
						}
					});

					if(!newOwnerFinded) {
						editor.ui.modal.showInfo('Object already removed form stage, or problem was solved.', undefined, 32042);
						return;
					}
				}

				editor.ui.sceneTree.selectInTree(item.owner);
				if(item.fieldName) {
					setTimeout(() => {
						editor.ui.propsEditor.selectField(item.fieldName, true);
					}, 1);
				}
			}
		}}, this.props.icon, item.message, node,
		R.btn('?', () => {
			Help.openErrorCodeHelp(item.errorCode);
		}, 'Open docs for this notification (F1)', 'error-status-help-button', 112),
		R.btn('×', () => {
			this.clearItem(item);
			item = null;
		}, "Hide notification", 'clear-item-btn danger-btn')
		);
	}

	render() {
		if(this.props.list.length <= 0) {
			return R.div();
		}
		return R.div(null,
			R.div({className:'info-badge'}, this.props.list.length),
			Group.renderGroup({key: this.props.id, content: this.props.list.map(this.renderItem), title: this.props.title})
		);
	}
}