/*global module */	

module.exports = function() {
	this.emitError(new Error("Attempt to import editor only code in to the game:\n" + this.resourcePath + "\nMore info: https://99999"));
};