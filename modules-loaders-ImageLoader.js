/**
 * window.force.modules.loaders.ImageLoader
*/

/**
 * TODO:
 *   option to create canvas instead of Images
 *   option to load multithread
 *   manage loading errors
 *   if we are in Cocoonjs launch an alert if the image size is not a power of 2
*/

/**
 * example:
 *   var loader = new force.modules.loaders.ImageLoader();
 *   var textures = {bg1: 'assets/image1.png', bg2: 'assets/image2.png'};
 *   loader.setImages(textures);
 *   loader.setStepCb(function (c, t) { console.log(c + '/' + t); });
 *   loader.setFinalCb(function () { console.log('loading finished'); });
 *   loader.start();
 *   document.body.appendChild(textures.bg1);
*/
(function() {

	var ImageLoader = function () {
		var imgList = null;
		var imgListKeys = null;
		var isLoading = false;
		var stepCb = null;
		var finalCb = null;
		var loaded = 0;
		var currentPath = null;
		
		this.setStepCb = function (cb) {
			if (typeof cb == 'function') {
				stepCb = cb;
			}
		};

		this.setFinalCb = function (cb) {
			if (typeof cb == 'function') {
				finalCb = cb;
			}
		};
		
		this.setImages = function (obj) {
			imgList = obj;
		};
		
		this.debug = function() {
			return imgList;
		};
		
		this.start = function () {
			imgListKeys = Object.keys(imgList);
			loadNext();
		};
		
		function onLoad() {
			loaded++;
			if (stepCb) {
				stepCb(loaded, imgListKeys.length);
			}
			if (loaded === imgListKeys.length) {
				if (finalCb) {
					finalCb();
				}
			} else {
				setTimeout(loadNext, 0);
			}
		};
		
		var loadNext = function() {
			currentPath = imgList[imgListKeys[loaded]];
			imgList[imgListKeys[loaded]] = new Image();
			imgList[imgListKeys[loaded]].onload = onLoad;
			imgList[imgListKeys[loaded]].src = currentPath;
		}
	};
	
	// expose module
	window.force.expose('window.force.modules.loaders.ImageLoader', ImageLoader);
})();