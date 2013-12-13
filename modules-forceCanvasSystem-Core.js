/**
 * window.force.modules.forceCanvasSystem.Core()
 */

(function() {

	var Core = function(params) {
		init.call(this, params);
	};
	
	// ------------------------------------------
	// Helpers
	// ------------------------------------------
	
	var helpers = window.force.modules.helpers, or = helpers.or;
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		params = params || {};
		
		// used to refer to this object without having to store the object itself
		this.uid = helpers.getNewUid();

		// simpler way to address objects inside other ones than the uids
		this.name = or(params.name || this.uid);
		
		// to define the order of update() calls between the objects in a same parent
		this.zIndex = params.zIndex;
		
		// define if the update() function (and all childs ones) should be called or not
		this.visible = or(params.visible, true);
		
		// usage is left to the programmer, but is usually used to determine if object reacts to user inputs
		this._enabled = or(params.enabled, true);
		
		this._isEnabledConditions = [];
		this._events = {};
		this.childs = {};
		this.childsDrawOrder = [];
		this._childNames = {}; // simple name to uid map
		
		// if the parent have been defined, let's add it immediately
		if (params.parent) {
			params.parent._attachChild(this);
		} else {
			this.parent = null;
		}
	};
	
	// ------------------------------------------
	// Enable / Disable manager
	// ------------------------------------------

	Core.prototype.isEnabled = function() {
		if (this.enabled === false) {
			return false;
		}
		for (var i = 0, len = this._isEnabledConditions.length; i < len; i++) {
			if (this._isEnabledConditions[i](this) === false) {
				return false;
			}
		}
		if (!this.parent) {
			return this.enabled;
		}
		return this.parent.isEnabled();
	};
	
	Core.prototype.addAnIsEnabledCondition = function (fn) {
		if (typeof fn == 'function') {
			this._isEnabledConditions.push(fn);
		}
	};
	
	Core.prototype.__defineGetter__('enabled', function() {
		return this._enabled;
	});
	Core.prototype.__defineSetter__('enabled', function(value) {
		value = value ? true : false;
		if (this._enabled !== value) {
			if (!value) {
				this._on({type: 'disable'});
			}
			this._enabled = value;
			if (value) {
				this._on({type: 'enable'});
			}
		}
	});
	
	
	// ------------------------------------------
	// Childs manager
	// ------------------------------------------

	var addedOrder = 0; // To enforce the fact that the latest elements added in a same parent are the latest drawn

	Core.prototype._zIndexSort = function(uid1, uid2) {
		var a = this.childs[uid1];
		var b = this.childs[uid2];
		return (or(a.zIndex, or(a._addedOrder, 0)) - or(b.zIndex, or(b._addedOrder, 0)));
	};
	
	Core.prototype._attachChild = function(component) {
		component._addedOrder = addedOrder++;
		this.childs[component.uid] = component;
		this.childsDrawOrder.push(component.uid);
		this.updateChildsOrderFromZindex();
		component.parent = this;
		component._registerAllEvents();
		if (this._childNames[component.name]) {
			console.warn('Core.prototype._attachChild > a child with name `' + component.name + '` already exists > name map overwrited');
		}
		this._childNames[component.name] = component.uid;
	};
	
	Core.prototype.addChild = function(component) {
		this._attachChild(component);
		if (component.onAdded && typeof component.onAdded === 'function') {
			component.onAdded.call(component, this);
		}
	};

	// get child by name
	Core.prototype.getChild = function (name) {
		if (this._childNames[name]) {
			return this.childs[this._childNames[name]];
		}
		return null;
	}

	// this is a remove, not a delete: the caller still need to delete the component after calling this
	Core.prototype.removeChild = function(component) {
		var uid = component.uid;
		var name = component.name;
		// remove the element reference from childs draw order
		this.childsDrawOrder = this.childsDrawOrder.filter(function(objUid) {
			return objUid !== uid;
		});
		// remove the name map key if any
		if (this._childNames[name]) {
			delete this._childNames[name];
		}
		// delete the object instance 
		this.childs[uid] = null;
		// and the map key
		delete this.childs[uid];
	};
	
	Core.prototype.updateChildsOrderFromZindex = function() {
		var that = this;
		this.childsDrawOrder.sort(function (uid1, uid2) { // pffff.. but on iOS .bind() doesn't exist and without it no context in the sort function :(
			return that._zIndexSort.call(that, uid1, uid2);
		});
	};

	Core.prototype._changeZindex = function(newZindex) {
		this.zIndex = newZindex;
		if (this.parent) {
			this.parent.updateChildsOrderFromZindex();
		}
	}

	Core.prototype.changeZindex = function(newZindex, isVisual) {
		// Timeout when element is visual is to avoid flickering: because we are drawing childs in a certain order,
		// if we reorder the childs during the same thread as the draw, some childs may be drawn 2 times and other ones never
		if (isVisual) {
			var that = this;
			setTimeout(function() {
				that._changeZindex(newZindex);
			}, 0);
		} else {
			this._changeZindex(newZindex);
		}
	}
	
	Core.prototype.prepareDestroy = function() {
		if (this.parent) {
			this.parent.removeChild(this);
		}
	};
	
	// ------------------------------------------
	// Update
	// ------------------------------------------

	Core.prototype.update = function(ctx) {
		var childs = this.childs;
		var childsDrawOrder = this.childsDrawOrder;
		if (this.visible) {
			for (var i = 0, l = childsDrawOrder.length; i < l; i++) {
				if (childs[childsDrawOrder[i]].visible) {
					childs[childsDrawOrder[i]].update(ctx);
				}
			}
		}
	};
	
	// ------------------------------------------
	// To retrieve root element
	// ------------------------------------------
	
	Core.prototype.getRootForceCanvasSystemElement = function () {
		if (this.parent) {
			return this.parent.getRootForceCanvasSystemElement();
		}
		return this;
	};
	
	// ------------------------------------------
	// Events
	// ------------------------------------------
	
	// to send the information to the root object that we want to create a listner on this event
	// this method should be overwrided by this root object, to register this event this event type on
	// the event manager used in the app (Hammer or whatever)
	Core.prototype._registerEvent = function(evt) {
		if (this.parent) {
			this.parent._registerEvent(evt);
		} else {
			// unable to forward the event type to a parent
			// that's strange and looks like another component registered on the current one while this one is not
			// attached to anything. To be sure this event will be registered to the parent when the current component
			// will be attached, we create an empty key.
			if (!this._events[evt]) {
				this._events[evt] = [];
			}
		}
	};

	// used in the case some events have been defined before being added to a parent, the root object
	// may have not registered the event yet
	Core.prototype._registerAllEvents = function() {
		var events = Object.keys(this._events);
		for (var i = 0, len = events.length; i < len; i++) {
			this._registerEvent(events[i]);
		}
	};

	Core.prototype.on = function (evt, fn) {
		if (!this._events[evt]) {
			this._events[evt] = [];
		}
		this._events[evt].push(fn);
		this._registerEvent(evt);
	}
	
	Core.prototype._on = function (eventData) {
		var msg;
		if (this.visible && this.isEnabled()) {
			for (var i = 0, len = this.childsDrawOrder.length; i < len; i++) {
				// we go throw in inverse draw order to trigger first upper layers (if those want to cancel event propagation)
				msg = this.childs[this.childsDrawOrder[len - i - 1]]._on(eventData);
				if (msg && msg.stopPropagation) {
					return msg;
				}
			}
			
			if (this._events[eventData.type]) {
				for (var i = 0; i < this._events[eventData.type].length; i++) {
					msg = this._events[eventData.type][i].call(this, eventData);
					if (msg && msg.stopPropagation) {
						return msg;
					}
				}
			}
		}
	}

	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.Core', Core);
})();