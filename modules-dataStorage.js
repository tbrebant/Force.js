/**
 * window.force.modules.dataStorage
*/

(function() {

	var dataStorage = {};

	// expose module
	window.force.expose('window.force.modules.dataStorage', dataStorage);

	// ------------------------------------------------------------------------------------------------------
	//                                             Implementation
	// ------------------------------------------------------------------------------------------------------

	var ejectaDataStorage;
	var writing = 0;
	var reading = 0;
	var retryDelay = 20;
	var maxConcurrency = force.modules.environment.isEjecta() ? 2 : 999;
	
	function initEjectaForceDataStorage() {
		if (!ejectaDataStorage) {
			ejectaDataStorage = new Ejecta.ForceDataStorage();
		}
	};

	dataStorage.isKeyUsed = function (key) {
		var d = localStorage.getItem(key);
		return (d !== undefined && d !== null);
	};

	dataStorage.setItem = function (key, data, callback) {
		var that = this;
		if ((writing + reading) > maxConcurrency) {
			return setTimeout(function() {
				that.setItem(key, data, callback);
			}, retryDelay);
		}
		
		writing++;
		
		var cb = function (error) {
			writing--;
			if (error) {
				error = 'dataStorage.setItem error: ' + error;
			}
			if (callback) {
				return callback(error);
			} else if (error) {
				console.log(error);
			}
		};
		
		var dataType = identifyData(data);
		
		// if we are in Ejecta
		if (force.modules.environment.isEjecta() && Ejecta.ForceDataStorage) {
			initEjectaForceDataStorage();
			
			// image and canvas type
			if (dataType === 'image' || dataType === 'canvas') {
				setTimeout(function () { // it's safer to have all calls to an ejectaDataStorage method in a different thread
					ejectaDataStorage.saveImage(key, data); // TODO: this sort of things should have a callback..

					try {
						localStorage.setItem(key, JSON.stringify({
							dataType: dataType,
							savedIn: 'ForceDataStorage'
						}));
						cb();
					} catch (e) {
						// TODO: should remove the image stored in Ejecta
						cb('Storage failed: ' + e);
				    }
				}, 0);
			    
				return;
			}
		}
		
		// default behaviors

		// image type
		if (dataType === 'image') {
		    var cvs = document.createElement('canvas');
		    var ctx = cvs.getContext('2d');
		    cvs.width = data.width;
		    cvs.height = data.height;
		    ctx.drawImage(data, 0, 0, data.width, data.height);
		    var dataUrl = cvs.toDataURL('image/png');
		    try {
		        localStorage.setItem(key, JSON.stringify({
					dataType: dataType,
					savedIn: 'here',
					data: dataUrl
		        }));
		        return cb();
		    } catch (e) {
		    	return cb('Storage failed: ' + e);
		    }
		}
		
		// canvas type
		if (dataType === 'canvas') {
		    try {
		    	var dataUrl = data.toDataURL('image/png');
		        localStorage.setItem(key, JSON.stringify({
					dataType: dataType,
					savedIn: 'here',
					data: dataUrl
		        }));
		        return cb();
		    } catch (e) {
		        return cb('Storage failed: ' + e);
		    }
		}
		
		// default
		return cb('unrecognised data type');
	};
	
	dataStorage.getItem = function (key, callback) {
		var that = this;
		if ((writing + reading) > maxConcurrency) {
			return setTimeout(function() {
				that.getItem(key, callback);
			}, retryDelay);
		}
		
		reading++;
		
		var cb = function (error, data) {
			reading--;
			if (error) {
				error = 'dataStorage.getItem error: ' + error;
			}
			if (callback) {
				return callback(error, data);
			} else if (error) {
				console.log(error);
			}
		};
		
		var ls = localStorage.getItem(key);
		if (!ls) {
			return cb('key not found');
		}
		ls = JSON.parse(ls);
 		if (!ls.dataType || !ls.savedIn) {
 			return cb('invalid data found in this key');
 		}
		
		// saved in Ejecta
		if (ls.savedIn === 'ForceDataStorage') {
			initEjectaForceDataStorage();

			if (ls.dataType === 'image' || ls.dataType === 'canvas') {
				setTimeout(function () { // it's safer to have all calls to an ejectaDataStorage method in a different thread
					var path = ejectaDataStorage.getImagePath(key);
					
					var img = new Image();
					img.onload = function() {
						cb(null, this);
					};
					img.onerror = function() {
						cb('unable to load image');
					};
					img.src = path;
				}, 0);
				return;
			}
		}
		
		// saved in the local storage
		if (ls.savedIn === 'here') {

			if (ls.dataType === 'image' || ls.dataType === 'canvas') {
				var img = new Image();
				img.onload = function() {
					cb(null, this);
				};
				img.onerror = function() {
					cb('unable to load image');
				};
				img.src = ls.data;
				return;
			}
			
		}
		
		// default
		return cb('unrecognised data type');
	};
	
	dataStorage.removeItem = function (key, callback) {
		var that = this;
		if ((writing + reading) > maxConcurrency) {
			return setTimeout(function() {
				that.removeItem(key, callback);
			}, retryDelay);
		}
		
		writing++;
		
		var cb = function (error) {
			writing--;
			if (error) {
				error = 'dataStorage.removeItem error: ' + error;
			}
			if (callback) {
				return callback(error);
			} else if (error) {
				console.log(error);
			}
		};
		
		var ls = localStorage.getItem(key);
		if (!ls) {
			return cb('key not found');
		}
		ls = JSON.parse(ls);
 		if (!ls.dataType || !ls.savedIn) {
 			return cb('invalid data found in this key');
 		}

		// saved in Ejecta
		if (ls.savedIn === 'ForceDataStorage') {
			initEjectaForceDataStorage();

			if (ls.dataType === 'image' || ls.dataType === 'canvas') {
				ejectaDataStorage.removeImage(key);
				localStorage.removeItem(key);
				return cb();
			}
		}
		
		// saved in the local storage
		if (ls.savedIn === 'here') {
			localStorage.removeItem(key);
			return cb();
		}
		
		// default
		return cb('unrecognised data type');
	};
	

	function identifyData(data) {
		if (typeof HTMLImageElement !== 'undefined' && data instanceof HTMLImageElement) {
			return 'image';
		}
		if (data.nodeName && data.nodeName === 'IMG') {
			return 'image';
		}
		if (data.nodeName && data.nodeName === 'CANVAS') {
			return 'canvas';
		}
		if (typeof data === 'string') {
			return 'string';
		}
		return 'unknown';
	}
	
})();