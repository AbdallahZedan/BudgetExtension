/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

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
		"ExtensionApproval/ExtensionApproval/test/integration/NavigationJourneyPhone",
		"ExtensionApproval/ExtensionApproval/test/integration/NotFoundJourneyPhone",
		"ExtensionApproval/ExtensionApproval/test/integration/BusyJourneyPhone"
	], function () {
		QUnit.start();
	});
});