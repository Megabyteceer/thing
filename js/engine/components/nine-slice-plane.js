import Lib from "../lib.js";

export default class NineSlicePlane extends PIXI.NineSlicePlane {
	
	constructor() {
		super(Lib.getTexture('WHITE'), 3,3,3,3);
	}
	
	/// #if EDITOR
	__beforeDeserialization() {
		this.image = 'WHITE';
	}
	/// #endif
}

/// #if EDITOR
NineSlicePlane.__EDITOR_group = 'Basic';
__EDITOR_editableProps(NineSlicePlane, [
	{
		type: 'splitter',
		title: 'Nine-slice:',
		name: 'nine-slice'
	},
	{
		name: 'width',
		type: Number,
		noNullCheck: true,
		default:200
	},
	{
		name: 'height',
		type: Number,
		noNullCheck: true,
		default:200
	},
	{
		name: 'leftWidth',
		type: Number,
		noNullCheck: true,
		default:5
	},
	{
		name: 'rightWidth',
		type: Number,
		noNullCheck: true,
		default:5
	},
	{
		name: 'topHeight',
		type: Number,
		noNullCheck: true,
		default:5
	},
	{
		name: 'bottomHeight',
		type: Number,
		noNullCheck: true,
		default:5
	}
]);

NineSlicePlane.__EDITOR_icon = 'tree/slice9';

/// #endif