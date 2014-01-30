(function() {
	var mod = {};

	/**
	 * window.force.modules.helpers.randomInt()
	 */
	mod.randomInt = function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	};


	/**
	 * window.force.modules.helpers.or()
	 */
	mod.or = function (a, b) {
		return typeof a !== 'undefined' ? a : b;
	};


	/**
	 * window.force.modules.helpers.once()
	 */
	mod.once = function (fn, uid) {
		if(!window['force-modules-helpers-once-' + uid]) {
			fn();
			window['force-modules-helpers-once-' + uid] = true;
		}
	};


	/**
	 * window.force.modules.helpers.copy()
	 */
	mod.copy = function (obj) {
		return JSON.parse(JSON.stringify(obj));
	};


	/**
	 * window.force.modules.helpers.getNewUid()
	 */
	(function () {
		var uid = 0;
		mod.getNewUid = function () {
			uid++;
			return Date.now() + '-' + uid;
		}
	})();


	/**
	 * window.force.modules.helpers.distanceBetweenCoords()
	 */
	mod.distanceBetweenCoords= function (x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	}


	/**
	 * window.force.modules.helpers.getUrlParameters()
	 */
	mod.getUrlParameters = function () {
		var query_string = {};
		if (window && window.location && window.location.search) {
			var query = window.location.search.substring(1);
			var vars = query.split('&');
			for (var i=0;i<vars.length;i++) {
				var pair = vars[i].split('=');
				// If first entry with this name
				if (typeof query_string[pair[0]] === 'undefined') {
					query_string[pair[0]] = pair[1];
					// If second entry with this name
				} else if (typeof query_string[pair[0]] === 'string') {
					var arr = [ query_string[pair[0]], pair[1] ];
					query_string[pair[0]] = arr;
					// If third or later entry with this name
				} else {
					query_string[pair[0]].push(pair[1]);
				}
			}
		}
		return query_string;
	}


	/**
	 * window.force.modules.helpers.addUrlParameters()
	 */
	mod.addUrlParameters = function (url, key, value) {
		if (!url || !key) {
			return url;
		}
		
		key = encodeURI(key);
		
		if (url.indexOf('?') === -1) {
			url += '?';
		} else {
			url += '&';
		}
		
		url += key;
		if (value !== undefined) {
			value = encodeURI(value);
			url += '=' + value;
		}
		
		return url;
	}

	/**
	 * window.force.modules.helpers.alert()
	 *
	 * multi environment alert
	 */
	mod.alert = function(title, message, btnTxt, cb) {
		if (message === undefined && btnTxt === undefined && cb === undefined) {
			message = title;
			title = null;
		}
		
		if (force.modules.environment.isEjecta()) {
			window.ejecta.Force.alert(title, message, btnTxt, cb);
		} else {
			window.alert(message);
			if (cb) {
				cb();
			}
		}
	};

	/**
	 * window.force.modules.helpers.prompt()
	 *
	 * multi environment user prompt with callback
	 * keyboardType allowed values: "TEXT", "NUMBER", "PHONE", "EMAIL", "URL"
	 */
	mod.prompt = function(title, message, defaultText, keyboardType, cancelButtonText, okButtonText, cb) {
		if (navigator.isCocoonJS) {
			if (typeof CocoonJS === 'undefined' || !CocoonJS.App) {
				console.warn('prompt: CocoonJs environment detected but CocoonJS.App not found. Returns null');
				return cb(null);
			}

			var confirmCb = function (txt) {
				CocoonJS.App.onTextDialogFinished.removeEventListener(confirmCb);
				CocoonJS.App.onTextDialogCancelled.removeEventListener(cancelCb);
				cb(txt);
			};
			var cancelCb = function () {
				CocoonJS.App.onTextDialogFinished.removeEventListener(confirmCb);
				CocoonJS.App.onTextDialogCancelled.removeEventListener(cancelCb);
				cb(null);
			};
			
			CocoonJS.App.onTextDialogFinished.addEventListener(confirmCb);
			CocoonJS.App.onTextDialogCancelled.addEventListener(cancelCb);
			
			CocoonJS.App.showTextDialog(title, message, defaultText, CocoonJS.App.KeyboardType[keyboardType], cancelButtonText, okButtonText);
		} else if (force.modules.environment.isEjecta()) {
			if (window.ejecta.Force && window.ejecta.Force.getText) {
				window.ejecta.Force.getText(title, message, defaultText, keyboardType, okButtonText, cancelButtonText, cb);
			} else {
				window.ejecta.getText(title, message, cb);
			}
		} else {
			var result = window.prompt(message, defaultText);
			return cb(result);
		}
	};

	/**
	 * window.force.modules.helpers.confirm()
	 *
	 * multi environment `confirm` command
	 */
	mod.confirm = function(title, message, confirmButtonText, denyButtonText, cb) {
		if (navigator.isCocoonJS) {
			
			// on iOS CocoonJs presents the confirm button at the wrong position
			var device = CocoonJS.App.getDeviceInfo();
			var SWITCH_BUTTONS_POSITION = device.os === 'ios' ? true : false;
			
			var confirmCb = function () {
				CocoonJS.App.onMessageBoxConfirmed.removeEventListener(confirmCb);
				CocoonJS.App.onMessageBoxDenied.removeEventListener(cancelCb);
				cb(true);
			};
			var cancelCb = function () {
				CocoonJS.App.onMessageBoxConfirmed.removeEventListener(confirmCb);
				CocoonJS.App.onMessageBoxDenied.removeEventListener(cancelCb);
				cb(false);
			};
			
			if (SWITCH_BUTTONS_POSITION) {
				CocoonJS.App.onMessageBoxConfirmed.addEventListener(cancelCb);
				CocoonJS.App.onMessageBoxDenied.addEventListener(confirmCb);
				CocoonJS.App.showMessageBox(title, message, denyButtonText, confirmButtonText);
			} else {
				CocoonJS.App.onMessageBoxConfirmed.addEventListener(confirmCb);
				CocoonJS.App.onMessageBoxDenied.addEventListener(cancelCb);
				CocoonJS.App.showMessageBox(title, message, confirmButtonText, denyButtonText);
			}
		} else if (force.modules.environment.isEjecta()) {
			window.ejecta.Force.confirm(title, message, confirmButtonText, denyButtonText, cb);
		} else {
			var result = window.confirm(message);
			return cb(result);
		}
	};

	function retrieveCustomFonts() {
		var fontList = [];
		if (window && window.document && window.document.styleSheets) { // we are in a DOM environment or very close
			var sheets = window.document.styleSheets;
			for (var i = 0; i < sheets.length; i++) {
				var sheet = sheets[i].cssRules;
				for (var ruleIndex in sheet) {
					if (sheet.hasOwnProperty(ruleIndex)) {
						var rule = sheet[ruleIndex];
						if (rule && rule.cssText && rule.cssText.indexOf('@font-face') !== -1 && rule.style) {
							if (rule.style.getPropertyValue) {
								var fontFamily = rule.style.getPropertyValue('font-family');
								fontFamily = fontFamily.replace(/\'/g, '').replace(/\"/g, ''); // remove quotes
								fontList.push(fontFamily);
							}
						}
					}
				}
			}
		}
		return fontList;
	}

	/**
	 * window.force.modules.helpers.waitForCustomFonts()
	 */
	mod.waitForCustomFonts = function(cb, fontList) {

		// TODO: this environments may require specific loading check procedures
		if (window && window.force && window.force.modules && window.force.modules.environment) {
			if (window.force.modules.environment.isEjecta() || window.force.modules.environment.isCocoonJs()) {
				return cb();
			}
		}

		if (!window || !window.document || !window.document.body || !window.document.body.appendChild) {
			return cb();
		}

		fontList = fontList || retrieveCustomFonts();

		if (!fontList || fontList.length === 0) {
			return cb();
		}

		var testString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
		var fontIndex = 0;

		var span            = document.createElement('span');
		span.innerHTML      = testString;
		span.style.position = 'absolute';
		span.style.left     = '-999999px';
		span.style.opacity  = '0';

		var initWidth, prevWidth, font;

		window.document.body.appendChild(span);

		var checkInit = function() {
			font = fontList[fontIndex];
			span.style.fontFamily = 'serif';
			prevWidth = null;

			setTimeout(function() {
				initWidth = span.offsetWidth;
				span.style.fontFamily = font + ', serif';
				check();
			}, 0);
		}

		var check = function() {
			var currWidth = span.offsetWidth;
			if (currWidth !== initWidth) {
				if (currWidth === prevWidth) {
					fontIndex++;
					if (fontIndex === fontList.length) {
						window.document.body.removeChild(span);
						span = null;
						return cb();
					}
					checkInit();
				}
				prevWidth = currWidth;
			}
			setTimeout(check, 10);
		};

		checkInit();
	};


	/**
	 * window.force.modules.helpers.insertStylesheet()
	 *
	 * assume it's used in a DOM context
	 */
	mod.insertStylesheet = function (cssText) {
		var head  = document.getElementsByTagName('head')[0];
		var style = document.createElement('style');
		style.type = 'text/css';
		if (style.styleSheet){
		  style.styleSheet.cssText = cssText;
		} else {
		  style.appendChild(document.createTextNode(cssText));
		}
		head.appendChild(style);
	}


	/**
	 * window.force.modules.helpers.validateURL()
	 */
	mod.validateURL = function (textval) {
		var urlregex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		return urlregex.test(textval);
	}


	/**
	 * window.force.modules.helpers.getFilenameFromUrl()
	 *
	 * options: keepParameters, keepExtension
	 */
	mod.getFilenameFromUrl = function (url, options) {
		if (!url || typeof url !== 'string') {
			return null;
		}
		options = options || {};
		var filename = url.substring(url.lastIndexOf('/') + 1);
		if (!options.keepParameters && filename.indexOf('?') !== -1) {
			filename = filename.substr(0, filename.indexOf('?'));
		}
		if (!options.keepExtension && filename.lastIndexOf('.') !== -1) {
			filename = filename.substr(0, filename.lastIndexOf('.'));
		}
		if (filename && filename.length && filename.length > 0) {
			return filename;
		}
		return null;
	};


	/**
	 * window.force.modules.helpers.capitaliseFirstLetter()
	 */
	mod.capitaliseFirstLetter = function (str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	};


	/**
	 * window.force.modules.helpers.trim()
	 */
	mod.trim = function (str) {
		return str.replace(/^\s+/g,'').replace(/\s+$/g,'');
	};


	/**
	 * window.force.modules.helpers.getDeviceScreenResolution()
	 */
	mod.getDeviceScreenResolution = function (device) {
		var data = {
			iphone    : [320, 480],
			iphoneHd  : [640, 960],
			iphone5   : [320, 568],
			iphone5Hd : [640, 1136],
			tizen1    : [360, 640],
			tizen1Hd  : [720, 1280],
			tizen2    : [480, 800]
		}
		if (device && data[device]) {
			return data[device];
		}
		return([force.modules.screen.availableWidth, force.modules.screen.availableHeight]);
	};


	/**
	 * window.force.modules.helpers.sequenceExecute()
	 *   first argument: an option object:
	 *     delay           [ms]
	 *     context         [object]
	 *     firstFnArg      [array of parmaters for the first function]
	 *     zeroDelayIsSync [bool] default false, define if a delay of 0 should call the next function synchronously
	 *   next arguments: functions to execute, each function can return an array of parameters to pass to the next function
	 *
	 *   example:
	 *   sequenceExecute({delay: 1000, context: this, firstFnArg: [1, 2, 3]}, 
	 *       function a(a, b, c) {
	 *           console.log('a, b, c', a, b, c);
	 *           return [10, 11, 12];
	 *       }, 
	 *       function a(a, b, c) {
	 *           console.log('a, b, c', a, b, c);
	 *       }
	 *   );
	 */
	mod.sequenceExecute = function () {
		if (arguments.length < 2) {
			return console.warn('sequenceExecute: at least one option object and a function is required');
		}
		
		var options = arguments[0] || {};
		var currentFunction = 1;
		var arg = arguments;

		var delay = options.delay || 0;
		var context = options.context || this;
		var fnArg = options.firstFnArg;
		var zeroDelayIsSync = mod.or(options.zeroDelayIsSync, false);
		
		var execute = function () {
			fnArg = arg[currentFunction].apply(context, fnArg);
			currentFunction++;
			if (currentFunction < arg.length) {
				if (delay === 0 && zeroDelayIsSync) {
					return execute();
				}
				setTimeout(execute, delay);
			}
		};
		
		execute();
	};


	/**
	 * window.force.modules.helpers.aSequenceExecute()
	 *   first argument: an option object:
	 *     delay           [ms]
	 *     context         [object]
	 *     firstFnArg      [array of parmaters for the first function]
	 *     zeroDelayIsSync [bool] default false, define if a delay of 0 should call the next function synchronously
	 *   next arguments: functions to execute, each function's latest argument is the callback to call to trigger next function
	 *                   this callback can be called with a list of arguments passed to the next function
	 *
	 *   example:
	 *   aSequenceExecute({delay: 1000, firstFnArg: [1, 2, 3]},
	 *       function a(a, b, c, cb) {
	 *           console.log('a, b, c', a, b, c);
	 *           cb(100, 101, 102);
	 *       }, 
	 *       function a(a, b, c, cb) {
	 *           console.log('a, b, c', a, b, c);
	 *           cb();
	 *       }
	 *   );
	 */
	mod.aSequenceExecute = function () {
		if (arguments.length < 2) {
			return console.warn('sequenceExecute: at least one option object and a function is required');
		}
		
		var options = arguments[0] || {};
		var currentFunction = 0;
		var arg = arguments;
		
		var delay = options.delay || 0;
		var context = options.context || this;
		var fnArg = options.firstFnArg;
		var zeroDelayIsSync = mod.or(options.zeroDelayIsSync, false);
		
		var execute = function () {
			var cbArg = [];
			// arguments is an object, not a regular array
			for (var i = 0; i < arguments.length; i++) {
				cbArg.push(arguments[i]);
			}
			currentFunction++;
			if (currentFunction < arg.length) {
				cbArg.push(execute);
				if (currentFunction === 1 || (delay === 0 && zeroDelayIsSync)) {
					return arg[currentFunction].apply(context, cbArg);
				}
				setTimeout(function() {
					arg[currentFunction].apply(context, cbArg);
				}, delay);
			}
		};
		
		execute.apply(this, fnArg);
	};


	/**
	 * window.force.modules.helpers.getDeviceUid()
	 */
	mod.getDeviceUid = function (str) {
		if (force.modules.environment.isEjecta() && window.ejecta.Force.getIdentifierForVendor) {
			return window.ejecta.Force.getIdentifierForVendor();
		}
		
		// we don't have a real uid, let's try to simulate one from browser information
		var jam = '';
		
		var fruits = {
			'navigator': ['appCodeName', 'appName', 'language', 'platform', 'product', 'vendor']
		};
		
		for (var k in fruits) {
			if (window[k]) {
				for (var i = 0, l = fruits[k].length; i < l; i++) {
					if (window[k][fruits[k][i]]) {
						if (jam !== '') {
							jam += '.';
						}
						jam += window[k][fruits[k][i]];
					}
				}
			}
		}
		
		var mimeTypes = [];
		if (navigator && navigator.mimeTypes) {
			if (navigator.mimeTypes.length && navigator.mimeTypes.length > 0) {
				for (var i = 0, l = navigator.mimeTypes.length; i < l; i++) {
					if (navigator.mimeTypes[i] && navigator.mimeTypes[i].description && typeof navigator.mimeTypes[i].description === 'string') {
						mimeTypes.push(navigator.mimeTypes[i].description);
					}
				}
			}
		}
		if (mimeTypes.length > 0) {
			mimeTypes.sort(function(a, b) { return (a < b) ? -1 : 1; })
			jam += mimeTypes.toString();
		}
		
		return mod.simpleHash(jam);
	};


	/**
	 * window.force.modules.helpers.simpleHash()
	 */
	mod.simpleHash = function (str) {
		var hash = 0;
		if (str.length == 0) {
			return hash;
		}
		for (var i = 0; i < str.length; i++) {
			c = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + c;
			hash = hash & hash;
		}
		return hash.toString();
	};


	// expose module
	window.force.expose('window.force.modules.helpers', mod);
})();