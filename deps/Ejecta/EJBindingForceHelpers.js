/**
 * Requires the files EJBindingForceHelpers.h and EJBindingForceHelpers.m to be present
 *   in Source/Ejecta/EJUtils folder
 */
(function() {
	if (!force.modules.environment.isEjecta()) { return; }
	
	var mod = {};
	
	mod._ejectaHelpers = null;

	function instanciateIfNecessary() {
		if (!mod._ejectaHelpers) {
			mod._ejectaHelpers = new Ejecta.ForceHelpers();
		}
	};

	mod.getIdentifierForVendor = function () {
		instanciateIfNecessary();
		return mod._ejectaHelpers.getIdentifierForVendor();
	};

	// exposing on Ejecta's Force module
	if (!window.ejecta.Force) {
		window.ejecta.Force = {};
	}
	window.ejecta.Force.getIdentifierForVendor = mod.getIdentifierForVendor;
})();