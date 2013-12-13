(function() {
	/**
	 * window.force.modules.RenderLoop()
	 */
	
	/**
	 * TODO:
	 *   optionally the possibility to set multiple draw methods
	 *   investigate to see if a differenciation between draw and logic loops would be an improvement*
	 *     (draw is called when possible, logic would be called everytime)
	 *   add a method to enable/disable the native requestFrameAnimation override
	 */
	var mod = function (options) {
		options = options || {};
		var that = this;
		var framerate = 60;
		var drawMethod;
		var then, interval;
		var useSimpleLoop = false;
		var drawTimer;
		var stopRequest = false;
		var requestAnimationFrameCbList = null;
		var requestAnimationFrameSupported = false;
		var limitMaximumSpeed = false;
		var TWEEN;
		
		this.SMALLER_FRAME_INTERVAL = 1000 / 60;

		// -------------------------
		// save original native requestAnimationFrame (will be overrided after)
		// -------------------------
		
		var nativeCode = {
			requestAnimationFrame       : window.requestAnimationFrame,
			webkitRequestAnimationFrame : window.webkitRequestAnimationFrame,
			mozRequestAnimationFrame    : window.mozRequestAnimationFrame,
			oRequestAnimationFrame      : window.oRequestAnimationFrame
		};
		
		requestAnimationFrameSupported = (
			nativeCode.requestAnimationFrame ||
			nativeCode.webkitRequestAnimationFrame ||
			nativeCode.mozRequestAnimationFrame ||
			nativeCode.oRequestAnimationFrame
		) ? true : false;
		
		// requestAnimFrame is set to the right function (the following function is executed right now and never again)
		var requestAnimFrame = (function() {
			return nativeCode.requestAnimationFrame ||
			nativeCode.webkitRequestAnimationFrame  ||
			nativeCode.mozRequestAnimationFrame     ||
			nativeCode.oRequestAnimationFrame       ||
			function (cb){
				window.setTimeout(cb, interval);
			};
		})();

		// -------------------------
		// native requestAnimationFrame override
		// -------------------------

		window.requestAnimationFrame = function(cb) {
			if(!requestAnimationFrameCbList) {
				requestAnimationFrameCbList = [];
			}
			requestAnimationFrameCbList.push(cb);
		};
		
		var rafVariants = ['webkitRequestAnimationFrame', 'mozRequestAnimationFrame', 'oRequestAnimationFrame'];
		for (var i = 0; i < rafVariants.length; i++) {
			if (window[rafVariants[i]]) {
				window[rafVariants[i]] = window.requestAnimationFrame;
			}
		}
		
		function execRequestAnimationFrameFnList() {
			// native requestAnimationFrame override cb list
			if (requestAnimationFrameCbList) {
				var l = requestAnimationFrameCbList.length;
				for (var i = 0; i < l; i++) {
					var f = requestAnimationFrameCbList.shift();
					if (f) {
						f();
					}
				}
				if (requestAnimationFrameCbList.length === 0) {
					requestAnimationFrameCbList = null;
				}
			}
		};
		
		// -------------------------
		// standard exposed methods
		// -------------------------
		
		this.setFramerate = function (fps) {
			framerate = Math.min(60, Math.max(1, Math.round(fps)));
			interval = 1000 / framerate;
		};
		
		this.getFramerate = function() {
			return Math.round(1000 / interval);
		};
		
		this.setDrawMethod = function (fn) {
			if (typeof fn == 'function') {
				drawMethod = fn;
			}
		};
		
		this.forceSimpleLoop = function (bool) {
			if (bool === true || bool === false) {
				useSimpleLoop = bool;
			}
		};
		
		this.limitMaximumFps = function (bool) {
			if (bool === true || bool === false) {
				limitMaximumSpeed = bool;
			}
		};
		
		this.start = function () {
			if (window.TWEEN) {
				TWEEN = window.TWEEN;
			}
			if (!then) { // if it's not already running
				then = Date.now();
				this.lastFrameInterval = this.SMALLER_FRAME_INTERVAL;
				if (drawMethod) {
					// setInterval(function() { console.log((1000 / that._fpsTool.getAverageDelta()) + ' fps'); }, 3000);
					
					if (useSimpleLoop) {
						drawTimer = setInterval(function() {
							coreDraw();
						}, Math.floor(interval));
					} else {
						draw();
					}
				}
			}
		};
		
		this.stop = function (fn) {
			if (drawTimer) {
				clearInterval(drawTimer);
			} else if (then) {
				stopRequest = true;
			}
			then = null;
		};
		
		this.forceDrawNow = function() {
			then = Date.now();
			coreDraw();
		};
		
		// -------------------------
		// fps debug tool
		// -------------------------
		
		/*this._fpsTool = {};
		this._fpsTool.stats = [];
		this._fpsTool.setLastDelta = function(d) {
			that._fpsTool.stats.push(d);
			that._fpsTool.stats.splice(0, that._fpsTool.stats.length - 60 * 3);
		}
		this._fpsTool.getAverageDelta = function() {
			var t = 0;
			var f = 0;
			var max = 60 * 3;
			for (var i = 0, l = that._fpsTool.stats.length; i < l; i++) {
				t += that._fpsTool.stats[l - i - 1];
				f++;
				if (t >= max) break;
			}
			t = t / f;
			return t;
		}*/
		
		// -------------------------
		// render loop
		// -------------------------
		
		function draw() {
			if (!stopRequest) {

				var now, delta;
				
				if (!requestAnimationFrameSupported || limitMaximumSpeed) {
					now = Date.now();
					delta = now - then;
					that.lastFrameInterval = delta;
					that.now = now;
				}

				if ((!requestAnimationFrameSupported || limitMaximumSpeed) && delta < interval) {
					setTimeout(draw, 1);
				} else {
					if (!requestAnimationFrameSupported || limitMaximumSpeed) {
						//that._fpsTool.setLastDelta(delta);
						then = now;
						requestAnimFrame(draw);
					}

					coreDraw();

					if (requestAnimationFrameSupported && !limitMaximumSpeed) {
						now = Date.now();
						delta = now - then;
						that.lastFrameInterval = delta;
						that.now = now;
						//that._fpsTool.setLastDelta(delta);
						then = now;
						requestAnimFrame(draw);
						
					}
				}
			} else {
				stopRequest = false;
			}
		}

		// -------------------------
		// core draw, executed either
		// by simple loop or framerequest
		// -------------------------

		function coreDraw() {
			drawMethod();
			execRequestAnimationFrameFnList();
			// if the tween component exists let's update it
			if (TWEEN) {
				TWEEN.update();
			}
		};

	};
	
	// expose module
	window.force.expose('window.force.modules.RenderLoop', mod);
})();