export default class Signal {
	constructor() {
		this._listeners = [];
	}
	
	add(f) {
		assert(this._listeners.indexOf(f) === -1, 'Handler already added');
		this._listeners.push(f);
	}
	
	remove(f) {
		let i = this._listeners.indexOf(f);
		assert(i >= 0, 'Handler is not exists');
		this._listeners.splice(i, 1);
	}
	
	addOnce() {
		throw "forgot about this antipattern. Use promises instead.";
	}
	
	emit() {
		this._listeners.some((l) => {
			l.apply(null, arguments);
		});
	}
}