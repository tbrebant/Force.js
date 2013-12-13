/**
 * window.force.modules.forceCanvasSystem.simpleTextSelect()
 */

(function() {
	
	var INHERIT_FROM = window.force.modules.forceCanvasSystem.Graphical;
	
	var simpleTextSelect = function(params) {
		params = init.call(this, params);
		INHERIT_FROM.call(this, params);
		setup.call(this, params);
	};

	window.force.inherit(simpleTextSelect, INHERIT_FROM);
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		var or = window.force.modules.helpers.or;
		params = params || {};
		
		params.w           = or(params.w             , 100);
		params.borderSize  = or(params.borderSize    , 1);
		params.borderColor = or(params.borderColor   , 'black');
		params.bgColor     = or(params.bgColor       , 'white');
		params.fontColor   = or(params.fontColor     , 'black');
		
		this.buttonWidth   = or(params.buttonWidth   , params.w * 0.1);
		this.choices       = or(params.choices       , [{text: 'Choice 1', id: 'choice1'}, {text: 'Choice 2', id: 'choice2'}, {text: 'Choice 3', id: 'choice3'}]);
		this.lineColor     = or(params.lineColor     , [0, 0, 0]); // rgb
		this.btnArrowWidth = or(params.btnArrowWidth , 1);
		
		this.currentChoice = 0;
		
		if (!params.canvasContext) {
			return console.error('modules-forceCanvasSystem-simpleTextSelect requires a canvas context');
		}
		this._context = params.canvasContext;
		delete params.canvasContext;
		
		return params;
	}
	
	function setup(params) {
		var copy = window.force.modules.helpers.copy;
		var that = this;
		var childParams, arrow, asset;

		var uncopiable = {
			parent: params.parent
		};
		if (params.parent) {
			delete params.parent;
		}

		var arrowRatio = (params.arrowAssetReduction !== undefined ? params.arrowAssetReduction : 1);

		childParams = copy(params);
		childParams.name    = 'textField';
		childParams.w       = Math.max(1, params.w - this.buttonWidth * 2);
		childParams.anchor  = [0, 0];
		childParams.x       = this.buttonWidth;
		childParams.y       = 0;
		childParams.caption = this.choices[this.currentChoice].text;
		childParams.parent  = this;
		this.textField      = new window.force.modules.forceCanvasSystem.AdvancedText(childParams);
		this.textField.updateCaption(this._context);
		
		childParams = copy(params);
		childParams.name   = 'leftBtn';
		childParams.w      = this.buttonWidth;
		childParams.anchor = [0, 0];
		childParams.x      = 0;
		childParams.y      = 0;
		childParams.parent = this;
		this.leftBtn       = new window.force.modules.forceCanvasSystem.Graphical(childParams);
		if (params.arrowAssetLeft) {
			asset = params.arrowAssetLeft;
			arrow = new window.force.modules.forceCanvasSystem.Graphical({
				asset: asset,
				w: asset.isAtlasMap ? asset.w * arrowRatio : asset.width * arrowRatio,
				h: asset.isAtlasMap ? asset.h * arrowRatio : asset.height * arrowRatio,
				parent: this.leftBtn,
				x: this.leftBtn.w / 2,
				y: this.leftBtn.h / 2,
				anchor: [0.5, 0.5]
			});
		}

		childParams = copy(params);
		childParams.name   = 'rightBtn';
		childParams.w      = this.buttonWidth;
		childParams.anchor = [0, 0];
		childParams.x      = params.w - this.buttonWidth;
		childParams.y      = 0;
		childParams.parent = this;
		this.rightBtn      = new window.force.modules.forceCanvasSystem.Graphical(childParams);
		if (params.arrowAssetRight) {
			asset = params.arrowAssetRight;
			arrow = new window.force.modules.forceCanvasSystem.Graphical({
				asset: asset,
				w: asset.isAtlasMap ? asset.w * arrowRatio : asset.width * arrowRatio,
				h: asset.isAtlasMap ? asset.h * arrowRatio : asset.height * arrowRatio,
				parent: this.rightBtn,
				x: this.rightBtn.w / 2,
				y: this.rightBtn.h / 2,
				anchor: [0.5, 0.5]
			});
		}

		if (uncopiable.parent) {
			params.parent = uncopiable.parent;
		}
		uncopiable = null;

		this.leftBtn.on('tap', function (evt) {
			if (this.isXyInside(evt.centerX, evt.centerY)) {
				that.currentChoice = (that.currentChoice - 1) % that.choices.length;
				if (that.currentChoice < 0) {
					that.currentChoice += that.choices.length;
				}
				that.updateCaption();
			}
		});

		this.rightBtn.on('tap', function (evt) {
			if (this.isXyInside(evt.centerX, evt.centerY)) {
				that.currentChoice = (that.currentChoice + 1) % that.choices.length;
				that.updateCaption();
			}
		});
		
		// arrows drawing pre calculation
		var arrowheadSpace = 0.3;
		var arrowBase = 0.3;
		var verticalMargin = 0.2;
		
		this._leftx1 = this.leftBtn.w * arrowheadSpace;
		this._leftx2 = this.leftBtn.w * (1 - arrowBase);
		
		this._rightx1 = this.w - this._leftx1;
		this._rightx2 = this.w - this._leftx2;
		
		this._btny1 = this.leftBtn.h * verticalMargin;
		this._btny2 = this.leftBtn.h * 0.5;
		this._btny3 = this.leftBtn.h * (1 - verticalMargin);
		
		// put back bg color to null because the childs are alrady drawing it
		this.bgColor = null;
	}
	
	simpleTextSelect.prototype.updateCaption = function() {
		var txt = this.choices[this.currentChoice].text;
		if (this.choices[this.currentChoice].fontColor) {
			txt = '[color=' + this.choices[this.currentChoice].fontColor + ']' + txt + '[/color]';
		}
		this.textField.updateCaption(this._context, txt);
	};
	
	simpleTextSelect.prototype.getSelected = function() {
		return this.choices[this.currentChoice];
	};
	
	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.simpleTextSelect', simpleTextSelect);
})();