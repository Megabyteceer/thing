import DataPathEditor from "./data-path-editor.js";

export default class CallbackEditor extends DataPathEditor {
	
	constructor(props) {
		super(props);
		this.itIsCallbackEditor = true;
	}

	prepareCurrentPath(path) {
		return path ? path.split('`')[0] : null;
	}
	
	isItTargetValue(val) {
		assert(val, "empty value selected in callback chooser. Field filter need improvements: ");
		
		let type = typeof val;
		return (type === 'function') && (!CallbackEditor.isFunctionIsClass(val));
	}
	
	finalValueChoosed(path, val, parent) {
		path = path.join('.');
		
		if(val.___EDITOR_callbackParameterChooserFunction) {
			val.___EDITOR_callbackParameterChooserFunction(parent).then((params) => {
				if(!params) {
					return;
				}
				if(!Array.isArray(params)) {
					params = [params];
				}
				params = params.map((p) => {
					if(typeof p === 'number') {
						return p.toString();
					}
					return p;
				});

				for(let p of params) {
					assert((p.indexOf(',') < 0) && (p.indexOf('`') < 0), "parameter chooser returned parameter containing wrong symbol (, or `)");
				}
				params = params.join(',');
				if(params) {
					this.applyFinalPath(path + '`' + params);
				}
			});
		} else {
			if((typeof(val) === 'function') && (val.length > 0)) {
				path += '`';
				editor.ui.propsEditor.selectField(this.props.field ? this.props.field.name : '.keyframe-callback-editor', true);
			}
			this.applyFinalPath(path);
		}
	}
	
	
	isFieldGoodForCallbackChoose(fieldName, object, val) {
		if(!super.isFieldGoodForCallbackChoose(fieldName, object, val)) {
			return false;
		}
		
		if(typeof val === 'undefined') {
			val = object[fieldName];
		}
		if(!val) {
			return false;
		}
		let type = typeof val;
		return (type === 'object' || type === 'function') && !val.___EDITOR_isHiddenForCallbackChooser;
	}
}