(function() {

	/**
	 * window.force.expose()
	 */
	var expose = function (path, object) {
		var path = path.split('.');
		var tree = window;
		var len = path.length;
		for (var i = (path[0] === 'window' ? 1 : 0); i < len - 1; i++) {
			if (!tree[path[i]]) {
				tree[path[i]] = {};
			}
			tree = tree[path[i]];
		}
		tree[path[len - 1]] = object;
	};
	
	// expose module
	expose('window.force.expose', expose);
})();