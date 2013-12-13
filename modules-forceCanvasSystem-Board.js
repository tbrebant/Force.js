/**
 * window.force.modules.forceCanvasSystem.Board()
 */

(function() {
	
	var INHERIT_FROM = window.force.modules.forceCanvasSystem.Graphical;
	
	var Board = function(params) {
		params = init.call(this, params);
		INHERIT_FROM.call(this, params);
		setup.call(this, params);
	};

	window.force.inherit(Board, INHERIT_FROM);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------

	var or = window.force.modules.helpers.or;

	function init(params) {
		return params || {};
	}

	function setup(params) {

		this.boardAllowScale     = or(params.boardAllowScale     , true);
		this.boardAllowRotate    = or(params.boardAllowRotate    , true);
		this.boardAllowTranslate = or(params.boardAllowTranslate , true);
		this.boardMinScale       = or(params.boardMinScale       , null);
		this.boardMaxScale       = or(params.boardMaxScale       , null);

		this._dragInProgress = false;
		this._rotoPinchInProgress = false;
		
		this._gestureManager = null; // will be initialised with the instance of the root object when it will be required
		
		this.on('touchStart', this.touchStart);
		this.on('touchMove', this.touchMove);
		this.on('touchEnd', this.touchEnd);
		this.on('rotoPinch', this.rotoPinch);
	}
	
	Board.prototype.touchStart = function(evt) {
		if (this.isXyInside(evt.centerX, evt.centerY)) {
			// if a drag is not already in progress
			if (!this._dragInProgress) {
				this._dragInProgress = evt.touches[0].force.uid;
			}

			// get the center of all fingers on the screen to set the center of rotations and scales to it
			if (evt.event.touches) { // small error protection for desktop browser with no touches array
				var centerX = 0, centerY = 0, len = evt.event.touches.length;
				for (var i = 0; i < len; i++) {
					centerX += evt.event.touches[i].pageX;
					centerY += evt.event.touches[i].pageY;
				}
				centerX = centerX / len;
				centerY = centerY / len;
				// we move the center of rotation / scale
				var local = this.wordToLocal(centerX, centerY);
				this.moveRotScaleAnchor(1 / this.w * local[0], 1 / this.h * local[1]);
			}
			return {stopPropagation: true};
		}
	};
	
	Board.prototype.touchMove = function(evt) {
		if (evt.event.touches && evt.event.touches.length > 1) { // the regular touch move works only if there is only one finger on the screen
			return;
		}
		if (evt.touches[0].force.uid === this._dragInProgress) {
			if (this.boardAllowTranslate) {
				this._translateBy(evt.deltaX, evt.deltaY);
			}
			return {stopPropagation: true};
		}
	};
	
	Board.prototype.touchEnd = function(evt) {
		if (evt.touches[0].force.uid === this._dragInProgress) {
			this._dragInProgress = null;
		}
		// if a roto pich was in progress and there is no more touches on the screen
		if (this._rotoPinchInProgress && evt.event.touches.length == 0) {
			this._rotoPinchInProgress = null;
		}
	};
	
	Board.prototype.rotoPinch = function(evt) {
		this._rotoPinchInProgress = true;
		this._dragInProgress = null;
		
		if (this.isXyInside(evt.centerX, evt.centerY)) {
			var evtTouchesLen = evt.touches.length;
			
			// check if one the touch is reserved to another component, and if it is, return without doing anything
			for (var i = 0; i < evtTouchesLen; i++) {
				if (evt.touches[i].force.reserved && evt.touches[i].force.reserved !== this.uid) {
					return;
				}
			}

			// TODO: do something about the jumps in rotation and translate when touches are too near (attenuation de bruits)

			// min/max to avoid suddenly big zoom/dezoom when touches are very near
			if (this.boardAllowScale) {
				var newScale = this.scale * Math.min(1.1, Math.max(0.9, evt.deltaScale));
				if ((this.boardMinScale === null || newScale >= this.boardMinScale) && (this.boardMaxScale === null || newScale <= this.boardMaxScale)) {
					this.scale = newScale;
				}
			}
			if (this.boardAllowRotate) {
				this.angle += evt.deltaAngle;
			}
			if (this.boardAllowTranslate) {
				this._translateBy(evt.deltaX, evt.deltaY);
			}

			// if we never retrieved an instance of the current gesture manager, we do
			if (!this._gestureManager) {
				this._gestureManager = this.getRootForceCanvasSystemElement().gesturesManager;
			}

			// we mark this touch events as reserved, so other behaviors testing for this value (like other Boards' rotoPinch)
			//   will not try to do anything, considering these touches are reserved
			for (var i = 0; i < evtTouchesLen; i++) {
				this._gestureManager.addForceInfoToTouchByIdentifier('reserved', this.uid, evt.touches[i].identifier);
			}
			
			return {stopPropagation: true};
		}
	};
	
	Board.prototype._translateBy = function(x, y) {
		if (this.parent && this.parent.worldVectorToLocal) {
			// convert the mouse world delta into parent's coordinates delta
			var t = this.parent.worldVectorToLocal(x, y);
			this.x += t[0];
			this.y += t[1];
		} else {
			this.x += x;
			this.y += y;
		}
	}

	Board.prototype.resetTouches = function() {
		this._dragInProgress = false;
		this._rotoPinchInProgress = false;
	};

	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.Board', Board);
	
})();