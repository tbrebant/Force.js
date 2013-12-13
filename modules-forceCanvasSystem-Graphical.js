/**
 * window.force.modules.forceCanvasSystem.Graphical()
 */

/**
 * TODO
 *   the _on should not be triggered only if one touch of the gesture is in the object,
 *   but also if a previous gesture started on this object is still going on
 */

(function() {

	var INHERIT_FROM = window.force.modules.forceCanvasSystem.Core;

	var Graphical = function(params) {
		init.call(this, params);
		INHERIT_FROM.call(this, params);
		setup.call(this);
	};

	window.force.inherit(Graphical, INHERIT_FROM);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		var or = window.force.modules.helpers.or;
		params = params || {};
		
		this.x                       = or(params.x                       , 0);
		this.y                       = or(params.y                       , 0);
		this.w                       = or(params.w                       , 100);
		this.h                       = or(params.h                       , 100);
		this.anchor                  = or(params.anchor                  , [0.5, 0.5]); // shortcut to set position and roto scale anchors in one go
		this.posAnchor               = or(params.posAnchor               , [this.anchor[0], this.anchor[1]]); // position anchor: 0 for top/left, 0.5 for center, 1 for bottom/right
		this.rotScaleAnchor          = or(params.rotScaleAnchor          , [this.posAnchor[0], this.posAnchor[1]]); // rotation and scale anchor
		this.asset                   = or(params.asset                   , null);
		this.opacity                 = or(params.opacity                 , 1);
		this.bgColor                 = or(params.bgColor                 , null);
		this.caption                 = or(params.caption                 , null);
		this.fontColor               = or(params.fontColor               , '#000');
		this.fontSize                = or(params.fontSize                , 20);
		this.fontFamily              = or(params.fontFamily              , 'arial');
		this.textAlign               = or(params.textAlign               , 'center'); // 'center' || 'left' || 'right'
		this.textBaseline            = or(params.textBaseline            , 'middle'); // 'middle' || 'top' || 'bottom'
		this.textX                   = or(params.textX                   , 0.5); // 0~1
		this.textY                   = or(params.textY                   , 0.5); // 0~1
		this.angle                   = or(params.angle                   , 0); // 0~360
		this.scale                   = or(params.scale                   , 1); // 1 = 100%, accept both number or array like [1, 1] (for width and height)
		this.boundingBox             = or(params.boundingBox             ,[0, 0, 1, 1]); // xfrom, yfrom, xto, yto in percentage (0~1), for touch detection
		this.borderSize              = or(params.borderSize              , 0);
		this.borderColor             = or(params.borderColor             , 'black');
		this.roundMatrix             = or(params.roundMatrix             , false); // ?
		this.isXyInsideBubbling      = or(params.isXyInsideBubbling      , false); // should this component also check his parent's isXyInside when checking isXyInside for itself?
		this.skipChildsIfNotInScreen = or(params.skipChildsIfNotInScreen , false); // if this graphical element is not in the screen, should we skip all his childs also?
		this.disableIfNotInScreen    = or(params.disableIfNotInScreen    , true);  // if this graphical element is not in the screen we consider it as disabled (and events are not propagated to childs)
		this.drawChildsBeforeSelf    = or(params.drawChildsBeforeSelf    , false);  // there is some rare cases where we want to draw self over childs (like overlays)
		
		this.localVectorMask         = or(params.localVectorMask         , null);  // function drawing a vector mask, cf. http://blog.teamtreehouse.com/create-vector-masks-using-the-html5-canvas
		                                                                           // local, meaning if the object is moving, the mask is moving with
		                                                                           // for example: function (ctx) { ctx.moveTo(50, 0); ctx.lineTo(100, 0); ctx.lineTo(100, 50); ctx.lineTo(50, 50); }

		this.parentVectorMask        = or(params.parentVectorMask        , null);  // function drawing a vector mask, cf. http://blog.teamtreehouse.com/create-vector-masks-using-the-html5-canvas
		                                                                           // parent, meaning if the object is moving, the mask is not moving, it look attached to the parent
		                                                                           // for example: function (ctx) { ctx.moveTo(50, 0); ctx.lineTo(100, 0); ctx.lineTo(100, 50); ctx.lineTo(50, 50); }
		
		// local internals
		this._transform            = new Transform();
		this._isXyInsideConditions = null;
		this._maskCanvas           = null;
	}

	function setup() {
		this.addAnIsEnabledCondition(function(that) {
			return (!that.disableIfNotInScreen || that._isInTheScreen !== false);
		});
	}

	// ------------------------------------------
	// Draw
	// This method CAN be overrided as much as you want for specific custom rendering
	// This method is automatically called by update at the right moment
	// ------------------------------------------

	Graphical.prototype.draw = function (ctx) {
		if (this._isInTheScreen === false) {
			return false;
		}
		
		// draw background
		if (this.bgColor) {
			ctx.fillStyle = this.bgColor;
			ctx.fillRect(0, 0, this.w, this.h);
		}
		
		// draw asset if any, and if in the screen
		if (this.asset) {
			if (!this.asset.isAtlasMap) {
				ctx.drawImage(this.asset, 0, 0, this.asset.width, this.asset.height, 0, 0, this.w, this.h);
			} else {
				ctx.drawImage(this.asset.asset(), this.asset.srcX, this.asset.srcY, this.asset.w, this.asset.h, 0, 0, this.w, this.h);
			}
		}
		
		// draw text if any
		if (this.caption) {
			this.drawCaption(ctx);
		}
		
		// draw border if any
		if (this.borderSize > 0) {
			this.drawBorder(ctx);
		}
		
		return true;
	};
	
	Graphical.prototype.drawBorder = function (ctx) {
		if (this.borderSize > 0) {
			var w = this.w, h = this.h, bs = this.borderSize, s = bs / 2;
			
			ctx.strokeStyle = this.borderColor;
			ctx.lineWidth = bs;
			ctx.beginPath();

			// border inside, ususally the first logic works well in regular browsers, but in CocoonJs the overlapping areas are color doubled
			// so we have to make a bit more calculations to avoid any overlapping
			if (!window.force.modules.environment.isCocoonJs()) {
				ctx.moveTo(0, s);
				ctx.lineTo(w, s);
				ctx.moveTo(w - s, 0);
				ctx.lineTo(w - s, h);
				ctx.moveTo(w, h - s);
				ctx.lineTo(0, h - s);
				ctx.moveTo(s, h);
				ctx.lineTo(s, 0);
			} else {
				ctx.moveTo(bs, s);
				ctx.lineTo(w, s);
				ctx.moveTo(w - s, bs);
				ctx.lineTo(w - s, h);
				ctx.moveTo(w - bs, h - s);
				ctx.lineTo(0, h - s);
				ctx.moveTo(s, h - bs);
				ctx.lineTo(s, 0);
			}
			ctx.stroke();
		}
	};

	// determine in a simple way if the current graphical is not outside of the physical screen
	// but this is slightly expensive, and looks like the wrappres are already checking before drawing
	Graphical.prototype.isInTheScreen = function() {
		
		// o.O removing the following test improve the performance by + 6 frames per seconds !! (O.O)
		//if (!window.force || !window.force.modules || !window.force.modules.screen) {
		//	console.warn('Graphical.prototype.isInTheScreen > window.force.modules.screen is not available');
		//	return true;
		//}
		
		var screen = window.force.modules.screen;
		var availableWidth = screen.availableWidth;
		var availableHeight = screen.availableHeight;
		
		var fourCorners = [
			this.localToWorld(0      , 0),
			this.localToWorld(this.w , 0),
			this.localToWorld(this.w , this.h),
			this.localToWorld(0      , this.h)
		];

		if (fourCorners[0][0] < 0 && fourCorners[1][0] < 0 && fourCorners[2][0] < 0 && fourCorners[3][0] < 0) {
			return false;
		}
		if (fourCorners[0][0] > availableWidth && fourCorners[1][0] > availableWidth && fourCorners[2][0] > availableWidth && fourCorners[3][0] > availableWidth) {
			return false;
		}
		if (fourCorners[0][1] < 0 && fourCorners[1][1] < 0 && fourCorners[2][1] < 0 && fourCorners[3][1] < 0) {
			return false;
		}
		if (fourCorners[0][1] > availableHeight && fourCorners[1][1] > availableHeight && fourCorners[2][1] > availableHeight && fourCorners[3][1] > availableHeight) {
			return false;
		}
		
		return true;
	};

	// ------------------------------------------
	// Update
	// This method should NOT be overrided in most of the cases
	// TODO: add an underscore prefix: _update
	// ------------------------------------------

	Graphical.prototype.update = function (context) {

		var transform = this._transform;
		var matrix = transform.m;

		// update transformations (previously in a method called processTransform)
		if (matrix[0] !== 1 || matrix[1] !== 0 || matrix[2] !== 0 || matrix[3] !== 1 || matrix[4] !== 0 || matrix[5] !== 0) {
			transform.reset();
		}
		if(this.parent && this.parent._transform) {
			transform.multiply(this.parent._transform);
		}
		var translateX = this.x + (this.w * this.rotScaleAnchor[0]) - (this.w * this.posAnchor[0]);
		var translateY = this.y + (this.h * this.rotScaleAnchor[1]) - (this.h * this.posAnchor[1]);
		if (translateX !== 0 || translateY !== 0) {
			transform.translate(translateX, translateY);
		}
		if (this.angle !== 0) {
			transform.rotate(this.angle);
		}

		var scaleX, scaleY;
		if (typeof this.scale === 'number') {
			scaleX = scaleY = this.scale;
		} else {
			scaleX = this.scale[0];
			scaleY = this.scale[1];
		}
		if (scaleX !== 1 || scaleY !== 1) {
			transform.scale(scaleX, scaleY);
		}

		if (translateX !== 0 || translateY !== 0) {
			transform.translate(-(this.w * this.rotScaleAnchor[0]), -(this.h * this.rotScaleAnchor[1]));
		}
		this._isInTheScreen = this.isInTheScreen();

		// to avoid processing stuff not in the screen if not reauired
		if (this.skipChildsIfNotInScreen && this._isInTheScreen === false) {
			return;
		}

		// save the current world transformations and state
		context.save();
		
		// apply local world transformations and vector mask (previously in method "aroundTheDraw")
		if (this.parentVectorMask) {
			context.beginPath();
			this.parentVectorMask.call(this, context);
			context.clip();
		}
		if (this.opacity !== 1) {
			context.globalAlpha = context.globalAlpha * this.opacity;
		}
		context.setTransform(
			matrix[0],
			matrix[1],
			matrix[2],
			matrix[3],
			this.roundMatrix ? Math.round(matrix[4]): matrix[4],
			this.roundMatrix ? Math.round(matrix[5]): matrix[5]
		);
		if (this.localVectorMask) {
			context.beginPath();
			this.localVectorMask.call(this, context);
			context.clip();
		}

		if (!this.drawChildsBeforeSelf) {
			// draw self
			this.draw(context);
	
			// draw childs
			INHERIT_FROM.prototype.update.call(this, context);
		} else {
			// draw childs
			INHERIT_FROM.prototype.update.call(this, context);
			
			// draw self
			this.draw(context);
		}
		
		// restore previous world transformations and state
		context.restore();
	};

	Graphical.prototype.drawCaption = function(ctx) {
		if (this.caption && this.caption != '') {
			ctx.font = this.fontSize + 'px ' + this.fontFamily;
			ctx.textAlign = this.textAlign;
			ctx.textBaseline = this.textBaseline;
			ctx.fillStyle = this.fontColor;
			var x = 0, y = 0;
			if (this.w) {
				x += this.w * this.textX;
			} else if (this.asset) {
				x += this.asset.width * this.textX;
			}
			if (this.h) {
				y += this.h * this.textY;
			} else if (this.asset) {
				y += this.asset.height * this.textY;
			}
			ctx.fillText(this.caption, Math.round(x), Math.round(y));
		}
	}
	
	// world point to local
	Graphical.prototype.wordToLocal = function(x, y) {
		return this._transform.worldToLocal(x, y);
	};
	
	// local point to world
	Graphical.prototype.localToWorld = function(x, y) {
		return this._transform.localToWorld(x, y);
	};
	
	// world vector to local
	Graphical.prototype.worldVectorToLocal = function(x, y) {
		var origin = this.localToWorld(0, 0);
		var vector = this.wordToLocal(origin[0] + x, origin[1] + y);
		return vector;
	};
	
	Graphical.prototype.addIsXyInsideCondition = function(fn) {
		if (typeof fn === 'function') {
			if (!this._isXyInsideConditions) {
				this._isXyInsideConditions = [];
			}
			this._isXyInsideConditions.push(fn);
		}
	};
	
	Graphical.prototype.isXyInside = function(worldX, worldY) {
		var localCoords = this.wordToLocal(worldX, worldY);
		var x = localCoords[0];
		var y = localCoords[1];
		var isInside = (
			x >= (this.w * this.boundingBox[0]) &&
			x <= (this.w * this.boundingBox[2]) &&
			y >= (this.h * this.boundingBox[1]) &&
			y <= (this.h * this.boundingBox[3])
		);
		if (!isInside) {
			return false;
		}
		if (this._isXyInsideConditions) {
			for (var i = 0, len = this._isXyInsideConditions.length; i < len; i++) {
				isInside = this._isXyInsideConditions[i].call(this, worldX, worldY);
				if (!isInside) {
					return false;
				}
			}
		}
		if (this.isXyInsideBubbling && this.parent && this.parent.isXyInside) {
			if (!this.parent.isXyInside(worldX, worldY)) {
				return false;
			}
		}
		return true;
	};
	
	Graphical.prototype.isTouchInside = function(touch) {
		if (this.isXyInside(touch.pageX, touch.pageY)) {
			return true;
		}
		return false;
	}

	// to move the center of rotation/scale without changing the visual position of the object
	Graphical.prototype.moveRotScaleAnchor = function (newX, newY) {
		
		// we retrieve the position of a random point (so 0,0 is fine) from this object in the universe
		// TODO: really not a local to parent instead of local to world ?
		var start = this._transform.localToWorld(0, 0);

		// we set a new transform to perform simulations
		var t = new Transform();
		
		// we do the same calculations as in update()
		// TODO: avoid duplication and merge the code
		t.reset();
		if(this.parent && this.parent._transform) {
			t.multiply(this.parent._transform);
		}
		t.translate(this.x + (this.w * newX) - (this.w * this.posAnchor[0]), this.y + (this.h * newY) - (this.h * this.posAnchor[1]));
		t.rotate(this.angle);
		var scaleX, scaleY;
		if (typeof this.scale === 'number') {
			scaleX = scaleY = this.scale;
		} else {
			scaleX = this.scale[0];
			scaleY = this.scale[1];
		}
		t.scale(scaleX, scaleY);
		t.translate(-(this.w * newX), -(this.h * newY));
		
		// we calculate the new position our random point will have after the change
		var end = t.localToWorld(0, 0);
		
		// to deduce the delta we have to move the object to visually match the previous position
		var delta = [start[0] - end[0], start[1] - end[1]];
		
		// transform the delta into parent object vector
		if (this.parent && this.parent.worldVectorToLocal) {
			delta = this.parent.worldVectorToLocal(delta[0], delta[1]);
		}
		
		// we apply the changes: new rotation/scale point and translation fix
		this.rotScaleAnchor = [newX, newY];
		this.x += delta[0];
		this.y += delta[1];
	};
		

	// delete asset and free memory
	// TODO: implement custom native wrapper functions allowing to free the memory faster or to force the garbage collector
	Graphical.prototype.clearAsset = function() {
		if (this.asset) {
			this.asset = null;
		}
	}

	// extend prepareDestroy
	Graphical.prototype.prepareDestroy = function() {
		INHERIT_FROM.prototype.prepareDestroy.call(this);
		this.clearAsset();
		if (this._maskCanvas) {
			this._maskCanvas = null;
		}
		this._transform = null;
		this._isXyInsideConditions = null;
	};

	// a shortcut to avoid having to load assets externally and doing it from inside the graphical
	// for the time being it supports only independant images but would be great to implement atlasMap also
	// this is for quick prototyping only: in most cases we want to manage assets loading more strictly in the app logic itself
	Graphical.prototype.loadAsset = function (url, cb) {
		this.clearAsset();
		var that = this;
		var img = new Image();
		// TODO: implement error handler also
		// TODO: think about the case where prepareDestroy is called while the image is not loaded yet
		img.onload = function() {
			that.asset = img;
			if (cb) {
				cb();
			}
		}
		img.src = url;
		// TODO: implement a "loading picture or Graphical" ?
	}

	// may be useful, but not used yet:
	// if we want to draw some stuff at the root level of the canvas, without any transformation
	// may be useful for example for pixel perfect calculations
	/*Graphical.prototype.doInRootContext = function (ctx, fn) {
		// reset the context
		ctx.setTransform(1,0,0,1,0,0);
		
		// execute the requested code
		fn.call(this, ctx);
		
		// restore the local context, copy/paste from the update function
		var matrix = this._transform.m;
		ctx.setTransform(
			matrix[0],
			matrix[1],
			matrix[2],
			matrix[3],
			this.roundMatrix ? Math.round(matrix[4]): matrix[4],
			this.roundMatrix ? Math.round(matrix[5]): matrix[5]
		);
	};*/

	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.Graphical', Graphical);
})();