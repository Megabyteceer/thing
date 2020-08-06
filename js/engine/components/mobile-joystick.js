import DSprite from "./d-sprite.js";
import game from "../game.js";

let interaction;

const DISTANCE = 40;
const DISTANCE_Q = DISTANCE * DISTANCE;
const SENSIBLE_DISTANCE = DISTANCE * 0.3;
const SENSIBLE_DISTANCE_Q = SENSIBLE_DISTANCE * SENSIBLE_DISTANCE;
const PI8 = Math.PI / 8;

export default class MobileJoystick extends DSprite {

	constructor() {
		super();

		this.onDown = this.onDown.bind(this);
		this.onUp = this.onUp.bind(this);
		this.onMove = this.onMove.bind(this);

		interaction = game.pixiApp.renderer.plugins.interaction;

		this.on('pointerdown', this.onDown);


		this.isActivated = false;
		this.isTouched = false;

		// pointerdown
		// pointerup
	}

	init() {
		super.init();
		this.baseX = this.x;
		this.baseY = this.y;
		this.touchId = null;
		interaction.on('pointerup', this.onUp);
		interaction.on('pointermove', this.onMove);
		this.deactivate();
	}

	onRemove() {
		super.onRemove();
		interaction.removeListener('pointerup', this.onUp);
		interaction.removeListener('pointermove', this.onMove);
		this.deactivate();
	}

	onDown(ev) {
		this.isTouched = true;
		game.stage.toLocal(ev.data.global, game.pixiApp.stage, ev.data.global, true);
		this.touchX = ev.data.global.x;
		this.touchY = ev.data.global.y;
		this.touchId = ev.data.pointerId;
		this.xSpeed = 0;
		this.ySpeed = 0;
	}

	onMove(ev) {
		if(this.touchId === ev.data.pointerId) {

			game.stage.toLocal(ev.data.global, game.pixiApp.stage, ev.data.global, true);
			
			let dx = ev.data.global.x - this.touchX;
			let dy = ev.data.global.y - this.touchY;

			let len = dx * dx + dy * dy;

			this.isActivated = len > SENSIBLE_DISTANCE_Q;

			this.joystickAngle = Math.atan2(dy, dx);

			if(this.isKeysController) {
				game.keys.right = false;
				game.keys.left = false;
				game.keys.down = false;
				game.keys.up = false;
				if(this.isActivated) {
					let a = Math.floor(this.joystickAngle / PI8);
					game.keys.left = (a <= -6) || (a >= 5);
					game.keys.up = (a <= -2) && (a >= -7);
					game.keys.right = (a >= -4) && (a <= 2);
					game.keys.down = (a >= 1) && (a <= 6);
				}
			}

			if(len > DISTANCE_Q) {
				len = Math.sqrt(len) / DISTANCE;
				dx /= len;
				dy /= len;
			}

			this.x = dx + this.baseX;
			this.y = dy + this.baseY;
		}
	}

	onUp(ev) {
		if(this.touchId === ev.data.pointerId) {
			this.touchId = null;
			this.isTouched = false;
			this.deactivate();
		}
	}

	deactivate() {
		if(this.isKeysController) {
			game.keys.right = false;
			game.keys.left = false;
			game.keys.down = false;
			game.keys.up = false;
		}
		this.isActivated = false;
	}

	update() {
		super.update();
		if(this.touchId === null) {
			this.xSpeed += (this.baseX - this.x) * 0.2;
			this.ySpeed += (this.baseY - this.y) * 0.2;
			this.xSpeed *= 0.7;
			this.ySpeed *= 0.7;
		}

		/// #if DEBUG
		return;
		/// #endif
		if(!game.isMobile.any) { // eslint-disable-line no-unreachable
			this.remove();
		}
	}
}


/// #if EDITOR
__EDITOR_editableProps(MobileJoystick, [
	{
		type: 'splitter',
		title: 'joystick:',
		name: 'Joystick'
	},
	{
		name: 'isKeysController',
		type: Boolean,
		default: true,
	},
	{
		name: 'interactive',
		type: Boolean,
		default: true,
		override: true
	}
]);
MobileJoystick.__EDITOR_group = 'Mobile';
MobileJoystick.__EDITOR_icon = 'tree/scroll';
MobileJoystick.__EDITOR_tip = '<b>joystick.isActivated</b> - true if user have activated this joystick.<br><b>joystick.isTouched</b> - true if user have touching this joystick now.<br><b>joystick.joystickAngle</b> - direction where user drags this joystick now.';
/// #endif