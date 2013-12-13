/**
 * window.force.modules.loaders.ScriptLoader
 *   .reset()                                                  to reset
 *   .add({string}file path and name[, {bool} force reload])   to add a file to load, force reload is true by default
 *   .setFinalCallback({function})                                  to set the final callback
 *   .setStepCallback({function})                              to set one file loaded callback, pass 2 arguments:
 *                                                             nb files loaded and nb of files to load
 *   .start()                                                  start the loading of scripts added
*/

/**
 * TODO
 *   add a multithread loading option
 *   add a loading fail management
 *   prevent a second start from outside while loading
 *   prevent adding new files while loading
*/
(function() {

	var ScriptLoader = function () {
		var filesList, filesLoaded, cb, stepCb;
		var that = this;
		
		this.reset = function() {
			filesList   = [];
			filesLoaded = 0;
			cb          = null;
			stepCb      = null;
		};
		
		this.reset();
		
		var scriptLoaded = function() {
			filesLoaded++;
			if (typeof stepCb == 'function') {
				stepCb(filesLoaded, filesList.length);
			}
			if (filesLoaded == filesList.length) {
				setTimeout(function() {
					if(typeof cb == 'function') {
						cb();
					}
				}, 0);
			} else {
				setTimeout(function() {
					that.start();
				}, 0);
			}
		};
	
		this.add = function (scriptPath, avoidCache) {
			filesList.push({
				path: scriptPath,
				avoidCache: (typeof avoidCache === 'undefined' ? true : false)
			});
		};
	
		this.setFinalCallback = function (callback) {
			cb = callback;
		};
		
		this.setStepCallback = function (callback) {
			stepCb = callback;
		};
		
		function addScript(entry) {
			// 2 different methods depending if we are on native or not
			var script = document.createElement('script');
			script.onload = function() {
				scriptLoaded();
			};
			if (window.ejecta) {
				script.src = entry.path;
				script.tagName = 'script';
				document.body.appendChild(script);
			} else {
				script.setAttribute('type','text/javascript');
				script.setAttribute('src', entry.path + (entry.avoidCache ? '?update=' + new Date().getTime() : ''));
				document.getElementsByTagName('head')[0].appendChild(script);
			}
		}
	
		this.start = function () {
			addScript(filesList[filesLoaded]);
		}
	};
	
	// expose module
	window.force.expose('window.force.modules.loaders.ScriptLoader', ScriptLoader);
})();