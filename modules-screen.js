(function() {
	var screen = {
		availableWidth: window.innerWidth,
		availableHeight: window.innerHeight,
		update: function() {
			screen.availableWidth = window.innerWidth;
			screen.availableHeight = window.innerHeight;
		}
	};
	
	// expose module
	window.force.expose('window.force.modules.screen', screen);
})();