// this class automatically generated with Thing-Editor's component's Wizard,
// and contain all possible methods. Remove any of methods you do not need.
// For details: https://github.com/Megabyteceer/thing-editor/wiki/Custom-Components#custom-component-methods

import BASE_CLASS_NAME from "BASE_CLASS_PATH";

export default class NEW_CLASS_NAME extends BASE_CLASS_NAME {
	
	init() {
		//super.init();
		// Add initialization code here

	}
	
	update() {
		// Add your update code here

		//super.update();
	}

	onRemove() {
		// Add onRemove code here

		//super.onRemove();
	}

	onLanguageChanged() {
		//super.onLanguageChanged();

	}

	_onRenderResize() {
		//super._onRenderResize();

	}

	_onDisableByTrigger() {
		//super._onDisableByTrigger();

	}


	/// #if EDITOR
	__EDITOR_onCreate() {
		//super.__EDITOR_onCreate();
		
	}

	__onSelect() {
		//super.__onSelect();
		
	}

	__onUnselect() {
		//super.__onUnselect();

	}

	__beforeDestroy() {
		//super.__beforeDestroy();

	}

	__beforeSerialization() {
		//super.__beforeSerialization();
		
	}

	__afterSerialization() {
		//super.__afterSerialization();
		
	}

	__beforeDeserialization() {
		//super.__beforeDeserialization();
		
	}

	__afterDeserialization() {
		//super.__afterDeserialization();
		
	}

	__onChildSelected() {
		//super.__onChildSelected();
		
	}
	/// #endif
}

/// #if EDITOR

//NEW_CLASS_NAME.__EDITOR_group = "Custom/MyComponentsSubGroup"; //group in Classes List Window for more comfort

__EDITOR_editableProps(NEW_CLASS_NAME, [ //list of editable properties
	{
		type: 'splitter',
		title: 'NEW_CLASS_NAME',
		name: 'NEW_CLASS_NAME-props'
	}/*,
	{
		name:'myProperty',
		type:Number,
		default: 1,
		step: 0.01
	}*/
]);
/// #endif