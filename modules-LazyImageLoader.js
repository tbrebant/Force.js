(function () {
	
	/**
	 * window.LazyImageLoader()
	 *
	 * After instanciation there is two way to use it:
	 *   `lazyImageLoader.add(url, cb)` for each image and then `lazyImageLoader.start()`
	 * or just
	 *   `lazyImageLoader.load(url, cb)` for each image
	 * each image's load callback is called with one argument: the image object
	 */
	
	var STATUS = {
		NOT_STARTED: 0,
		LOADING: 1,
		LOADED: 2
	};
	
	var LazyImageLoader = function(options) {
		options = options || {};
		
		var or = window.force.modules.helpers.or;
		
		// params
		this.maxParallel       = or(options.maxParallel      , 10); // maximum number of images we want to load in parallel, for asynchronous only
		this.delayBetweenLoad  = or(options.delayBetweenLoad , 10); // ms delay between 2 img load, to let the code live, like for animating a progress bar
		
		// internals
		this._list = [];        // images to load
		this._imgLoading = [];  // images currently loading (indexes of this._list)
	};
	window.force.expose('window.LazyImageLoader', LazyImageLoader);
	
	LazyImageLoader.prototype.add = function(url, cb) {
		this._list.push({
			url    : url,
			cb     : cb,
			status : STATUS.NOT_STARTED,
			index  : this._list.length
		});
	};
	
	LazyImageLoader.prototype.start = function(url, cb) {
		if (this._imgLoading.length < this.maxParallel) {
			this._loadNext();
		}
	};
	
	LazyImageLoader.prototype.load = function(url, cb) {
		this.add(url, cb);
		this.start();
	};
	
	LazyImageLoader.prototype.clear = function() {
		this._list = [];
		this._imgLoading = [];
	};
	
	var notStartedFilter = function(entry) {
		return entry.status === STATUS.NOT_STARTED;
	};
	
	var notLoadedFilter = function(entry) {
		return entry.status !== STATUS.LOADED;
	};
	
	LazyImageLoader.prototype._loadNext = function() {
		if (this._imgLoading.length < this.maxParallel) {
			var that = this;
			var notLoadedYet = this._list.filter(notStartedFilter);
			if (notLoadedYet.length > 0) {
				var i = notLoadedYet[0].index;
				this._list[i].status = STATUS.LOADING;
				this._imgLoading.push(i);
				var img = new Image();
				img.onload = function() {
					that._list[i].cb(img);
					that._list[i].cb = null;
					that._list[i].status = STATUS.LOADED;
					that._imgLoading.splice(that._imgLoading.indexOf(i), 1);
					if (that._imgLoading.length < that.maxParallel) {
						if (!that.delayBetweenLoad) {
							that._loadNext();
						} else {
							setTimeout(function() {
								that._loadNext();
							}, that.delayBetweenLoad);
						}
					}
				};
				img.src = this._list[i].url;
			} else {
				var notLoaded = this._list.filter(notLoadedFilter);
				if (notLoaded.length === 0) {
					this.clear();
				}
			}
		}
	}
})();