/**
 * window.force.modules.AudioManager
*/

(function() {

	// ------------------------------------------------------------------------------------------------------
	//                                             Audio Manager
	// ------------------------------------------------------------------------------------------------------

	// options:
	//   - defaults: object with inside the same options as audio entity options, it will be the default for all sounds
	//
	// TODO: implement pause on window hide...

	var AudioManager = function (options) {
		options = options || {};

		this.loader = new AudioManagerLoader(this);
		this.defaults = options.defaults || {};
	};

	AudioManager.prototype.doOnAllAudio = function (fn, category) {
		for (var k in this.loader.audioList) {
			if (this.loader.audioList.hasOwnProperty(k) && (!category || this.loader.audioList[k].category === category)) {
				fn(this.loader.audioList[k]);
			}
		}
	};

	// expose module
	window.force.expose('window.force.modules.AudioManager', AudioManager);

	// ------------------------------------------------------------------------------------------------------
	//                                                 Helpers
	// ------------------------------------------------------------------------------------------------------

	var helpers = window.force.modules.helpers;
	var or = helpers.or;

	function getAudioContextClass() {
		return window.AudioContext || window.webkitAudioContext;
	}

	function isWebAudioAvailable() {
		return getAudioContextClass() ? true : false;
	}

	function isAudioElementAvailable() {
		return window.Audio ? true : false;
	}

	function identifyBestInterface () {
		if (isWebAudioAvailable()) {
			return 'webAudio';
		}
		if (isAudioElementAvailable())  {
			return 'audioElement';
		}
		return 'none';
	}

	function isInterfaceUsable(Interface) {
		if (Interface === 'none') {
			return true;
		}
		if (Interface === 'webAudio' && isWebAudioAvailable()) {
			return true;
		}
		if (Interface === 'audioElement' && isAudioElementAvailable()) {
			return true;
		}
		return false;
	}

	function getAudioContext() {
		if (AUDIO_CONTEXT || AUDIO_CONTEXT === null) {
			return AUDIO_CONTEXT;
		}
		var ac = getAudioContextClass();
		AUDIO_CONTEXT = ac ? new ac() : null;
		return AUDIO_CONTEXT;
	}

	var AUDIO_CONTEXT;
	var DEFAULT_INTERFACE = identifyBestInterface();

	// ------------------------------------------------------------------------------------------------------
	//                                          Audio Manager's loader
	// ------------------------------------------------------------------------------------------------------

	var AudioManagerLoader = function (audioManager) {
		this.audioList = null;
		this.audioListKeys = null;
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

		this.setAudios = function (obj) {
			this.audioList = obj;
			for (var k in this.audioList) {
				if (this.audioList.hasOwnProperty(k)) {
					var options = this.audioList[k];
					this.audioList[k] = new AudioEntity(audioManager, options);
				}
			}
		};

		this.start = function (param) {

			if (typeof param === 'function') { // assumes it's a cb
				this.setFinalCb(param);
			}

			this.audioListKeys = Object.keys(this.audioList);
			this._loadNext();
		};

		this._onLoad = function () {
			var that = this;
			loaded++;
			if (stepCb) {
				stepCb(loaded, that.audioListKeys.length);
			}
			if (loaded === that.audioListKeys.length) {
				if (finalCb) {
					finalCb();
				}
			} else {
				setTimeout(function() {
					that._loadNext();
				}, 0);
			}
		};

		this._onLoadError = function () {
			var that = this;
			loaded++;
			if (stepCb) {
				stepCb(loaded, that.audioListKeys.length);
			}
			if (loaded === that.audioListKeys.length) {
				if (finalCb) {
					finalCb();
				}
			} else {
				setTimeout(function() {
					that._loadNext();
				}, 0);
			}
		};

		this._loadNext = function() {
			var that = this;

			currentAudio = this.audioList[this.audioListKeys[loaded]];

			currentAudio.onLoad = function() {
				that._onLoad();
			};

			currentAudio.onLoadError = function() {
				that._onLoadError();
			};

			currentAudio.load();
		};
	};

	// ------------------------------------------------------------------------------------------------------
	//                                               Audio entity
	// ------------------------------------------------------------------------------------------------------

	// options:
	// - filePath (string)
	// - Interface ('audioElement', 'webAudio' or 'none')
	// - onLoad (function)
	// - onLoadError (function)
	// - loop (bool)
	// - autoplay (bool)
	// - noCache (bool) to force browser to reload the sound everytime, mostly for debug purpose
	// - multipleInstancesAllowed (bool)
	// - muted (bool)
	// - category (string) to be able to perform actions on multiple sounds of the same group (like 'sfx', 'bgm', etc...)
	//
	// methods:
	// - play()
	// - stop()
	// - isPlaying()
	// - isMuted()
	// - mute(bool)
	//
	// exposed properties:
	// - isLoaded
	// - audio: the audio element object
	// - source: the webaudio source object
	// - buffer: the latest webaudio buffer object created TODO: should keep a track of all buffers
	// - autoplay (bool)
	//
	// TODO: implement stop, pause, resume, startFrom, listener for ending...

	var AudioEntity = function (audioManager, options) {
		options = options || {};

		var defaults = audioManager.defaults;

		this.Interface = or(options.Interface, or(defaults.Interface, DEFAULT_INTERFACE));
		if (!isInterfaceUsable(this.Interface)) {
			this.Interface = DEFAULT_INTERFACE;
		}

		this.userOnLoad               = or(options.onLoad,                   or(defaults.onLoad,                   null)); // user callback
		this.userOnLoadError          = or(options.onLoadError,              or(defaults.onLoadError,              null)); // user callback
		this.filePath                 = or(options.filePath,                 or(defaults.filePath,                 null));
		this.multipleInstancesAllowed = or(options.multipleInstancesAllowed, or(defaults.multipleInstancesAllowed, true));
		this.noCache                  = or(options.noCache,                  or(defaults.noCache,                  false));
		this._loop                    = or(options.loop,                     or(defaults.loop,                     false));
		this.autoplay                 = or(options.autoplay,                 or(defaults.autoplay,                 false));
		this._muted                   = or(options.muted,                    or(defaults.muted,                    false));
		this.category                 = or(options.category,                 or(defaults.category,                 null));

		// the cb set up by the loader
		this.onLoad      = null;
		this.onLoadError = null;

		this.audio       = null;  // for audio element
		this.source      = null;  // for webaudio
		this.buffer      = null;  // for webaudio

		this.isLoaded    = false;
		this._isPlaying  = false; // for audio element
	};

	AudioEntity.prototype._onLoad = function () {
		this.isLoaded = true;
		this.setLoop(this._loop);
		if (this.onLoad) {
			this.onLoad();
		}
		if (this.userOnLoad) {
			this.userOnLoad();
		}
		if (this.autoplay) {
			this.play();
		}
	};

	AudioEntity.prototype._onLoadError = function () {
		if (this.onLoadError) {
			this.onLoadError();
		}
		if (this.userOnLoadError) {
			this.userOnLoadError();
		}
	};

	AudioEntity.prototype.isMuted = function () {
		return this._muted;
	};

	AudioEntity.prototype.load = function() {
		var that = this;

		if (!this.filePath) {
			this._onLoadError();
		}

		// load for NONE interface
		if (this.Interface === 'none') {
			this._onLoadError();
		}
		// load for AUDIO ELEMENT interface
		else if (this.Interface === 'audioElement') {
			this.audio = new Audio();
			this.audio.addEventListener('canplaythrough', function() {
				that._onLoad();
			});
			this.audio.addEventListener('ended', function() {
				that.onReachedEnd();
			}, false);
			this.audio.onerror = function () {
				that._onLoadError();
			};
			this.audio.onabort = function () {
				that._onLoadError();
			};
			var path = this.filePath;
			if (this.noCache) {
				path = helpers.addUrlParameters(path, helpers.getNewUid());
			}
			this.audio.src = path;
			if (window.force.modules.environment.isEjecta()) {
				this.audio.preload = true;
				this.audio.load();
			}
		}
		// load for WEB AUDIO interface
		else if (this.Interface === 'webAudio') {
			var request = new XMLHttpRequest();
			var path = this.filePath;
			if (this.noCache) {
				path = helpers.addUrlParameters(path, helpers.getNewUid());
			}
			request.open('GET', path, true);
			request.responseType = 'arraybuffer';
			request.onload = function() {
				var context = getAudioContext();
				context.decodeAudioData(request.response, function(buffer) {
					that.buffer = buffer;
					that._onLoad();
				}, function () {
					that._onLoadError();
				});
			};
			request.send();
		}
	};

	// for the time being, called only by audio elements
	AudioEntity.prototype.onReachedEnd = function() {
		var that = this;
		this._isPlaying = false;
		if (this._loop) {
			if (window.force.modules.environment.isCocoonJs()) {
				// cocoonJs requires this silly timeout to work
				setTimeout(function() {
					that.audio.currentTime = 0;
					that.audio.play();
				}, 0);
			} else {
				that.audio.currentTime = 0;
				that.audio.play();
			}
		}
	};

	AudioEntity.prototype.isPlaying = function() {
		if (this.Interface === 'none') {
			return false;
		}
		else if (this.Interface === 'audioElement') {
			return this._isPlaying;
		}
		else if (this.Interface === 'webAudio') {
			if (this.source && (this.source.playbackState === this.source.PLAYING_STATE || this.source.playbackState === this.source.SCHEDULED_STATE)) {
				return true;
			}
			return false;
		}
	};

	AudioEntity.prototype.setLoop = function(bool) {
		var that = this;

		bool = bool ? true : false;
		this._loop = bool;

		if (this.Interface === 'audioElement') {
			// nothing
		}
		else if (this.Interface === 'webAudio') {
			if (this.source) {
				this.source.loop = this._loop;
			}
		}
	};

	AudioEntity.prototype.mute = function(val) {
		if (val === undefined) {
			val = true;
		}
		if (val) {
			this._muted = true;
			this.stop();
		} else {
			this._muted = false;
			if (this.autoplay) {
				this.play();
			}
		}
	};

	// options:
	//   - asSoonAsPossible (bool)
	//   - fadeIn           (ms)
	AudioEntity.prototype.play = function(options) {
		if (this._muted) {
			return;
		}

		options = options || {};

		if (!this.isLoaded) {
			if (options.asSoonAsPossible) {
				this.autoplay = true;
			}
			return;
		}

		if (!this.multipleInstancesAllowed && this.isPlaying()) {
			return;
		}

		// play for NONE interface
		if (this.Interface === 'none') {
			// nothing
		}
		// play for AUDIO ELEMENT interface
		else if (this.Interface === 'audioElement') {

			if (this.isPlaying()) {
				// TODO: oops.. the user wants to play a sound that is already playing... but with regular browser's audio elements implementation
				//   it's not possible... so we could try to duplicate this sound?
			}

			this._isPlaying = true;
			this.audio.play();
		}
		// play for WEB AUDIO interface
		else if (this.Interface === 'webAudio') {
			var context = getAudioContext();
			this.source = context.createBufferSource();
			this.source.buffer = this.buffer;
			this.source.connect(context.destination);
			this.source.loop = this._loop;
			this.source.start(0);
		}
	};

	AudioEntity.prototype.stop = function() {
		// stop for NONE interface
		if (this.Interface === 'none') {
			// nothing
		}
		// stop for AUDIO ELEMENT interface
		else if (this.Interface === 'audioElement') {
			this._isPlaying = false;
			this.audio.pause();
			this.audio.currentTime = 0;
		}
		// stop for WEB AUDIO interface
		else if (this.Interface === 'webAudio') {
			if (this.source && this.source.stop && this.isPlaying()) {
				this.source.stop(0);
			}
		}
	};

})();