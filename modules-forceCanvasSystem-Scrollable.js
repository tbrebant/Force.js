/**
 * window.force.modules.forceCanvasSystem.Scrollable()
 */
(function() {
	
	var INHERIT_FROM = window.force.modules.forceCanvasSystem.Graphical;
	
	var Scrollable = function(params) {
		params = init.call(this, params);
		INHERIT_FROM.call(this, params);
		setup.call(this, params);
	};

	window.force.inherit(Scrollable, INHERIT_FROM);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	// how far the momentum is going to go after releasing finger
	var DEFAULT_DECELERATION_SCALE_FACTOR     = 70;
	
	// how long time the momentum will remains after releasing finger
	var DEFAULT_DECELERATION_TIME_CONSTANT    = 100;
	
	// how many time after releasing finger we keed the exact same velocity before begining the deceleration (ms)
	var DEFAULT_ORIGINAL_VELOCITY_PERSISTENCE = 50;
	
	// how fast the content is coming back when outbouded
	var DEFAULT_RUBBER_SPEED                  = 0.2;
	
	// max distance allowed outside of the container, based on the parent size, or itself size if no parent
	var DEFAULT_MAX_OUTBOUND                  = 0.2;
	
	// use deceleration or not?
	var DEFAULT_USE_DECELERATION              = true;
	
	// use bouncing
	var DEFAULT_USE_BOUNCING                  = true;
	
	// axis
	var DEFAULT_LOCK_X                        = false;
	var DEFAULT_LOCK_Y                        = false;
	
	// the minimal distance the touch have to move before considering it as a real move
	var DEFAULT_MINIMAL_DISTANCE              = window.force && window.force.modules && window.force.modules.screen ? Math.ceil(Math.min(window.force.modules.screen.availableWidth, window.force.modules.screen.availableHeight) * 0.015) : 5;
	
	// if the first axis the user is moving is locking other axis
	// if not false a minimalDistance is needed to let it works (the axis is determine when minimal distanced is reached
	// value is between 1 and anything. for example a 2 will mean an axis need to be 2x over the other axis to get locked if no axis reach this condition, then the scrolling is free
	// if set to 1 it will mean an axis just have to be over or equal the other one to get locked
	var DEFAULT_FIRST_AXIS_LOCKING            = 2;

	var or = window.force.modules.helpers.or;
	
	function init(params) {
		params = params || {};
		
		params.x                           = or(params.x                      , 0);
		params.y                           = or(params.y                      , 0);
		params.w                           = or(params.w                      , force.modules.screen.availableWidth);
		params.h                           = or(params.h                      , force.modules.screen.availableHeight);

		return params;
	}
	
	function setup(params) {

		this.decelerationScaleFactor     = or(params.decelerationScaleFactor     , DEFAULT_DECELERATION_SCALE_FACTOR);
		this.decelerationTimeConstant    = or(params.decelerationTimeConstant    , DEFAULT_DECELERATION_TIME_CONSTANT);
		this.originalVelocityPersistence = or(params.originalVelocityPersistence , DEFAULT_ORIGINAL_VELOCITY_PERSISTENCE);
		this.rubberSpeed                 = or(params.rubberSpeed                 , DEFAULT_RUBBER_SPEED);
		this.useDeceleration             = or(params.useDeceleration             , DEFAULT_USE_DECELERATION);
		this.useBouncing                 = or(params.useBouncing                 , DEFAULT_USE_BOUNCING);
		this.lockX                       = or(params.lockX                       , DEFAULT_LOCK_X);
		this.lockY                       = or(params.lockY                       , DEFAULT_LOCK_Y);
		this.maxOutbound                 = or(params.maxOutbound                 , DEFAULT_MAX_OUTBOUND);
		this.minimalDistance             = or(params.minimalDistance             , DEFAULT_MINIMAL_DISTANCE);
		this.firstAxisLocking            = or(params.firstAxisLocking            , DEFAULT_FIRST_AXIS_LOCKING);

		this.on('touchStart', this.touchStart);
		this.on('touchMove', this.touchMove);
		this.on('touchEnd', this.touchEnd);
		//this.on('rotoPinch', this.rotoPinch);

		// internals
		this.initTouchData();
		
		this.velocityFrames = 10; // number of frames used to calculate the average velocity
		this.outboundLimit = this.getOutboundLimit(); // auto updated every frame
		this.vx = this.x;
		this.vy = this.y;
	};
	
	// to transform touch coordinates into local system coordinates
	Scrollable.prototype.initTouchData = function () {
		this.dragInProgress = false;
		this.lastX = null;
		this.lastY = null;
		this.velocity = {x: [], y: []};
		this.velocityFrame = 0;
		this.selfAnimatingX = false;
		this.selfAnimatingY = false;
		this.velocityLastX = null;
		this.velocityLastY = null;
		this.velocityLastTime = null;
		this.selfAnimatingVelocity = {x: null, y: null};
		this.deceleration = null;
		this.tempLockX = false;
		this.tempLockY = false;
	}
	
	// to transform touch coordinates into local system coordinates
	Scrollable.prototype.convertTouchCoordinatesToLocal = function (touchEvent) {
		if (!this.parent) {
			return {
				x: touchEvent.pageX,
				y: touchEvent.pageY
			};
		}
		var c = this.parent.wordToLocal(touchEvent.pageX, touchEvent.pageY);
		return {
			x: c[0],
			y: c[1]
		};
	}
	
	// to identify the scroll limit, upper limits works only if there is a parent graphical with both `w` and `h`
	// called one time per frame, so if any element change size it should works automatically (TODO: to test)
	Scrollable.prototype.getOutboundLimit = function () {
		var outboundTop    = 0;
		var outboundbottom = (this.parent && this.parent.h && this.h) ? Math.min(0, this.parent.h - this.h) : -Infinity;
		var outboundLeft   = 0;
		var outboundRight  = (this.parent && this.parent.w && this.w) ? Math.min(0, this.parent.w - this.w) : -Infinity;
		return {
			top: outboundTop,
			bottom: outboundbottom,
			left: outboundLeft,
			right: outboundRight
		};
	};
	
	// record the last frame velocity (x and y) in the velocity array
	function setVelocity() {
		var now = Date.now();
		if (this.velocityLastTime) {
			var dx = this.vx - this.velocityLastX;
			var dy = this.vy - this.velocityLastY;
			var lastFrameVelocityX = dx / (now - this.velocityLastTime);
			var lastFrameVelocityY = dy / (now - this.velocityLastTime);
			if (!isNaN(lastFrameVelocityX) || !isNaN(lastFrameVelocityY)) {
				this.velocity.x[this.velocityFrame] = (this.lockX || this.tempLockX) ? 0 : lastFrameVelocityX; // try to fix the NaN problem
				this.velocity.y[this.velocityFrame] = (this.lockY || this.tempLockY) ? 0 : lastFrameVelocityY; // try to fix the NaN problem
				this.velocityFrame = (this.velocityFrame + 1) % this.velocityFrames;
			}
		}
		this.velocityLastTime = now;
		this.velocityLastX = this.vx;
		this.velocityLastY = this.vy;
	}
	
	// get velocity (average of last frames)
	Scrollable.prototype.getVelocity = function(vel) {
		var sumX = 0;
		var sumY = 0;
		for (var i = 0, len = this.velocity.x.length; i < len; i++) {
			sumX += this.velocity.x[i];
			sumY += this.velocity.y[i];
		}
		return {
			x: sumX / len,
			y: sumY / len
		};
	};
	
	// if bouncing is not used, blocks the content into the limits
	function enforceOutboundLimit() {
		if(!this.useBouncing) {
			if (this.vx > this.outboundLimit.left) {
				this.vx = this.outboundLimit.left;
			} else if (this.vx < this.outboundLimit.right) {
				this.vx = this.outboundLimit.right;
			}
			if (this.vy > this.outboundLimit.top) {
				this.vy = this.outboundLimit.top;
			} else if (this.vy < this.outboundLimit.bottom) {
				this.vy = this.outboundLimit.bottom;
			}
		}
	};
	
	// touch start
	Scrollable.prototype.touchStart = function(evt, touchIndex) {
		touchIndex = touchIndex || 0;
		
		if (this.isXyInside(evt.centerX, evt.centerY) && !this.dragInProgress) {
			this.selfAnimatingX = false;
			this.selfAnimatingY = false;
			this.selfAnimatingVelocity = {
				x: 0,
				y: 0
			};
			this.velocityLastX = null;
			this.velocityLastY = null;
			this.velocityLastTime = null;
			this.velocity = {x: [], y: []};
			this.velocityFrame = 0;
			this.vx = this.x;
			this.vy = this.y;
			this.touchStartX = evt.touches[touchIndex].pageX;
			this.touchStartY = evt.touches[touchIndex].pageY;
			this.minimalDistanceReached = false;
			this.tempLockX = false;
			this.tempLockY = false;
			
			var localCoords = this.convertTouchCoordinatesToLocal(evt.touches[touchIndex]);
			var x = localCoords.x;
			var y = localCoords.y;
			
			this.lastX = x;
			this.lastY = y;
			
			setVelocity.call(this);
			
			this.dragInProgress = evt.touches[touchIndex].force.uid;
		}
	};
	
	// touch move
	Scrollable.prototype.touchMove = function(evt) {
		if (this.isXyInside(evt.centerX, evt.centerY) && this.dragInProgress) {
			for (var i = 0; i < evt.touches.length; i++) {
				if (evt.touches[i].force.uid === this.dragInProgress) {
					var touchIndex = i;

					if (!this.minimalDistanceReached && this.minimalDistance > 0) {
						var originalStartX = this.touchStartX;
						var originalStartY = this.touchStartY;
						if (Math.sqrt(Math.pow((this.touchStartX - evt.touches[touchIndex].pageX), 2) + Math.pow((this.touchStartY - evt.touches[touchIndex].pageY), 2)) >= this.minimalDistance) {
							this.minimalDistanceReached = true;
							if (this.firstAxisLocking) {
								var ratioX = Math.abs(originalStartX - evt.touches[touchIndex].pageX);
								var ratioY = Math.abs(originalStartY - evt.touches[touchIndex].pageY);
								if (ratioX >= ratioY * this.firstAxisLocking) {
									this.tempLockY = true;
								} else if (ratioY >= ratioX * this.firstAxisLocking) {
									this.tempLockX = true;
								}
							}
						}
					}

					var localCoords = this.convertTouchCoordinatesToLocal(evt.touches[touchIndex]);
					var x = localCoords.x;
					var y = localCoords.y;
					
					var dx = x - this.lastX;
					var dy = y - this.lastY;
					
					if (this.lockX || this.tempLockX) { dx = 0; }
					if (this.lockY || this.tempLockY) { dy = 0; }
					
					if (this.minimalDistanceReached || !this.minimalDistance > 0) {
						this.vx += dx;
						this.vy += dy;
					}
					
					enforceOutboundLimit.call(this);

					this.lastX = x;
					this.lastY = y;
					
					return;
				}
			}
		}
	};
	
	// touch end
	Scrollable.prototype.touchEnd = function (evt) {
		for (var i = 0; i < evt.touches.length; i++) {
			if (evt.touches[i].force.uid === this.dragInProgress) {

				setVelocity.call(this);

				this.dragInProgress = false;
				
				var velocity = this.getVelocity();

				if (velocity.x !== 0) {
					this.selfAnimatingVelocity.x = velocity.x;
					this.selfAnimatingX = true;
				}
				if (velocity.y !== 0) {
					this.selfAnimatingVelocity.y = velocity.y;
					this.selfAnimatingY = true;
				}
				
				if (!this.selfAnimatingX) {
					this.tempLockX = false;
				}
				if (!this.selfAnimatingY) {
					this.tempLockY = false;
				}
				
				this.velocity = {x: [], y: []};
				this.velocityFrame = 0;
				this.velocityLastX = null;
				this.velocityLastY = null;
				
				this.deceleration = {
					initialVelocityX: velocity.x,
					initialVelocityY: velocity.y,
					amplitudeX: velocity.x * this.decelerationScaleFactor,
					amplitudeY: velocity.y * this.decelerationScaleFactor,
					timestamp: Date.now(),
					targetPositionX: this.vx + (velocity.x * this.decelerationScaleFactor),
					targetPositionY: this.vy + (velocity.y * this.decelerationScaleFactor),
					timeConstant: this.decelerationTimeConstant,
					activeX: false,
					activeY: false
				};
			}
		}
	};
	
	// called every frame
	Scrollable.prototype.draw = function (ctx) {
		// draw itself (childs have already been drawn before)
		INHERIT_FROM.prototype.draw.call(this, ctx);

		var now = Date.now();
		
		// outboud cache to avoid calling it more than 1 time per frame
		this.outboundLimit = this.getOutboundLimit();
		
		var isOutboundX = this.vx > this.outboundLimit.left || this.vx  < this.outboundLimit.right;
		var isOutboundY = this.vy > this.outboundLimit.top || this.vy  < this.outboundLimit.bottom;
		
		if (isOutboundX && this.selfAnimatingX) {
			this.selfAnimatingX = false;
			if (!this.dragInProgress) {
				this.tempLockX = false;
			}
		}
		if (isOutboundY && this.selfAnimatingY) {
			this.selfAnimatingY = false;
			if (!this.dragInProgress) {
				this.tempLockY = false;
			}
		}
		
		if (this.dragInProgress) {
			setVelocity.call(this);
		}

		var storeVelocity = false;
		
		if (this.selfAnimatingX) {
			if (this.useDeceleration && this.deceleration.activeX) {
				var elapsed = now - this.deceleration.timestamp;

				var newX = this.deceleration.targetPositionX - this.deceleration.amplitudeX * Math.exp(-elapsed / this.deceleration.timeConstant);
				var dx = newX - this.vx;
				this.vx += dx;
				
				if (elapsed > 6 * this.deceleration.timeConstant) {
				    this.selfAnimatingX = false;
					if (!this.dragInProgress) {
						this.tempLockX = false;
					}
				}
			} else {
				var dx = this.selfAnimatingVelocity.x * (now - this.velocityLastTime);
				
				if (!isNaN(dx)) {
					this.vx += dx;
				}
				storeVelocity = true;
			}
		}
		
		if (this.selfAnimatingY) {
			if (this.useDeceleration && this.deceleration.activeY) {
				var elapsed = now - this.deceleration.timestamp;

				var newY = this.deceleration.targetPositionY - this.deceleration.amplitudeY * Math.exp(-elapsed / this.deceleration.timeConstant);
				var dy = newY - this.vy;
				this.vy += dy;
				
				if (elapsed > 6 * this.deceleration.timeConstant) {
				    this.selfAnimatingY = false;
					if (!this.dragInProgress) {
						this.tempLockY = false;
					}
				}
			} else {
				var dy = this.selfAnimatingVelocity.y * (now - this.velocityLastTime);
				
				if (!isNaN(dy)) {
					this.vy += dy;
				}
				storeVelocity = true;
			}
		}

		if (storeVelocity) {
			this.velocityLastTime = now;
		}
		
		if (!this.dragInProgress) {
			if (isOutboundX) {
				if (this.vx > this.outboundLimit.left) {
					this.vx = this.vx * (1 - this.rubberSpeed) + this.outboundLimit.left * this.rubberSpeed;
					if (Math.round(this.vx) === Math.round(this.outboundLimit.left)) {
						this.vx = this.outboundLimit.left;
					}
				} else if (this.vx < this.outboundLimit.right) {
					this.vx = this.vx * (1 - this.rubberSpeed) + this.outboundLimit.right * this.rubberSpeed;
					if (Math.round(this.vx) === Math.round(this.outboundLimit.right)) {
						this.vx = this.outboundLimit.right;
					}
				}
			}
			if (isOutboundY) {
				if (this.vy > this.outboundLimit.top) {
					this.vy = this.vy * (1 - this.rubberSpeed) + this.outboundLimit.top * this.rubberSpeed;
					if (Math.round(this.vy) === Math.round(this.outboundLimit.top)) {
						this.vy = this.outboundLimit.top;
					}
				} else if (this.vy < this.outboundLimit.bottom) {
					this.vy = this.vy * (1 - this.rubberSpeed) + this.outboundLimit.bottom * this.rubberSpeed;
					if (Math.round(this.vy) === Math.round(this.outboundLimit.bottom)) {
						this.vy = this.outboundLimit.bottom;
					}
				}
			}
		}
		enforceOutboundLimit.call(this);
		
		if (this.selfAnimatingX || this.selfAnimatingY) {
			if (!this.deceleration.activeX && !this.deceleration.activeY && (now - this.deceleration.timestamp) > this.originalVelocityPersistence) {
				this.deceleration.activeX = true;
				this.deceleration.activeY = true;
				this.deceleration.timestamp = now;
				this.deceleration.targetPositionX = this.vx + (this.deceleration.initialVelocityX * this.decelerationScaleFactor);
				this.deceleration.targetPositionY = this.vy + (this.deceleration.initialVelocityY * this.decelerationScaleFactor);
			}
		}
		
		
		// we did all the calculations on vx and vy (virtual x and virtual y), and we don't change those
		// now if those values are outside of the boundaries, we apply a modifier that tend to a maximum displace
		
		var vx = this.vx;
		var vy = this.vy;

		var maxOutboundX = (this.parent && this.parent.w) ? (this.parent.w * this.maxOutbound) : (this.w ? this.w * this.maxOutbound : 0);
		var maxOutboundY = (this.parent && this.parent.h) ? (this.parent.h * this.maxOutbound) : (this.h ? this.h * this.maxOutbound : 0);
		if (!this.lockX && !this.lockY && !this.tempLockX && !this.tempLockY) {
			maxOutboundX = maxOutboundY = Math.min(maxOutboundX, maxOutboundY);
		}

		if (vx > this.outboundLimit.left) {
			var delta = vx - this.outboundLimit.left;
			var delta = (delta / (delta + Math.pow(maxOutboundX, 1.2))) * maxOutboundX;
			if (isNaN(delta)) { delta = 0; }
			vx = this.outboundLimit.left + delta;
		} else if (vx < this.outboundLimit.right) {
			var delta = this.outboundLimit.right - vx;
			var delta = (delta / (delta + Math.pow(maxOutboundX, 1.2))) * maxOutboundX;
			if (isNaN(delta)) { delta = 0; }
			vx = this.outboundLimit.right - delta;
		}
		
		if (vy > this.outboundLimit.top) {
			var delta = vy - this.outboundLimit.top;
			var delta = (delta / (delta + Math.pow(maxOutboundY, 1.2))) * maxOutboundY;
			if (isNaN(delta)) { delta = 0; }
			vy = this.outboundLimit.top + delta;
		} else if (vy < this.outboundLimit.bottom) {
			var delta = this.outboundLimit.bottom - vy;
			var delta = (delta / (delta + Math.pow(maxOutboundY, 1.2))) * maxOutboundY;
			if (isNaN(delta)) { delta = 0; }
			vy = this.outboundLimit.bottom - delta;
		}

		this.x = vx;
		this.y = vy;
	};
	
	// end user helpers
	Scrollable.prototype.goToTop = function () {
		this.vy = this.y = this.outboundLimit.top;
	}
	Scrollable.prototype.goToLeft = function () {
		this.vx = this.x = this.outboundLimit.left;
	}
	Scrollable.prototype.goToBottom = function () {
		this.vy = this.y = this.outboundLimit.bottom;
	}
	Scrollable.prototype.goToRight = function () {
		this.vx = this.x = this.outboundLimit.right;
	}
	
	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.Scrollable', Scrollable);
	
})();