// this class automatically generated with Thing-Editor's component's Wizard,
// and contain basic game-object's methods.
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