/*
 * window.force.modules.abstractDom
 *
 * define window.ABSTRACT_DOM_FORCE_ENVIRONMENT to 'CocoonJs' or 'Ejecta' or 'Browser' to override regular behavior
 *
 */
 
(function() {
	var implementation = {
		setIndexUrl: {mandatory: false},        // sync
		prepare: {mandatory: true},             // async
		createDom: {mandatory: true},           // sync if prepare have already run before, else async
		showDom: {mandatory: true},             // sync
		hideDom: {mandatory: true},             // sync
		setDomStyle: {mandatory: true},         // sync
		insertStyleSheet: {mandatory: true},    // sync
		getDomKey: {mandatory: true},           // sync, the second parameter (key) may be something like 'value' or 'style.left'...
		executeInDom: {mandatory: true},
		_triggerFileInputChangedCb: {mandatory: false}, // internal only
		_triggerFileInputLoadedCb: {mandatory: false} // internal only
	};
	
	var environment = null;
	var mod = {};
	
	if (window.ABSTRACT_DOM_FORCE_ENVIRONMENT) {
		environment = window.ABSTRACT_DOM_FORCE_ENVIRONMENT;
	} else if (navigator.isCocoonJS) {
		environment = 'CocoonJs';
	} else if (window.force.modules.environment.isEjecta()) {
		environment = 'Ejecta';
	} else {
		environment = 'Browser';
	}

	if (environment === 'CocoonJs') {
		// ---------------------------------------
		// -----------------------------------------
		// Cocoon JS canvas side
		// -----------------------------------------
		// ---------------------------------------
		
		var webViewCreated = false;
		var indexUrl = 'Force/webview/cocoonJs.html';
		var exposedOn = 'window.force.abstractDom.';
	
		mod.setIndexUrl = function(url) {
			indexUrl = url;
		};
	
		mod.prepare = function(cb, options) {
			options = options || {};
			
			var viewportWidth = options.viewportWidth || window.force.modules.screen.availableWidth;
			var viewportScale = options.viewportScale || '1.0';
			
			if (!webViewCreated) {
				CocoonJS.App.onLoadInTheWebViewSucceed.addEventListener(function(pageURL) {
					CocoonJS.App.forward(exposedOn + "setViewport('" + viewportWidth + "', '" + viewportScale + "');");
					mod.insertStyleSheet('.hidden{display:none;}');
					
					webViewCreated = true;
					
					if (cb) {
						cb();
					}
				});
	
				CocoonJS.App.onLoadInTheWebViewFailed.addEventListener(function(pageURL) {
					console.error('abstractDom > prepare: Could not load HTML file in webview');
					if (cb) {
						cb();
					}
				});
	
				CocoonJS.App.loadInTheWebView(indexUrl);
			} else if (cb) {
				cb();
			}
		};

		mod._triggerFileInputChangedCb = function (uid) {
			if (mod.fileInputCb && mod.fileInputCb[uid] && mod.fileInputCb[uid].fileInputChangedCb) {
				mod.fileInputCb[uid].fileInputChangedCb();
			}
		};
		
		mod._triggerFileInputLoadedCb = function (uid, data, filename) {
			if (mod.fileInputCb && mod.fileInputCb[uid] && mod.fileInputCb[uid].fileInputLoadedCb) {
				mod.fileInputCb[uid].fileInputLoadedCb(data, filename);
			}
		};
		
		mod.createDom = function (uid, params, cb) {
			if (!webViewCreated) {
				var _arguments = arguments;
				return mod.prepare(function() {
					if (webViewCreated) {
						mod.createDom.apply(undefined, _arguments);
					} else if (cb) {
						cb();
					}
				});
			}
			if (!params.tagParams) {
				params.tagParams = {};
			}
			if (!params.tagParams.id) {
				params.tagParams.id = uid;
			}
			
			if (params.tag === 'input' && params.tagParams && params.tagParams.type && params.tagParams.type === 'file') {
				if (params.fileInputChangedCb || params.fileInputLoadedCb) {
					if (!mod.fileInputCb) {
						mod.fileInputCb = {};
					}
					mod.fileInputCb[uid] = {
						fileInputChangedCb: params.fileInputChangedCb || null,
						fileInputLoadedCb: params.fileInputLoadedCb || null
					};
				}
			}
			
			params = JSON.stringify(params);
			CocoonJS.App.forward(exposedOn + "createDom('" + uid + "', " + params + ");"); // forward is a synchronous method. may want to use forwardAsync instead

			if (cb) {
				cb();
			}
		};
		
		mod.showDom = function (uid) {
			CocoonJS.App.forward(exposedOn + "showDom('" + uid + "');");
		};
		
		mod.hideDom = function (uid) {
			CocoonJS.App.forward(exposedOn + "hideDom('" + uid + "');");
		};
		
		mod.setDomStyle = function (uid, property, val) {
			CocoonJS.App.forward(exposedOn + "setDomStyle('" + uid + "', '" + property + "', '" + val + "');");
		};
		
		mod.insertStyleSheet = function (cssText) {
			cssText = cssText.replace(/\'/g, '\\\'');
			CocoonJS.App.forward(exposedOn + "insertStyleSheet('" + cssText + "');");
		};
		
		mod.getDomKey = function (uid, key) {
			return CocoonJS.App.forward(exposedOn + "getDomKey('" + uid + "', '" + key + "');");
		};
		
		mod.executeInDom = function (str) {
			return CocoonJS.App.forward(str);
		};
	} else if (environment === 'Ejecta') {
		// ---------------------------------------
		// -----------------------------------------
		// Ejecta canvas side
		// -----------------------------------------
		// ---------------------------------------

		var niy = function () {
			window.force.modules.helpers.alert('not implemented yet');
		};
		for (var e in implementation) {
			if (implementation[e].mandatory && !mod[e] || typeof mod[e] !== 'function') {
				mod[e] = niy;
			}
		}
	} else if (environment === 'Browser') {
		// ---------------------------------------
		// -----------------------------------------
		// Normal browser
		// -----------------------------------------
		// ---------------------------------------
		
		var domObj = {};

		mod.prepare = function(cb, options) {
			mod.insertStyleSheet('.hidden{display:none;}');
			if (cb) {
				cb();
			}
		};
		
		mod._triggerFileInputChangedCb = function (uid) {
			if (mod.fileInputCb && mod.fileInputCb[uid] && mod.fileInputCb[uid].fileInputChangedCb) {
				mod.fileInputCb[uid].fileInputChangedCb();
			}
		};
		
		mod._triggerFileInputLoadedCb = function (uid, data, filename) {
			if (mod.fileInputCb && mod.fileInputCb[uid] && mod.fileInputCb[uid].fileInputLoadedCb) {
				mod.fileInputCb[uid].fileInputLoadedCb(data, filename);
			}
		};
		
		mod.createDom = function (uid, params, cb) {
			if (domObj[uid]) {
				return console.error('object uid ' + uid + ' already exising');
			}
			
			if (!params.tagParams) {
				params.tagParams = {};
			}
			if (!params.tagParams.id) {
				params.tagParams.id = uid;
			}
			
			var dom = document.createElement(params.tag);
			for (var p in params.tagParams) {
				if (p === 'style') {
					for (var s in params.tagParams.style) {
						dom.style[s] = params.tagParams.style[s];
					}
				}
				else if (p === 'onclickExecInDom') {
					dom.onclick = function() {
						eval(params.tagParams.onclickExecInDom);
					};
				}
				else if (p === 'onclickExecInCanvas') {
					dom.onclick = function() {
						eval(params.tagParams.onclickExecInCanvas);
					};
				}
				else {
					dom[p] = params.tagParams[p];
				}
			}
			
			if (params.noClickDelay && window.NoClickDelay) {
				new NoClickDelay(dom);
			}

			if (params.tag === 'input' && params.tagParams && params.tagParams.type && params.tagParams.type === 'file') {
				
				if (params.fileInputChangedCb || params.fileInputLoadedCb) {
					if (!mod.fileInputCb) {
						mod.fileInputCb = {};
					}
					mod.fileInputCb[uid] = {
						fileInputChangedCb: params.fileInputChangedCb || null,
						fileInputLoadedCb: params.fileInputLoadedCb || null
					};
					
					function handleFileSelect(evt) {
						mod._triggerFileInputChangedCb(uid);
						var files = evt.target.files;
						for (var i = 0, f; f = files[i]; i++) {
							var reader = new FileReader();
							var filename = f.name || f.fileName;
	
							reader.onload = (function(theFile) {
								return function(e) {
									mod._triggerFileInputLoadedCb(uid, e.target.result, filename);
								};
							})(f);
							reader.readAsDataURL(f);
						}
					}
					
					dom.addEventListener('change', handleFileSelect, false);
					
					
					
					
				}
				

			}
			
			domObj[uid] = dom;
			
			mod.hideDom(uid);
			
			if (params.inside) {
				domObj[params.inside].appendChild(dom);
			} else {
				document.body.appendChild(dom);
			}
			
			if (params.innerHTML) {
				dom.innerHTML = params.innerHTML;
			}
		};
		
		mod.showDom = function (uid) {
			domObj[uid].delClassName('hidden');
		}
		
		mod.hideDom = function (uid) {
			domObj[uid].addClassName('hidden');
		}
		
		mod.setDomStyle = function (uid, property, val) {
			domObj[uid].style[property] = val;
		};

		mod.insertStyleSheet = window.force.modules.helpers.insertStylesheet;
		
		mod.getDomKey = function (uid, key) {
			var keys = key.split('.');
			var o = domObj[uid];
			for (var i = 0; i < keys.length; i++) {
				o = o[keys[i]];
			}
			return o;
		};
		
		mod.executeInDom = function (str) {
			return eval(str);
		};
	}
	
	for (var e in implementation) {
		if (implementation[e].mandatory && (!mod[e] || typeof mod[e] !== 'function')) {
			return console.error('modules-abstractDom.js > method ' + e + ' is mandatory but have not been found in `' + environment + '` environment.');
		}
	}
	for (var e in mod) {
		if (!implementation[e]) {
			console.warn('modules-abstractDom.js > method ' + e + ' found in `' + environment + '` environment but not defined in implementation.');
		}
	}
	
	// expose module
	window.force.expose('window.force.modules.abstractDom', mod);
})();
