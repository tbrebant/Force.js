/**
 * window.force.modules.forceCanvasSystem.Spinner()
 *
 * thanks to https://gist.github.com/reneras/3104283
 */

(function() {
	
	var INHERIT_FROM = window.force.modules.forceCanvasSystem.Graphical;
	
	var Spinner = function(params) {
		params = init.call(this, params);
		INHERIT_FROM.call(this, params);
		setup.call(this, params);
	};

	window.force.inherit(Spinner, INHERIT_FROM);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		var or = window.force.modules.helpers.or;
		params = params || {};
		
		var screenWidth = window.force.modules.screen ? window.force.modules.screen.availableWidth : window.innerWidth;
		var screenHeight = window.force.modules.screen ? window.force.modules.screen.availableHeight : window.innerHeight;
		var parentWidth = (this.parent && this.parent.w) ? this.parent.w : screenWidth;
		var parentHeight = (this.parent && this.parent.h) ? this.parent.h : screenHeight;
		var smaller = Math.min(parentWidth, parentHeight);
		
		params.w         = or(params.w       , Math.ceil(smaller * 0.1));
		params.h         = or(params.h       , params.w);
		params.anchor    = or(params.anchor  , [0.5, 0.5]);
		params.x         = or(params.x       , parentWidth / 2);
		params.y         = or(params.y       , parentHeight / 2);
		params.bgColor   = or(params.bgColor , null);
		params.zIndex    = or(params.zIndex  , 10);
		
		return params;
	}
	
	function setup(params) {
		var or = window.force.modules.helpers.or;
		
		this.spinColorRed   = or(params.spinColorRed   , 0);    // 0~255
		this.spinColorGreen = or(params.spinColorGreen , 0);    // 0~255
		this.spinColorBlue  = or(params.spinColorBlue  , 0);    // 0~255
		this.spinLines      = or(params.spinLines      , 16);
		this.spinSpeed      = or(params.spinSpeed      , 700);  // ms required for a 360 degree rotation
		this.spinLineWidth  = or(params.spinLineWidth  , 0.06);
		this.spinCenterPos  = or(params.spinLineWidth  , 0.4);  // between 0 and 1
		this.spinBorderPos  = or(params.spinLineWidth  , 0.8);  // between 0 and 1

		this._start = Date.now();
		this._rotationStep = Math.PI * 2 / this.spinLines;
		this._lineWidth = this.w * this.spinLineWidth;
	}
	
	// overriding the default draw method
	Spinner.prototype.draw = function(ctx) {
		var rotation = parseInt(((Date.now() - this._start) / this.spinSpeed) * this.spinLines) / this.spinLines;
		rotation = (Math.PI * 2 * rotation) % (Math.PI * 2);

		ctx.save();
		ctx.translate(this.w / 2, this.h / 2);
		ctx.rotate(rotation);
		ctx.lineWidth = this._lineWidth;
		for (var i = 0; i < this.spinLines; i++) {
			ctx.beginPath();
			ctx.rotate(this._rotationStep);
			ctx.moveTo(this.w * this.spinCenterPos / 2, 0);
			ctx.lineTo(this.w * this.spinBorderPos / 2, 0);
			ctx.strokeStyle = 'rgba(' + this.spinColorRed + ', ' + this.spinColorGreen + ', ' + this.spinColorBlue + ',' + (i / this.spinLines) + ')';
			ctx.stroke();
		}
		ctx.restore();
	};

	Spinner.prototype.centerInParent = function() {
		if (this.parent && this.parent.w && this.parent.h) {
			this.x = this.parent.w / 2;
			this.h = this.parent.h / 2;
		}
	};
	
	Spinner.prototype.onAdded = function() {
		this.centerInParent();
	};
	
	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.Spinner', Spinner);
})();