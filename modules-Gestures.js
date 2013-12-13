(function() {
	
	/**
	 * window.force.modules.Gestures()
	 *
	 * Implemented:
	 *   tap, doubletap, hold, touchStart, touchMove, touchEnd, rotoPinch, swipe
	 *
	 * How to use:
	 *
	 *   rq: rotoPinch manage all the multiple fingers gestures (pinch, rotation, translations), other event are pretty obvious
	 *
	 *   var a = new window.force.modules.Gestures(window); // you can target any dom element
	 *   a.on('tap', function(evt) {
	 *       console.log('You tapped the screen at position ' + evt.centerX + ' x ' + evt.centerY);
	 *       console.log('The force UID of the touch was ' + evt.touches[0].force.uid);
	 *       console.log('Full event object: ', evt);
	 *   });
	 *
	 * The provided object contains:
	 *   type       : {string} the detected gesture (see `implemented` above)
	 *   touches    : {array}  array of touch events; each touch contains the regular system touch object
	 *                      (the most useful values for position detection are pageX and pageY)
	 *                      + an additional force key with this sub keys:
	 *       uid          : {string} a force only UID (not id only: a really unique id in the application life time)
	 *       pageXstart   : {number} the X starting position of this touch
	 *       pageYstart   : {number} the Y starting position of this touch
	 *       started      : {number} when this touch started (timestamp)
	 *   centerX    : {number} the most logical center point X of the event
	 *   centerY    : {number} the most logical center point Y of the event
	 *   started    : {number} when this gesture started (timestamp)
	 *   event      : {system object} the browser system event object                     /!\ `hold` doesn't provide it
	 *   ended      : {number} when the gesture ended, mostly used internally             /!\ `tap` event only
	 *   deltaX     : {number} how much the touch event moved on X since the last trigger /!\ `touchMove` and `rotoPinch` only
	 *   deltaY     : {number} how much the touch event moved on Y since the last trigger /!\ `touchMove` and `rotoPinch` only
	 *   deltaScale : {number} how much scale since the last trigger                      /!\ `rotoPinch` only
	 *   deltaAngle : {number} how much angle rotation since the last trigger             /!\ `rotoPinch` only
	 *   startedX   : {number} the starting X position of the gesture                     /!\ `swipe` only
	 *   startedY   : {number} the starting Y position of the gesture                     /!\ `swipe` only
	 *   directions : {object} contains 'left' 'right' 'up' and 'down' as boolean         /!\ `swipe` only
	 *
	 * Wrappers infos:
	 *   cocoonjs : http://wiki.ludei.com/cocoonjs:featurelist
	 *   ejecta   : http://impactjs.com/ejecta/supported-apis-methods
	 *
	 * Development infos:
	 *   http://www.html5rocks.com/en/mobile/touch/
	 *   http://www.sitepen.com/blog/2011/12/07/touching-and-gesturing-on-iphone-android-and-more/
	 *   https://github.com/EightMedia/hammer.js/blob/master/dist/hammer.js
	 *
	 * TODO:
	 *   implement touchCancel?
	 *   implement off method, to remove a listener
	 *   there is a lot of things emitted by default that are not necessarily required -> add options to disable some?
	 *   remove the multiple hasOwnProperty ?
	 *
	 */

	var Gestures = function (target) {
		
		var that = this;
		
		// ----------------------------------------------------------
		// Constants zone, exposed on the object (= customizable)
		// ----------------------------------------------------------
		
		that.TAP_MAX_TOUCHTIME  = 250;
		that.TAP_MAX_DISTANCE   = 10;
		that.TAP_ALWAYS         = false;
		that.DOUBLETAP_DISTANCE = 20;
		that.DOUBLETAP_INTERVAL = 300;
		
		that.HOLD_TIMEOUT       = 500;
		that.HOLD_MAX_DISTANCE  = 10;

		that.SWIPE_MAX_DELAY    = 400;
		that.SWIPE_MIN_DISTANCE = 50;

		// ----------------------------------------------------------
		// Mouse to Touch emulation, listener target enforcement
		// ----------------------------------------------------------
		
		var touchDevice = false;
		var mouseTouchInProgress = false;
		
		if (window.force.modules.environment.isEjecta()) {
			// if we are in Ejecta, enforce the fact that event target is document
			target = document;
			touchDevice = true;
		}
		else if (window.force.modules.environment.isCocoonJs()) {
			// we are in cocoonjs.. TODO: should check if target is really a canvas object
			touchDevice = true;
		}
		else if (!('ontouchstart' in window)){
			// there is no touch event available, let's map mouse events on touch events
			window.document.addEventListener('mousedown', function(e){
				mouseTouchInProgress = true;
				convertMouseEventToTouch('touchstart', e);
				// this prevent default blocks interaction with DOM elements that are over the canvas, but do we really need it?
				// let's try a while without...
				//if (e.preventDefault) { e.preventDefault(); } else { e.returnValue = false; }
				return false;
			});
			window.document.addEventListener('mouseup', function(e){
				mouseTouchInProgress = false;
				convertMouseEventToTouch('touchend', e);
				// this prevent default blocks interaction with DOM elements that are over the canvas, but do we really need it?
				// let's try a while without...
				//if (e.preventDefault) { e.preventDefault(); } else { e.returnValue = false; }
				return false;
			});
			window.document.addEventListener('mousemove', function(e){
				if(!mouseTouchInProgress) {
					return;
				}
				convertMouseEventToTouch('touchmove', e);
				// this prevent default blocks interaction with DOM elements that are over the canvas, but do we really need it?
				// let's try a while without...
				//if (e.preventDefault) { e.preventDefault(); } else { e.returnValue = false; }
				return false;
			});
		}

		// ----------------------------------------------------------
		// Variables zone
		// ----------------------------------------------------------

		var knownTouches = {};        // the list of the currently known touches on the screen
		var systemTouches = null;     // system list of the touches on the screen
		var previousDetection = null; // for double tap detection

		// ----------------------------------------------------------
		// Helper
		// ----------------------------------------------------------
		
		// To remap on a fresh new touch object the informations we previously assigned to it and stored in knownTouches
		// rq: on iOS this is not needed because the touch objects provided in events are the same instances as the previously provided
		//     in previous touch events, so the sub-properties are still here. But that's not true on all devices:
		//     sometimes, even if an identifier of a touch object is the same as a previously provided one, the object itself
		//     is a new one and we don't have anymore our attached properties, so we need to run this function.
		function updateUid(touch) {
			if (knownTouches[touch.identifier]) {
				touch.force = knownTouches[touch.identifier].force;
			}
		}
		
		// Be careful, this is "by identifier", not by uid, so it's working only if it's called while the touch is still on the screen
		this.addForceInfoToTouchByIdentifier = function (infoKey, infoValue, identifier) {
			if (knownTouches[identifier]) {
				knownTouches[identifier].force[infoKey] = infoValue;
			}
		}
		
		// ----------------------------------------------------------
		// To retrieve all the touches on the screen
		// ----------------------------------------------------------

		// All the touches detected by this module
		this.getAllTouches = function () {
			return knownTouches;
		};

		// To retrieve all the touches on the screen, according to the system
		this.getAllSystemTouch = function () {
			return systemTouches;
		};

		// ----------------------------------------------------------
		// Touch start
		// ----------------------------------------------------------

		function touchStart(event) {
			systemTouches = event.touches;
			
			var now = Date.now();
			
			// let's loop through all the touches started
			for (var i = 0, len = event.changedTouches.length; i < len; i++) {
				var touch = event.changedTouches[i];
				
				// we attach the force specific information to the provided touch object
				touch.force              = {};
				touch.force.uid          = window.force.modules.helpers.getNewUid(); // to be able to identify uniquely this touch in the app lifespan
				touch.force.pageXstart   = touch.pageX;
				touch.force.pageYstart   = touch.pageY;
				touch.force.started      = now;
				touch.force._prevX       = touch.pageX;
				touch.force._prevY       = touch.pageY;
				touch.force._holdTimer   = setTimeout(holdDetect, that.HOLD_TIMEOUT); // setting up a hold detection
				touch.force._holdDetect  = true;
				touch.force._processedId = null;

				// let's store our slightly modified touch object in knownTouches
				knownTouches[touch.identifier] = touch;

				// emit the touch start
				var touchStartEmit = {
					type    : 'touchStart',
					touches : [touch],
					centerX : touch.pageX,
					centerY : touch.pageY,
					started : now,
					event   : event
				};
				trigger(touchStartEmit);
			}
			
			// to avoid default browser behaviors (zooms, scrolls..)
			if (event.preventDefault) { event.preventDefault(); } else { event.returnValue = false; }
			return false;
		}
		
		// ----------------------------------------------------------
		// Hold detection
		// ----------------------------------------------------------
		
		// Everytime a touch start (see above) this function is called with a timeout
		function holdDetect() {
			// we scan all the known touches
			for (var touchId in knownTouches) {
				if (knownTouches.hasOwnProperty(touchId)) { // TODO: really needed ?
					var touch = knownTouches[touchId];
					// if this touch still require hold detection
					if (touch.force._holdDetect) {
						touch.force._holdDetect = false;
						var now = Date.now();
						// is this `-100` safe enough ?..
						// the problem is that this function is triggered by a timeout after HOLD_TIMEOUT ms
						// so if we test inside this function if this time have really been elapsed
						// we may have (and in fact we have) problems where the timer is not precise enough
						// and report `false`. For the moment a reduction of 100 seems enough
						if (now - touch.force.started >= (that.HOLD_TIMEOUT - 100)) {
							var holdEmit = {
								type    : 'hold',
								touches : [touch],
								centerX : touch.pageX,
								centerY : touch.pageY,
								started : touch.force.started,
								ended   : now
							};
							trigger(holdEmit);
						}
					}
				}
			}
		};
		
		// ----------------------------------------------------------
		// Touch move
		// ----------------------------------------------------------
		
		function touchMove(event) {
			systemTouches = event.touches;
			
			var klen = (Object.keys(knownTouches)).length; // KnownTouches LENgth
			
			// let's loop through all the touches moved
			for (var i = 0, len = event.changedTouches.length; i < len; i++) {
				var touch = event.changedTouches[i];    // instance of the new touch
				var t = knownTouches[touch.identifier]; // instance of the stored matching touch
				
				if (klen > 1) {
					// if there is more than one touch on the screen, we cancel the hold detection of this touch
					t.force._holdDetect = false;
					clearTimeout(t.force._holdTimer);
				} else {
					// if single touch on the screen, we cancel hold detection if the touch moved enough distance
					if (t.force._holdDetect) {
						if(distanceBetweenCoords(t.force.pageXstart, t.force.pageYstart, touch.pageX, touch.pageY) > that.HOLD_MAX_DISTANCE) {
							t.force._holdDetect = false;
							clearTimeout(t.force._holdTimer);
						}
					}
				}

				// emit the touchMove
				var touchMoveEmit = {
					type    : 'touchMove',
					touches : [touch],
					centerX : touch.pageX,
					centerY : touch.pageY,
					started : Date.now(),
					event   : event,
					deltaX  : touch.pageX - t.force._prevX,
					deltaY  : touch.pageY - t.force._prevY
				};
				trigger(touchMoveEmit);
			}
			
			
			// pinch/rotation detection
			if (klen >= 2) {
				// this is an overkill `more than one touch at a time pinch / rotation` implementation
				// let's calculate first the distance beween all starting points
				var n = 0;
				var newDist = 0, oldDist = 0;
				var deltaX = 0, deltaY = 0;
				var deltaAngle = 0;
				var touchList = [];
				var started = Infinity;
				var gravityCenterX = 0, gravityCenterY = 0;
				
				var processId = Date.now();
				
				// we scan all the know touches a first time, and we are going to match them with all other touches (second loop)
				for (var t1 in knownTouches) {
					var touch1 = knownTouches[t1];
					if (knownTouches.hasOwnProperty(t1)) { // TODO: maybe to remove
						touch1.force._processedId = processId; // to avoid processing 2 times the same touch in the second loop
						touchList.push(touch1);
						if (touch1.force.started < started) { // the rotoPinch gesture start from the earlier touch start
							started = touch1.force.started;
						}
						// the center coordinate is going to be the average position of all points
						gravityCenterX += touch1.pageX;
						gravityCenterY += touch1.pageY;
						
						// the translation amount also will be an average of all the touches translation
						deltaX += touch1.pageX - touch1.force._prevX;
						deltaY += touch1.pageY - touch1.force._prevY;
						
						// we rescan the known touches to match with the first one
						for (var t2 in knownTouches) {
							var touch2 = knownTouches[t2];
							if (knownTouches.hasOwnProperty(t2)) { // TODO: maybe to remove
								if(touch2.force._processedId !== processId) { // to avoid processing 2 times the same pairs
									n++;
									
									// distance for scale
									newDist += distanceBetweenTouches(touch1, touch2);
									oldDist += distanceBetweenCoords(touch1.force._prevX, touch1.force._prevY, touch2.force._prevX, touch2.force._prevY);
									
									// angle for rotation
									var newAngle = angleBetweenTouches(touch1, touch2);
									var oldAngle = angleBetweenCoords(touch1.force._prevX, touch1.force._prevY, touch2.force._prevX, touch2.force._prevY);
									
									var da = newAngle - oldAngle;

									while (da < -180) {
										da += 360;
									}
									while (da > 180) {
										da -= 360;
									}
									
									deltaAngle += da;
								}
							}
						}
					}
				}
				
				newDist = newDist / n;
				oldDist = oldDist / n;
				
				deltaAngle = deltaAngle / n;
				
				gravityCenterX = gravityCenterX / klen;
				gravityCenterY = gravityCenterY / klen;
				
				deltaX = deltaX / klen;
				deltaY = deltaY / klen;
				
				var deltaScale = newDist / oldDist;
				var rotation = newAngle - oldAngle;
				
				// rotoPinch emit
				var rotoPinchEmit = {
					type       : 'rotoPinch',
					touches    : touchList,
					centerX    : gravityCenterX,
					centerY    : gravityCenterY,
					started    : started,
					event      : event,
					deltaScale : deltaScale,
					deltaAngle : deltaAngle,
					deltaX     : deltaX,
					deltaY     : deltaY
				};
				trigger(rotoPinchEmit);
			}
			
			// let's update all the previous values
			for (var i = 0, len = event.changedTouches.length; i < len; i++) {
				var touch = event.changedTouches[i];
				if (knownTouches[touch.identifier]) {
					knownTouches[touch.identifier].force._prevX = touch.pageX;
					knownTouches[touch.identifier].force._prevY = touch.pageY;
				}
			}
			
			// to avoid default browser behaviors (zooms, scrolls..)
			if (event.preventDefault) { event.preventDefault(); } else { event.returnValue = false; }
			return false;
		}
		
		// ----------------------------------------------------------
		// Touch end
		// ----------------------------------------------------------
		
		function touchEnd(event) {
			systemTouches = event.touches;
			
			// let's loop through all the touches ended
			for (var i = 0, len = event.changedTouches.length; i < len; i++) {
				var touch = event.changedTouches[i];
				// if we have this touch stored (how could it not be?)
				if (knownTouches[touch.identifier]) {
					
					var now = Date.now();
					
					var t = knownTouches[touch.identifier];
					
					// ---------------------------------------
					// TAP/DOUBLE TAP detection
					// ---------------------------------------
					
					// if the distance beween start and end is not too high, and the time spent on the screen was not too long..
					if (distanceBetweenCoords(touch.pageX, touch.pageY, t.force.pageXstart, t.force.pageYstart) <= that.TAP_MAX_DISTANCE) {
						if (now - t.force.started <= that.TAP_MAX_TOUCHTIME) {
							//.. it is a tap
							var tapEmit = {
								type    : 'tap',
								touches : [touch],
								centerX : touch.pageX,
								centerY : touch.pageY,
								started : t.force.started,
								ended   : now,
								event   : event
							};
							
							// if we got a tap previously and the time between the 2 tap is not too long..
							var doubletapEmit = null;
							if (previousDetection && previousDetection.type == 'tap') {
								if (distanceBetweenCoords(touch.pageX, touch.pageY, previousDetection.centerX, previousDetection.centerY) <= that.DOUBLETAP_DISTANCE) {
									if (now - previousDetection.ended <= that.DOUBLETAP_INTERVAL) {
										// .. it is a double tap
										doubletapEmit = {
											type    : 'doubletap',
											touches : [touch],
											centerX : touch.pageX,
											centerY : touch.pageY,
											started : t.force.started,
											ended   : now,
											event   : event
										};
									}
								}
							}
							
							// if we want to emit 'tap' on the double tap also
							if (!doubletapEmit || that.TAP_ALWAYS) {
								// emit tap
								trigger(tapEmit);
							}
							if (doubletapEmit) {
								// emit double tap
								trigger(doubletapEmit);
							}
						}
					}

					// emit touch end
					var touchEndEmit = {
						type    : 'touchEnd',
						touches : [touch],
						centerX : touch.pageX,
						centerY : touch.pageY,
						started : now,
						event   : event
					};
					trigger(touchEndEmit);
					
					// ---------------------------------------
					// SWIPE detection
					// ---------------------------------------

					var timeElapsed = now - t.force.started;
					var distanceW   = touch.pageX - t.force.pageXstart;
					var distanceH   = touch.pageY - t.force.pageYstart;
					if (timeElapsed <= that.SWIPE_MAX_DELAY && (Math.abs(distanceW) >= that.SWIPE_MIN_DISTANCE || Math.abs(distanceH) >= that.SWIPE_MIN_DISTANCE)) {
						var directions = {
							left  : false,
							right : false,
							up    : false,
							down  : false
						};
						if (distanceW < -that.SWIPE_MIN_DISTANCE) {
							directions.left = true;
						} else if (distanceW > that.SWIPE_MIN_DISTANCE) {
							directions.right = true;
						}
						if (distanceH < -that.SWIPE_MIN_DISTANCE) {
							directions.up = true;
						} else if (distanceH > that.SWIPE_MIN_DISTANCE) {
							directions.down = true;
						}
						
						var swipeEmit = {
							type       : 'swipe',
							touches    : [touch],
							centerX    : (touch.pageX + t.force.pageXstart) / 2,
							centerY    : (touch.pageY + t.force.pageYstart) / 2,
							startedX   : t.force.pageXstart,
							startedY   : t.force.pageYstart,
							started    : now,
							event      : event,
							directions : directions
						};
						trigger(swipeEmit);
					}
					
					// ---------------------------------------
					// Remove the touch
					// ---------------------------------------
					if (t.force._holdDetect) {
						t.force._holdDetect = false;
						clearTimeout(t.force._holdTimer);
					}
					delete knownTouches[touch.identifier];
					
				}
			}
			
			// to avoid default browser behaviors (zooms, scrolls..)
			if (event.preventDefault) { event.preventDefault(); } else { event.returnValue = false; }
			return false;
		}

		// ----------------------------------------------------------
		// Listeners registration
		// ----------------------------------------------------------
		
		target.addEventListener('touchstart', touchStart, false);
		target.addEventListener('touchmove', touchMove, false);
		target.addEventListener('touchend', touchEnd, false);

		// ----------------------------------------------------------
		// App `listeners` registration / unregistration
		// ----------------------------------------------------------

		var register = {};

		this.on = function (eventType, fn) {
			if (!register[eventType]) {
				register[eventType] = [];
			}
			register[eventType].push(fn);
		};
		
		this.off = function (eventType, fn) {
			// TODO
		};
		
		// ----------------------------------------------------------
		// App `listeners` trigger
		// ----------------------------------------------------------
		
		function trigger(event) {
			// for the double tap detection
			if (event.type !== 'touchStart' && event.type !== 'touchMove' && event.type !== 'touchEnd') {
				previousDetection = event;
			}
			
			// if there is no function registered for this type of gesture, we just return
			if (!register[event.type]) {
				return;
			}
			
			// see the comment above updateUid() function
			for (var i = 0, len = event.touches.length; i < len; i++) {
				if (!event.touches[i].force) {
					updateUid(event.touches[i]);
				}
			}
			
			// let's call all the registered functions
			for (var i = 0, len = register[event.type].length; i < len; i++) {
				register[event.type][i](event);
			}
		}
		
		// ----------------------------------------------------------
		// Reset, because sometimes some touches may be fucked up,
		//   particularly when dealing with webviews over the screen
		//   or system alert popups
		// ----------------------------------------------------------
		
		this.resetAll = function() {
			knownTouches = {};
			systemTouches = null;
			previousDetection = null;
		};
	};
	
	// ----------------------------------------------------------
	// Helpers
	// ----------------------------------------------------------
	
	// mapping touch events on mouse if there is no touch events implemented on the device
	function convertMouseEventToTouch(touchEventType, originalEvent) {
		var event;
		if (document.createEvent) {
			event = document.createEvent('HTMLEvents');
			event.initEvent(touchEventType, true, true);
		} else {
			event = document.createEventObject();
			event.eventType = touchEventType;
		}
		event.changedTouches = [{pageX: originalEvent.pageX, pageY: originalEvent.pageY}];
		if (document.createEvent) {
			document.getElementById('canvas').dispatchEvent(event);
		} else {
			document.getElementById('canvas').fireEvent('on' + event.eventType, event);
		}
	}
	
	function distanceBetweenTouches(t1, t2) {
		return Math.sqrt(Math.pow(t1.pageX - t2.pageX, 2) + Math.pow(t1.pageY - t2.pageY, 2));
	}
	
	function distanceBetweenCoords(x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	}
	
	function angleBetweenTouches(t1, t2) {
		var y = t2.pageY - t1.pageY;
		var x = t2.pageX - t1.pageX;
		return Math.atan2(y, x) * 180 / Math.PI;
	}
	
	function angleBetweenCoords(x1, y1, x2, y2) {
		var y = y2 - y1;
		var x = x2 - x1;
		return Math.atan2(y, x) * 180 / Math.PI;
	}
	
	
	// expose module
	window.force.expose('window.force.modules.Gestures', Gestures);
})();