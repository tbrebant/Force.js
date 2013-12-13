(function() {
	/**
	 * window.force.modules.forceCanvasSystem.hardwareEvents
	 *
	 * usage: for the time being only the back button is managed:
	 *        hardwareEvents.propagateBackTo(obj, deviceRange)
	 *        where obj is a ForceSystem entity
	 *        and deviceRange can be null/empty (= triggered on all devices supported) or equal to: 'tizen' or 'desktopBrowser'
	 *        => propagate a 'hardwareBackKeyDown' event
	 */
	var mod = {};
	
	// internal variables
	var systemEventsTracked = {};
	var keysTracked = null;
	var documentTracked = null;
	
	// listners
	var listners = {
		'window.keydown': function keydown(evt) {
			if (keysTracked && evt.keyCode) {
				if (keysTracked.back && evt.keyCode === 37) {
					triggers.back();
				} else if (keysTracked.menu && evt.keyCode === 36) {
					triggers.menu();
				}
			}
		},
		'window.tizenhwkey': function tizenhwkey(evt) {
			if (keysTracked && evt.keyName) {
				if (keysTracked.back && evt.keyName === 'back') {
					triggers.back();
				} else if (keysTracked.menu && evt.keyName === 'menu') {
					triggers.menu();
				}
			}
		},
		'window.keypressed': function keypressed(evt) {
			if (keysTracked && evt.keyCode) {
				// nothing checked on key press yet
			}
		},
		'document.webkitvisibilitychange': function webkitvisibilitychange(evt) {
			if (documentTracked && document.webkitHidden !== undefined) {
				if (documentTracked.applicationHided && document.webkitHidden) {
					triggers.applicationHided();
				} else if (documentTracked.applicationShown && !document.webkitHidden) {
					triggers.applicationShown();
				}
			}
		}
	};
	
	// triggers
	var triggers = {
		back: function back() {
			for (var i = 0, l = keysTracked.back.length; i < l; i++) {
				keysTracked.back[i]._on({type: 'hardwareBackKeyDown'});
			}
		},
		menu: function() {
			for (var i = 0, l = keysTracked.menu.length; i < l; i++) {
				keysTracked.menu[i]._on({type: 'hardwareMenuKeyDown'});
			}
		},
		applicationHided: function() {
			for (var i = 0, l = documentTracked.applicationHided.length; i < l; i++) {
				documentTracked.applicationHided[i]._on({type: 'applicationHided'});
			}
		},
		applicationShown: function() {
			for (var i = 0, l = documentTracked.applicationShown.length; i < l; i++) {
				documentTracked.applicationShown[i]._on({type: 'applicationShown'});
			}
		}
	};
	
	// -------------------------------------------
	// Registering generic top level behaviors
	// -------------------------------------------
	
	function registerSystemEvent(target, eventCode) {
		var targetString;
		
		if (target === window) {
			targetString = 'window';
		} else if (target === window.document) {
			targetString = 'document';
		} else {
			target = window;
			targetString = 'window';
		}
		
		var fullCode = targetString + '.' + eventCode;
		if (!systemEventsTracked[fullCode]) {
			systemEventsTracked[fullCode] = target.addEventListener(eventCode, listners[fullCode], false);
		}
	}
	
	// -------------------------------------------
	// Registering specifics behaviors
	// -------------------------------------------
	
	function registerKeyTracked(keyName, obj) {
		if (!keysTracked) {
			keysTracked = {};
		}
		if (!keysTracked[keyName]) {
			keysTracked[keyName] = [];
		}
		keysTracked[keyName].push(obj);
	}
	
	function registerDocumentEventTracked(forceEventName, obj) {
		if (!documentTracked) {
			documentTracked = {};
		}
		if (!documentTracked[forceEventName]) {
			documentTracked[forceEventName] = [];
		}
		documentTracked[forceEventName].push(obj);
	}
	
	// -------------------------------------------
	// Exposed methods
	// -------------------------------------------
	
	mod.propagateBackBtnTo = function(obj, deviceRange) {
		if (window.force.modules.environment.isTizen() && (!deviceRange || deviceRange.tizen)) {
			registerSystemEvent(window, 'tizenhwkey');
			registerKeyTracked('back', obj);
		}
		else if (window.force.modules.environment.isDesktopBrowser() && (!deviceRange || deviceRange.desktopBrowser)) {
			registerSystemEvent(window, 'keydown'); // direction keys are only detect on keydown, not on keypress
			registerKeyTracked('back', obj);
		}
		else {
			// do nothing
		}
	};

	mod.propagateMenuBtnTo = function(obj, deviceRange) {
		if (window.force.modules.environment.isTizen() && (!deviceRange || deviceRange.tizen)) {
			registerSystemEvent(window, 'tizenhwkey');
			registerKeyTracked('menu', obj);
		}
		else if (window.force.modules.environment.isDesktopBrowser() && (!deviceRange || deviceRange.desktopBrowser)) {
			registerSystemEvent(window, 'keydown');
			registerKeyTracked('menu', obj);
		}
		else {
			// do nothing
		}
	};

	mod.propagateAppHideTo = function(obj, deviceRange) {
		if (window.force.modules.environment.isTizen() && (!deviceRange || deviceRange.tizen)) {
			registerSystemEvent(window.document, 'webkitvisibilitychange');
			registerDocumentEventTracked('applicationHided', obj);
		}
		else if (window.force.modules.environment.isDesktopBrowser() && (!deviceRange || deviceRange.desktopBrowser)) {
			if (window.document.webkitHidden !== undefined) {
				// webkit based engine
				registerSystemEvent(window.document, 'webkitvisibilitychange');
				registerDocumentEventTracked('applicationHided', obj);
			} else {
				// TODO: add code to support more browsers here..
			}
		}
		else {
			// do nothing
		}
	};

	mod.propagateAppShowTo = function(obj, deviceRange) {
		if (window.force.modules.environment.isTizen() && (!deviceRange || deviceRange.tizen)) {
			registerSystemEvent(window.document, 'webkitvisibilitychange');
			registerDocumentEventTracked('applicationShown', obj);
		}
		else if (window.force.modules.environment.isDesktopBrowser() && (!deviceRange || deviceRange.desktopBrowser)) {
			if (window.document.webkitHidden !== undefined) {
				// webkit based engine
				registerSystemEvent(window.document, 'webkitvisibilitychange');
				registerDocumentEventTracked('applicationShown', obj);
			} else {
				// TODO: add code to support more browsers here..
			}
		}
		else {
			// do nothing
		}
	};

	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.hardwareEvents', mod);
})();