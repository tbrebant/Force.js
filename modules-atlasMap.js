/**
 * window.force.modules.AtlasMap()
 */

/**
 * assetData - can be :
 *       1) the url path to an image
 *       2) the raw urlData of an image
 *       3) a canvas object
 *       4) an image object
 */

(function() {

	var AtlasMap = function (assetData, jsonData, options) {
		var asset, json, assetRaw;
		var that = this;
		this.img = null;
		
		this.setData = function (assetData, jsonData, options) {
			asset = null;
			assetRaw = assetData;
			json = jsonData.frames;
		}
		
		this.setData (assetData, jsonData, options);
		
		function generateVirtualImages () {
			that.img = {};
			for (var imgFileName in json) {
				if (json.hasOwnProperty(imgFileName)) {
					that.img[imgFileName] = {
						width      : json[imgFileName].frame.w,
						height     : json[imgFileName].frame.h,
						w          : json[imgFileName].frame.w,
						h          : json[imgFileName].frame.h,
						srcX       : json[imgFileName].frame.x,
						srcY       : json[imgFileName].frame.y,
						asset      : that.getAsset,
						isAtlasMap : true
					};
				}
			}
		}
		
		this.loadAsset = function (cb) {
			if (typeof assetRaw === 'string') { // it's an url or a rawDataUrl
				asset = new Image();
				asset.onload = function () {
					assetRaw = null;
					generateVirtualImages();
					cb();
				};
				asset.src = assetRaw;
			} else { // assume it's a canvas or an image
				asset = assetRaw;
				assetRaw = null;
				generateVirtualImages();
				cb();
			}
		};
		
		this.unloadAsset = function () {
			asset = null;
			assetRaw = null;
			json = null;
			this.img = null;
		};
		
		this.getAsset = function () {
			return asset;
		};

	};
	
	// expose module
	window.force.expose('window.force.modules.AtlasMap', AtlasMap);
})();