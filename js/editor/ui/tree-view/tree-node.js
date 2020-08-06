import game from "thing-editor/js/engine/game.js";

let caretClosed = R.span({className: 'tree-caret'}, '▸');
let caretOpened = R.span({className: 'tree-caret'}, '▾');

let lastClickedItem;

class TreeNode extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	onMouseDown(ev) { // == select nodes
		if(!this.props.node.parent) {
			return;
		}
		let state = __getNodeExtendData(this.props.node);
		if((isClickedAtRightEdge(ev)) && nodeHasChildren(this.props.node)) {
			state.childrenExpanded = !state.childrenExpanded;
			if(!state.childrenExpanded) {
				collapseChildrenRecursively(this.props.node);
			}
			this.forceUpdate();
			sp(ev);
			return;
		}
		
		if(ev.shiftKey && lastClickedItem && (lastClickedItem.props.node.parent === this.props.node.parent)) {
			let p = this.props.node.parent;
			let i1 = p.getChildIndex(lastClickedItem.props.node);
			let i2 = p.getChildIndex(this.props.node);
			let from = Math.min(i1, i2);
			let to = Math.max(i1, i2);
			while(from <= to) {
				let n = p.getChildAt(from);
				if(n !== lastClickedItem.props.node) {
					editor.selection.select(n, true);
				}
				from++;
			}
		} else {
			editor.selection.select(this.props.node, ev.ctrlKey);
		}
		
		if(state.isSelected) {
			lastClickedItem = this;
		}
		if(document.activeElement) {
			document.activeElement.blur();
		}
		sp(ev);
	}

	static clearLastClicked() {
		lastClickedItem = null;
	}
	
	render() {
		let node = this.props.node;
		let state = __getNodeExtendData(node);
		let children;
		let caret;
		if(nodeHasChildren(node) && !state.hideAllChildren) {
			if(state.childrenExpanded) {
				caret = caretOpened;
				children = R.div({className: 'tree-children'},
					node.children.map(R.renderSceneNode)
				);
			} else {
				caret = caretClosed;
			}
		}
		let className = 'list-item';
		
		if(state.isSelected) {
			if(!lastClickedItem) {
				lastClickedItem = this;
			}
			className += ' item-selected';
		}

		let style;
		if(game.__EDITOR_mode && node.children.length > 6) {
			style = {
				paddingTop: 9,
				paddingBottom: 9
			};
		}
		
		if(state.hidden) {
			style = {display: 'none'};
		}
		
		return R.fragment(R.div({
			onDoubleClick:(ev) => {
				if(!isClickedAtRightEdge(ev) && !ev.ctrlKey) {
					editor.editClassSource(node);
				}
			},
			className,
			style,
			onMouseDown: this.onMouseDown
		}, R.sceneNode(node), caret), children);
	}
}

function nodeHasChildren(node) {
	return node.children.length > 0;
}

function isClickedAtRightEdge(ev) {
	let b = ev.currentTarget.closest('.scene-tree-view').getBoundingClientRect();
	return (b.right - ev.clientX) < 40;
}

function collapseChildrenRecursively(node) {
	__getNodeExtendData(node).childrenExpanded = false;
	if(node.hasOwnProperty('children')) {
		node.children.some(collapseChildrenRecursively);
	}
}

export default TreeNode;