(function() {
	
	var ACTIVE_STATUS = {
		NOT_STARTED: 0,
		RUNNING: 1,
		FINISHED: 2
	}
	
	var OneFrameLogger = function(options) {
		var or = window.force.modules.helpers.or;
		options = options || {};
		
		this.startDelay = or(options.startDelay, 10000);
		this.autoReport = or(options.autoReport, true);
		
		this.status = ACTIVE_STATUS.NOT_STARTED;
		
		this.logs = [];
	};
	
	OneFrameLogger.prototype.frameStart = function() {
		if (this.status === ACTIVE_STATUS.FINISHED) {
			return;
		} else if (this.status === ACTIVE_STATUS.NOT_STARTED) {
			var now = Date.now();
			if (!this.startTime) {
				this.startTime = now;
			}
			if (now - this.startTime > this.startDelay) {
				this.status = ACTIVE_STATUS.RUNNING;
			}
		} else if (this.status === ACTIVE_STATUS.RUNNING) {
			this.status = ACTIVE_STATUS.FINISHED;
			if (this.autoReport) {
				this.report();
			}
		}
	};
	
	OneFrameLogger.prototype.log = function(msg) {
		if (this.status === ACTIVE_STATUS.RUNNING) {
			this.logs.push(msg);
		}
	};
	
	OneFrameLogger.prototype.report = function() {
		console.log(this.logs);
	};
	
	// expose module
	window.force.expose('window.force.modules.OneFrameLogger', OneFrameLogger);
})();