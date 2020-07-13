/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 INBOXSet in the list
// * All 3 INBOXSet have at least one InboxToAttachmentNav

sap.ui.require([
	"sap/ui/test/Opa5",
	"ExtensionApproval/ExtensionApproval/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"ExtensionApproval/ExtensionApproval/test/integration/pages/App",
	"ExtensionApproval/ExtensionApproval/test/integration/pages/Browser",
	"ExtensionApproval/ExtensionApproval/test/integration/pages/Master",
	"ExtensionApproval/ExtensionApproval/test/integration/pages/Detail",
	"ExtensionApproval/ExtensionApproval/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "ExtensionApproval.ExtensionApproval.view."
	});

	sap.ui.require([
		"ExtensionApproval/ExtensionApproval/test/integration/MasterJourney",
		"ExtensionApproval/ExtensionApproval/test/integration/NavigationJourney",
		"ExtensionApproval/ExtensionApproval/test/integration/NotFoundJourney",
		"ExtensionApproval/ExtensionApproval/test/integration/BusyJourney"
	], function () {
		QUnit.start();
	});
});