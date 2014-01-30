(function() {
	var implementation = {
		setViewport: {mandatory: false},
		createDom: {mandatory: true},
		showDom: {mandatory: true},
		hideDom: {mandatory: true},
		setDomStyle: {mandatory: true},
		insertStyleSheet: {mandatory: true},
		getDomKey: {mandatory: true}
	};
	var environment = null;
	
	var mod = {};
	
	if (CocoonJS && CocoonJS.App && CocoonJS.App.loadInCocoonJS) { // to check if CocoonJS_App_ForWebView.js have been loaded
		environment = 'CocoonJs'
		// ---------------------------------------
		// -----------------------------------------
		// Cocoon JS webview side
		// -----------------------------------------
		// ---------------------------------------
		
		document.ontouchmove = function(e){ 
			e.preventDefault(); 
		}
		
		var domObj = {}; // list of all DOM elements created
		var viewportW, viewportH;
		var webViewVisible = false;
		
		mod.setViewport = function (width, scale) {
			var viewport;
			var content = 'width = ' + width + ', initial-scale = ' + scale + ', maximum-scale = ' + scale + ', user-scalable = no';
			viewport = document.querySelector("meta[name=viewport]");			
			if (!viewport) {
				viewport = document.createElement('meta');
				viewport.name = 'viewport';
				viewport.content = content;
				document.getElementsByTagName('head')[0].appendChild(viewport);
			} else {
				viewport.setAttribute('content', content);
			}
		};
		
		mod.createDom = function (uid, params) {
			if (domObj[uid]) {
				return console.error('object uid ' + uid + ' already exising');
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
						CocoonJS.App.forward(params.tagParams.onclickExecInCanvas);
					};
				}
				else {
					dom[p] = params.tagParams[p];
				}
			}
			
			if (params.noClickDelay && window.NoClickDelay) {
				new NoClickDelay(dom);
			}
			
			domObj[uid] = {
				dom: dom,
				visible: false
			};

			mod.hideDom(uid);

			if (params.inside) {
				domObj[params.inside].dom.appendChild(dom);
			} else {
				document.body.appendChild(dom);
			}

			if (params.innerHTML) {
				dom.innerHTML = params.innerHTML;
			}

			// to avoid scrolling when keyboard is moving up on iOS
			if (params.tag === 'input' || params.tag === 'textarea') {
				dom.onfocus = function () {
					window.scrollTo(0, 0);
					document.body.scrollTop = 0;
					setTimeout(function() {
						window.scrollTo(0, 0);
						document.body.scrollTop = 0;
					},0);
				}
			}
			
			function handleFileSelect(evt) {
				CocoonJS.App.forward("window.force.modules.abstractDom._triggerFileInputChangedCb('" + uid + "');");
				var files = evt.target.files;
			
				for (var i = 0, f; f = files[i]; i++) {
					var reader = new FileReader();
					var filename = f.name || f.fileName;
					
					reader.onload = (function(theFile) {
						return function(e) {
							CocoonJS.App.forward("window.force.modules.abstractDom._triggerFileInputLoadedCb('" + uid + "', '" + e.target.result + "', '" + filename + "');");
						};
					})(f);
					
					reader.readAsDataURL(f);
				}
			}
			
			if (params.tag === 'input' && params.tagParams.type === 'file') {
				dom.addEventListener('change', handleFileSelect, false);
			}
		};
		
		mod.showDom = function (uid) {
			domObj[uid].dom.delClassName('hidden');
			domObj[uid].visible = true;
			mod.updateWebViewVisibility();
		}
		
		mod.hideDom = function (uid) {
			domObj[uid].dom.addClassName('hidden');
			domObj[uid].visible = false;
			mod.updateWebViewVisibility();
		}
		
		mod.updateWebViewVisibility = function () {
			var v = false;
			for (var uid in domObj) {
				if (domObj[uid].visible) {
					v = true;
					break;
				}
			}
			if (v !== webViewVisible) {
				if (v) {
					CocoonJS.App.show();
				} else {
					CocoonJS.App.hide();
				}
				webViewVisible = v;
			}
		};
		
		mod.setDomStyle = function (uid, property, val) {
			domObj[uid].dom.style[property] = val;
		};
		
		mod.insertStyleSheet = window.force.modules.helpers.insertStylesheet;
		
		mod.getDomKey = function (uid, key) {
			var keys = key.split('.');
			var o = domObj[uid].dom;
			for (var i = 0; i < keys.length; i++) {
				o = o[keys[i]];
			}
			return o;
		};
	} else {
		environment = 'Unknown';
	}
	
	for (var e in implementation) {
		if (implementation[e].mandatory && (!mod[e] || typeof mod[e] !== 'function')) {
			return console.error('webview.js > method ' + e + ' is mandatory but have not been found in `' + environment + '` environment.');
		}
	}

	// expose module
	window.force.expose('window.force.abstractDom', mod);
	
})();