/**
 * window.force.modules.forceCanvasSystem.ProgressBar()
 */

(function() {
	
	var ProgressBar = function(params) {
		init.call(this, params);
		window.force.modules.forceCanvasSystem.Graphical.call(this, params);
	};

	window.force.inherit(ProgressBar, window.force.modules.forceCanvasSystem.Graphical);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		var or = window.force.modules.helpers.or;
		params = params || {};
		
		this.loaded     = or(params.loaded     , 0);
		this.toLoad     = or(params.toLoad     , 100);
		this.borderSize = or(params.borderSize , 1);
	}
	
	// overriding the default draw method
	ProgressBar.prototype.draw = function(ctx) {
		//if (this.loaded < this.toLoad) {
			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, this.w, this.h);
			ctx.fillStyle = '#BBBBBB';
			ctx.fillRect(this.borderSize, this.borderSize, this.w - this.borderSize * 2, this.h - this.borderSize * 2);
			ctx.fillStyle = '#FFFFFF';
			var w = (this.w - this.borderSize * 2) / this.toLoad * this.loaded;
			ctx.fillRect(this.borderSize, this.borderSize, w, this.h - this.borderSize * 2);
		//}
	};
	
	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.ProgressBar', ProgressBar);
	
	
})();