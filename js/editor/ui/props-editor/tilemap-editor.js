import Window from "../window.js";
import Tilemap from "thing-editor/js/engine/components/tilemap.js";
import Lib from "thing-editor/js/engine/lib.js";
import SelectEditor from "thing-editor/js/editor/ui/props-editor/select-editor.js";
import NumberEditor from "thing-editor/js/editor/ui/props-editor/number-editor.js";
import game from "thing-editor/js/engine/game.js";

export default class tilemapEditorRenderer extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {toggled:true};
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	componentWillUnmount() {
		ReactDOM.render(R.fragment(), document.getElementById('additional-windows-root'));
	}
	
	onToggleClick() {
		let t = !this.state.toggled;
		this.setState({toggled: t});
	}
	
	render () {
		return R.btn(this.state.toggled ? 'Close TileEditor (Ctrl+L)' : 'Open TileEditor (Ctrl+L)', this.onToggleClick, undefined, undefined, 1076);
	}

	componentDidUpdate() {
		this._renderWindow();
	}

	componentDidMount() {
		this._renderWindow();
	}

	_renderWindow() {
		if(this.state.toggled) {
			let tilemapEditor = editor.ui.renderWindow('tilemap', 'TileEditor', 'Tilemap Editor', React.createElement(TilemapEditor, {onCloseClick:this.onToggleClick}), 586, 650, 400, 150, 737, 307);
			Window.bringWindowForward('#window-propsEditor');
			Window.bringWindowForward('#window-tilemap', true);
			ReactDOM.render(tilemapEditor, document.getElementById('additional-windows-root'));
		} else {
			ReactDOM.render(R.fragment(), document.getElementById('additional-windows-root'));
		}
	}
}

const hoverRect = {};
const hoverRectPropsMock = {
	field: {
		name: 'tilemap_hower_rect',
		color: 0x55aa55
	}

};

let viewport;
let isSetting;
let isPicking;

let isErasing;
function getTilemap() {
	return editor.selection[0];
}

function refreshTilemap() {
	getTilemap().updateView();
}

class TilemapEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseOut = this.onMouseOut.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onTypeChange = this.onTypeChange.bind(this);
		this.onSizeChange = this.onSizeChange.bind(this);
		this.state= {
			type: editor.settings.getItem('tilemap-type', 1),
			size: editor.settings.getItem('tilemap-size', 1)
		};
	}


	componentDidMount() {
		viewport = document.querySelector('#viewport-root canvas');
		viewport.addEventListener('mousedown', this.onMouseDown);
		viewport.addEventListener('mousemove', this.onMouseMove);
		viewport.addEventListener('mouseout', this.onMouseOut);
		viewport.addEventListener('mouseup', this.onMouseUp);
		window.addEventListener('keydown', this.onKeyDown);
		editor.overlay.disableSelectionByStageClick(true);
		assert(getTilemap() instanceof Tilemap, "Tilemap expected");
		refreshTilemap();
	}
	
	componentWillUnmount() {
		editor.overlay.disableSelectionByStageClick(false);
		viewport.removeEventListener('mousedown', this.onMouseDown);
		viewport.removeEventListener('mousemove', this.onMouseMove);
		viewport.removeEventListener('mouseout', this.onMouseOut);
		viewport.removeEventListener('mouseup', this.onMouseUp);
		window.removeEventListener('keydown', this.onKeyDown);
		isSetting = false;
	}

	onKeyDown(ev) {
		if (!window.isEventFocusOnInputElement(ev) && (ev.keyCode >= 48) && (ev.keyCode <= 57)) {
			this.setType(Math.min(ev.keyCode - 48,
				(Tilemap.tileMapProcessor && Tilemap.tileMapProcessor.types) ?
					Tilemap.tileMapProcessor.types.length : getTilemap().__maxTileIndex));
		}
	}

	onSizeChange(ev) {
		this.setSize(ev.target.value);
	}
		
	onTypeChange(ev) {
		this.setType(ev.target.value);
	}

	onMouseDown(ev) {

		if(editor.overlay.isDraggerOvered()) {
			return;
		}

		if(ev.buttons === 1) {
			if(ev.ctrlKey) { // 99999
				isPicking = true;
			} else {
				isSetting = true;
			}
		}
		if(ev.buttons === 2) {
			isErasing = true;
		}
		this.onMouseMove(ev);
	}

	onClearClick() {
		editor.ui.modal.showEditorQuestion("Are you sure?", "Clear tilemap?", ()=>{
			getTilemap().clear();
			Lib.__invalidateSerializationCache(getTilemap());
			editor.sceneModified();
		});
	}

	setTile(X, Y, type) {
			
		let size = this.state.size;
		
		X -= Math.floor(size / 2);
		Y -= Math.floor(size / 2);
		

		let sceneWasModified = false;
		
		for (let i = 0; i < size; i++) {
			
			for (let j = 0; j < size; j++) {
				
				if(this.setOneTile(X, Y, type)) {
					sceneWasModified = true;
				}
				
				X++;
			}
			X -= size;
			Y++;
		}

		if(sceneWasModified) {
			refreshTilemap();
			Lib.__invalidateSerializationCache(getTilemap());
			editor.sceneModified();
		}
	}
	
	setOneTile(X, Y, type) {

		X = Math.floor(X);
		Y = Math.floor(Y);

		if(X < 0 || Y < 0 || X >= getTilemap().columns || Y >= getTilemap().rows) {
			return;
		}

		let pt = Tilemap.tileMapProcessor.imageToType(getTilemap().getTile(X, Y));
		if(isPicking) {
			if(pt >= 0) {
				this.setState({type: pt});
			}
		} else if (pt !== type) {
			Tilemap.tileMapProcessor.onTileEditCallback(getTilemap(), X, Y, type);
			return true;
		}
	}

	onMouseOut() {
		if(getTilemap()) {
			editor.overlay.drawRect(hoverRectPropsMock, getTilemap());
		}
	}

	onMouseMove(ev) {
		
		let tilemap = getTilemap();

		let p = tilemap.toLocal(game.__mouse_EDITOR);
		
		
		var X = p.x / tilemap.tileW;
		var Y = p.y / tilemap.tileH;
		let size = this.state.size;

		hoverRect.x = Math.floor(X - Math.floor(size / 2)) * tilemap.tileW;
		hoverRect.y = Math.floor(Y - Math.floor(size / 2)) * tilemap.tileH;
		hoverRect.w = size  * tilemap.tileW;
		hoverRect.h = size  * tilemap.tileH;

		editor.overlay.drawRect(hoverRectPropsMock, tilemap, hoverRect);


		if(ev.buttons === 0) {
			isErasing = false;
			isSetting = false;
			isPicking = false;
			return;
		}
		if(isErasing || isSetting || isPicking) {
			this.setTile(X, Y, isErasing ? -1 : this.state.type);
		}
	}

	onMouseUp() {
		isErasing = false;
		isSetting = false;
	}

	setType(t) {
		this.setState({type:t});
		editor.settings.setItem('tilemap-type', t);
	}
	
	setSize(t) {
		this.setState({size:t});
		editor.settings.setItem('tilemap-size', t);
	}

	render() {

		let typeSelector;
		if(Tilemap.tileMapProcessor && Tilemap.tileMapProcessor.types) {
			typeSelector = React.createElement(SelectEditor, {onChange:this.onTypeChange, value:this.state.type, select: Tilemap.tileMapProcessor.types});
		} else {
			typeSelector = React.createElement(NumberEditor,{field:{min: 0, max: getTilemap().__maxTileIndex}, disabled:this.props.disabled, onChange: this.onTypeChange, value: this.state.type});
		}

		if(editor.selection.length !== 1) {
			return R.div(null, "Please select only one tilemap component at once.");
		} else {
			return R.fragment(
				R.span({style:{whiteSpace: 'nowrap'}},
					'Tile type:',
					R.b(null, 
						typeSelector
					)
				),
				R.span({style:{whiteSpace: 'nowrap'}},
					' Brush size: ',
					React.createElement(NumberEditor, {onChange:this.onSizeChange, field:{name:'brush-size', min:1, max:10}, value:this.state.size})
				),
				R.br(),
				R.btn('Clear map', this.onClearClick, "Clear whole tilemap.", 'danger')
			);
		}
	}

}