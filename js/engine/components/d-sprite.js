import Sprite from "./sprite.js";

export default class DSprite extends Sprite {
	constructor() {
		super();
		this.anchor.set(0.5);
		this.xSpeed = 0;
		this.ySpeed = 0;
		this.rSpeed = 0;
	}

	angleBySpeed() {
		this.rotation = Math.atan2(this.ySpeed, this.xSpeed);
	}
	
	update() {
		this.x += this.xSpeed;
		this.y += this.ySpeed;
		this.rotation += this.rSpeed;
		super.update();
	}
}

/// #if EDITOR
DSprite.__EDITOR_group = 'Basic';
__EDITOR_editableProps(DSprite, [
	{
		type: 'splitter',
		title: 'Dynamic Sprite:',
		name: 'd-sprite'
	},
	{
		name: 'xSpeed',
		type: Number,
		step: 0.001
	},
	{
		name: 'ySpeed',
		type: Number,
		step: 0.001
	},
	{
		name: 'rSpeed',
		type: Number,
		step: 0.0001
	}
]);

DSprite.__EDITOR_icon = 'tree/dsprite';
/// #endif