/**
 * Requires the files EJBindingForceAlertView.h and EJBindingForceAlertView.m to be present
 *   in Source/Ejecta/EJUtils folder
 */
(function() {
	if (!force.modules.environment.isEjecta()) { return; }
	
	var mod = {};

	mod._ejectaAlertView = null;
	var alertViewOpened = false;
	var alertViewsStack = [];
	var alertViewCurrentCb = null;

	function instanciateAlertViewIfNecessary() {
		if (!mod._ejectaAlertView) {
			mod._ejectaAlertView = new Ejecta.ForceAlertView();
		}
	};

	function alertViewCb(val) {
		if (alertViewCurrentCb) {
			alertViewCurrentCb(val);
			alertViewCurrentCb = null;
		}

		if (alertViewsStack.length > 0) {
			var nextAlertView = alertViewsStack.shift();

			if (nextAlertView.type === 'alert') {
				alertViewOpened = false;
				mod.alert(nextAlertView.title, nextAlertView.message, nextAlertView.buttonText, nextAlertView.cb);
			} else if (nextAlertView.type === 'confirm') {
				alertViewOpened = false;
				mod.confirm(nextAlertView.title, nextAlertView.message, nextAlertView.buttonOkText, nextAlertView.buttonCancelText, nextAlertView.cb);
			} else if (nextAlertView.type === 'getText') {
				alertViewOpened = false;
				mod.confirm(nextAlertView.title, nextAlertView.message, nextAlertView.defaultText, nextAlertView.keyboardType, nextAlertView.buttonOkText, nextAlertView.buttonCancelText, nextAlertView.cb);
			}
		} else {
			alertViewOpened = false;
		}
	}

	mod.alert = function (title, message, buttonText, cb) {

		if (alertViewOpened) {
			alertViewsStack.push({
				type: 'alert',
				title: title,
				message: message,
				buttonText: buttonText,
				cb: cb
			});
			return;
		}

		alertViewOpened = true;

		title              = title      || 'Information';
		message            = message    || '';
		buttonText         = buttonText || 'OK';
		alertViewCurrentCb = cb         || function() {};

		instanciateAlertViewIfNecessary();

		setTimeout(function() { // to avoid further calls of alertview in another alertview callback thread, where the previous one is not complete yet
			mod._ejectaAlertView.alert(title, message, buttonText, alertViewCb);
		}, 0);
	};

	mod.confirm = function (title, message, buttonOkText, buttonCancelText, cb) {

		if (alertViewOpened) {
			alertViewsStack.push({
				type: 'confirm',
				title: title,
				message: message,
				buttonOkText: buttonOkText,
				buttonCancelText: buttonCancelText,
				cb: cb
			});
			return;
		}

		alertViewOpened = true;

		title              = title            || 'Confirm';
		message            = message          || '';
		buttonOkText       = buttonOkText     || 'OK';
		buttonCancelText   = buttonCancelText || 'Cancel';
		alertViewCurrentCb = cb               || function() {};

		instanciateAlertViewIfNecessary();

		setTimeout(function() {
			mod._ejectaAlertView.confirm(title, message, buttonOkText, buttonCancelText, alertViewCb);
		}, 0);
	};

	mod.getText = function(title, message, defaultText, keyboardType, buttonOkText, buttonCancelText, cb) {
		if (alertViewOpened) {
			alertViewsStack.push({
				type: 'getText',
				title: title,
				message: message,
				defaultText: defaultText,
				keyboardType: keyboardType,
				buttonOkText: buttonOkText,
				buttonCancelText: buttonCancelText,
				cb: cb
			});
			return;
		}

		alertViewOpened = true;

		title              = title            || 'Enter value';
		message            = message          || 'New value:';
		defaultText        = defaultText      || '';
		keyboardType       = keyboardType     || 'TEXT';
		buttonOkText       = buttonOkText     || 'OK';
		buttonCancelText   = buttonCancelText || 'Cancel';
		alertViewCurrentCb = cb               || function() {};

		instanciateAlertViewIfNecessary();

		setTimeout(function() {
			mod._ejectaAlertView.getText(title, message, defaultText, keyboardType, buttonOkText, buttonCancelText, alertViewCb);
		}, 0);
	};

	// exposing on Ejecta's Force module
	if (!window.ejecta.Force) {
		window.ejecta.Force = {};
	}
	window.ejecta.Force.alert = mod.alert;
	window.ejecta.Force.confirm = mod.confirm;
	window.ejecta.Force.getText = mod.getText;
})();