(function() {
	var mod = {};
	
	/**
	 * window.force.canvas.tools.getAndCreateMainCanvas()
	 *   Simple function trying to retrieve the most logical main canvas and return it,
	 *   and create one if none found
	 */
	mod.getAndCreateMainCanvas = function (options) {
		options = options || {};
		
		var toAppend = false;
		
		// if the document already hold a canvas with an id 'canvas' (Ejecta)
		var canvas;
		if (window.force.modules.environment.isEjecta()) {
			canvas = document.getElementById('canvas');
		}
		
		// check if a canvas already exists in the dom
		if (!canvas) { // TODO: should check this is really a canvas object instead of checking only if it exists
			var elm = document.getElementsByTagName('canvas');
			if (elm.length > 1) {
				// more than one canvas found
				return console.error('mod.getAndCreateMainCanvas > more than 1 canvas is present in the DOM');
			} else if (elm.length === 1) {
				// one canvas found
				canvas = elm[0];
			} else {
				// no canvas in the DOM, let's create one
				var canvas = document.createElement(navigator.isCocoonJS ? 'screencanvas' : 'canvas');
				toAppend = true;
			}
		}
		if (options.width) {
			canvas.width = options.width;
		}
		if (options.height) {
			canvas.height = options.height;
		}
		if (toAppend) {
			document.body.appendChild(canvas);
		}
		
		return canvas;
	};
	
	/**
	 * window.force.canvas.tools.setWallpaper()
	 *   To draw an image or a canvas in another one optimzed (streched + cropped)
	 *   - canvas   : the target canvas
	 *   - asset    : image or canvas object
	 *   - options  : optional
	 *     - width  : if set, avoid the target canvas width detection
	 *     - height : if set, avoid the target canvas height detection
	 */
	mod.drawWallpaper = function (canvas, asset, options) {
		
	}
	
	
	/*wmin: 0.25
	
	
	mod.assetSizer = function (srcW, srcH, minWRatio, maxWRatio, minHRatio, maxHRatio) {
	}*/
	
	
	
	// expose module
	window.force.expose('window.force.canvas.tools', mod);
})();