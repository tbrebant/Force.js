(function() {

	/**
	 * window.force.inherit()
	 */
	var inherit = function (a, b){
		var fn = function(){};
		fn.prototype = b.prototype;
		a.prototype = new fn;
		a.prototype.constructor = a;
	};
	
	// inherit module
	window.force.expose('window.force.inherit', inherit);
})();