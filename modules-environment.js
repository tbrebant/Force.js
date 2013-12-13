(function() {
	var mod = {};
	
	// TODO: Should also plug the CocoonJs app extensions with CocoonJS.App.DeviceInfo
	//       There is multiple things on the object navigator aslo
	
	/**
	 * window.force.modules.environment.isEjecta()
	 */
	mod.isEjecta = function () {
		return ((window.ejecta && window.ejecta.include && window.ejecta.openURL) ? true : false);
	};
	
	/**
	 * window.force.modules.environment.isCocoonJs()
	 */
	mod.isCocoonJs = function () {
		return navigator.isCocoonJS ? true : false;
	};
	
	/**
	 * window.force.modules.environment.isIos()
	 */
	mod.isIos = function() {
		return mod.getIosVersion() ? true : false;
	};
	
	/**
	 * window.force.modules.environment.isTizen()
	 */
	mod.isTizen = function() {
		return window.tizen ? true : false;
	};
	
	/**
	 * window.force.modules.environment.isAndroid()
	 */
	mod.isAndroid = function() {
		return navigator.userAgent.match(/Android/i) ? true : false;
	};
	
	/**
	 * window.force.modules.environment.isBlackBerry()
	 */
	mod.isBlackBerry = function() {
		return navigator.userAgent.match(/BlackBerry/i) ? true : false;
	};
	
	/**
	 * window.force.modules.environment.isWindowsMobile()
	 */
	mod.isWindowsMobile = function() {
		return navigator.userAgent.match(/IEMobile/i) ? true : false;
	};
	
	/**
	 * window.force.modules.environment.isOperaMini()
	 */
	mod.isOperaMini = function() {
		return navigator.userAgent.match(/Opera Mini/i) ? true : false;
	};

	/**
	 * window.force.modules.environment.getIosVersion()
	 * return an array with each version number, ex: [5, 1, 1] for 5.1.1
	 */
	mod.getIosVersion = function() {
        // This function is only for browser, Ejecta && CocoonJs should be managed differently
        // TODO: what about Cordova?
        if (!mod.isCocoonJs() && !mod.isEjecta()) {
			if (navigator && navigator.platform && /iP(hone|od|ad)/.test(navigator.platform)) {
				var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
				return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)];
			}
		}
		return null;
	};
	
	/**
	 * window.force.modules.environment.getIosDeviceType()
	 */
	mod.getIosDeviceType = function() {
		if (navigator && navigator.platform) {
			var s = navigator.platform;
			if (/iPhone/.test(s)) {
				return 'iPhone';
			} else if (/iPad/.test(s)) {
				return 'iPad';
			} else if (/iPod/.test(s)) {
				return 'iPod';
			}
		}
		return null;
	};
	
	/**
	 * window.force.modules.environment.isDesktopBrowser()
	 */
	mod.isDesktopBrowser = function() {
		return (
			!mod.isEjecta() &&
			!mod.isCocoonJs() &&
			!mod.isIos() &&
			!mod.isTizen() &&
			!mod.isAndroid() &&
			!mod.isBlackBerry() &&
			!mod.isWindowsMobile() &&
			!mod.isOperaMini()
		);
	};

	/**
	 * window.force.modules.environment.reboot()
	 */
	mod.reboot = function() {
		if (mod.isCocoonJs()) {
			CocoonJS.App.reload();
		} else {
			window.location.reload();
		}
	};

	// expose module
	window.force.expose('window.force.modules.environment', mod);
})();