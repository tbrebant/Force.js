Array.prototype.flatten = function () {
	var toReturn = [];
	for (var i = 0, len = this.length; i < len; i++) {
		if (this[i] instanceof Array) {
			toReturn = toReturn.concat(this[i].flatten());
		} else {
			toReturn.push(this[i]);
		}
	}
	return toReturn;
};

if (window.Element) {
	window.Element.prototype.addClassName = function (a) {
		var classes = this.className.split(' ');
		var args = Array.prototype.flatten.call(arguments);
		var n = args.length;
		for (var i = 0; i < n; i++) {
			var className = args[i];
			if (classes.indexOf(className) === -1) {
				classes.push(className);
			}
		}
		this.className = classes.join(' ');
	};
	
	window.Element.prototype.delClassName = function () {
		var classes = this.className.split(' ');
		var args = Array.prototype.flatten.call(arguments);
		this.className = classes.filter(function (elm) {
			return args.indexOf(elm) === -1;
		}).join(' ');
	};
}