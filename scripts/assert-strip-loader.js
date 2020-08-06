const assertsReplacer = /^[ \t]*assert[ \t]*\(.+/gm;
/*global module */	
/*global process */	
module.exports = function(source) {
	this.cacheable();
	let res;
	if((process.argv.indexOf('debug') < 0) && !process.env.THING_ENGINE_DEBUG_BUILD) {
		res = source.replace(assertsReplacer, '\n');
	} else {
		res = source;
	}

	this.callback(null, res);
};