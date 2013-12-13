/**
 * window.force.modules.forceCanvasSystem.Canvas()
 */

/**
 * TODO: override update() to use automatically the canvas dom context
 */

(function() {

	var Canvas = function(params) {
		init.call(this, params);
		window.force.modules.forceCanvasSystem.Core.call(this, params);
	};

	window.force.inherit(Canvas, window.force.modules.forceCanvasSystem.Core);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		this.dom = params.canvas;
		this.gesturesManager = new window.force.modules.Gestures(this.dom);
		this._gesturesRegisteredEvents = {};
	}

	// ------------------------------------------
	// Gestures events
	// ------------------------------------------
	
	Canvas.prototype._registerEvent = function(evt) {
		var that = this;
		if (this.parent) {
			return console.error('A forceCanvasSystem Canvas cannot be the child of anything.');
		}
		if (!this._gesturesRegisteredEvents[evt]) {
			if (!this._gesturesRegisteredEvents[evt]) {
				this._gesturesRegisteredEvents[evt] = true;
				this.gesturesManager.on(evt, function(eventData) {
					that._on(eventData);
				});
			}
		}
	};

	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.Canvas', Canvas);
})();