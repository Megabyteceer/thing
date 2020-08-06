import Container from "./container.js";

export default class StaticTrigger extends Container {
	/// #if EDITOR
	__afterDeserialization() {
		this.__validateStaticTrigger();
	}
	__beforeSerialization() {
		this.__validateStaticTrigger();
	}

	__validateStaticTrigger() {
		if(this.parent && (this.parent === game.stage || this.parent.parent === game.stage)) {
			editor.ui.status.error("StaticTrigger can not be root element or child of root element, because it does remove parent.", 32049, this);
		}
		if(!this.dataPath && this.dataPath.startsWith('this.') && this.dataPath.startsWith('all.')) {
			editor.ui.status.error("StaticTrigger`s dataPath can refer to global variables only. Like isMobile.any", 32050, this, 'dataPath');
		}
	}
	/// #endif
}

/// #if EDITOR

import game from "../game.js";

StaticTrigger.__EDITOR_group = 'Basic';
__EDITOR_editableProps(StaticTrigger, [
	{
		type: 'splitter',
		title: 'StaticTrigger:',
		name: 'StaticTrigger'
	},
	{
		name: 'dataPath',
		type: 'data-path',
		default: 'isMobile.any',
		important: true
	},
	{
		name: 'invert',
		type: Boolean
	}
]);

StaticTrigger.__canNotHaveChildren = true;
StaticTrigger.__EDITOR_icon = 'tree/static-trigger';
StaticTrigger.__EDITOR_tip = `<b>StaticTrigger</b> - is component which permanently removes parent if condition pointed in <b>dataPath</b> is not <b>true</b>.`;

/// #endif