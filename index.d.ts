/// <reference path="../node_modules/pixi.js-legacy/pixi.js-legacy.d.ts" />

import 'current-project-typings.js';
import 'current-scene-typings.d.ts';
import Editor from 'thing-editor/js/editor/editor.js';
import game from 'thing-editor/js/engine/game.js';

import Container from '/thing-editor/js/engine/components/container.js';
import DisplayObject from '/thing-editor/js/engine/components/display-object.js';
import MovieClip from '/thing-editor/js/engine/components/movie-clip/movie-clip.js';

class TEditor extends Editor {
	game:typeof game;
	_root_initCalled:boolean;
	_root_onRemovedCalled:boolean;
}


declare global {

	interface GameDataModel {
	}

	/** @see https://github.com/Megabyteceer/thing-editor/wiki/ProjectSettings */
	interface ThingProjectSettings {
		defaultFont: string;
		screenOrientation: "auto"|"landscape"|"portrait";
		width: number;
		height: number;
		portraitWidth: number;
		portraitHeight: number;
		renderResolution: number;
		renderResolutionMobile: number;
		framesSkipLimit: number;
		dynamicStageSize: boolean;
		preventUpscale: boolean;
		muteOnFocusLost: boolean;
		mipmap: boolean;
		version: string;
		soundFormats: string[];
		soundDefaultBitrate: number;
		defaultMusVol: number;
		defaultSoundsVol: number;
		keepSoundWhilePageUpdate: boolean;
		autoFullscreenDesktop: boolean;
		autoFullscreenMobile: boolean;
	}
}

interface EditableFieldDescription{
	name: string,
	type: 'data-path' | 'splitter' | 'rect' | 'callback' | 'ref' | 'btn' | 'color' | BooleanConstructor | StringConstructor | NumberConstructor,
	/** 'splitter' visible title */
	title?: string,
	default?: any,
	min?: number,
	max?: number,
	/** disables editor-time null checking for number type editable fields */
	noNullCheck?: boolean,
	step?: number,
	/** basis for property display format. default value is 10 (decimal) */
	basis?: number,
	/** 'rect' field can be cleared */
	nullable?: boolean,
	/** 'rect' minimal width */
	minW?: number,
	/** 'rect' minimal height */
	minH?: number,
	/** 'rect' maximum width */
	maxW?: number,
	/** 'rect' maximum height */
	maxH?: number,
	/** 'rect' minimal x */
	minX?: number,
	/** 'rect' minimal y */
	minY?: number,
	/** 'rect' maximum x */
	maxX?: number,
	/** 'rect' maximum y */
	maxY?: number,
	/** 'rect' rotates with it owner object */
	rotable?: boolean,
	/** 'rect' is not scales with it owner object */
	notScalable?: boolean,
	/** set this property to true if you want to override existing field with the same name. Otherwise field with the same name will be treated as an error.*/
	override?: Boolean,
	/** highlights field in property editor with green color */
	important?: Boolean,
	notSerializable?: Boolean,
	/** 'btn' hotkey. Add 1000 if it needs Ctrl */
	hotkey?: Number,
	notAnimate?: Boolean,
	tip?: String,
	/** id for store current 'filter' value for 'select list' property. its allows to keep same filter for fields with different names*/
	filterName?: String,
	helpUrl?: string,
	select?: {name:string, value:any}[],
	/** 'btn' onClick handler */
	onClick?: (o:DisplayObject) => void,
	/** 'data-path' chosen value validation */
	isValueValid?: (o:any) => boolean,
	/** shows alert for filed if it's value is wrong*/
	validate?: (o:DisplayObject) => String | null,
	parser?: (inputValue:any) => any,
	visible?: (o:DisplayObject) => boolean,
	disabled?: (o:DisplayObject) => boolean,
	afterEdited?: (o:DisplayObject) => void,
	beforeEdited?: (o:DisplayObject) => void,
}

declare global {
	var editor: TEditor;
	function assert(expression: boolean, message?: string, errorCode?: number);
	function __getNodeExtendData(node:Container): any;
	function __EDITOR_editableProps(constructor: new () => T, fields: EditableFieldDescription[]): void;
}