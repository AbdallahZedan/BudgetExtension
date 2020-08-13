sap.ui.define([
	"BudgetExtension/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"BudgetExtension/model/formatter",
	"sap/ui/core/routing/History"
], function(BaseController, JSONModel, MessageToast, MessageBox, formatter, History) {
	"use strict";

	return BaseController.extend("BudgetExtension.controller.Created_Extensions", {

		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf BudgetExtension.view.Created_Extensions
		 */
		onInit: function() {
			var oRouter = this.getRouter();

			this.oDataModel = this.getOwnerComponent().getModel();
			this.configurationModel = new JSONModel();
			this.extensionModel = new JSONModel();

			this.setModel(this.configurationModel, "configurationModel");
			this.setModel(this.extensionModel, "extensionModel");

			oRouter.getRoute("Route_Created_Ext").attachMatched(this._onRouteFound, this);
		},

		_onRouteFound: function(oEvtent) {

			var oArgument = oEvtent.getParameter("arguments"),
				budgetId = oArgument.BdgId,
				budgetHistoryPath = "/BdgAllocationSet('" + budgetId + "')/AllocationToExtensionNav",
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);

			this.oDataModel.read(budgetHistoryPath, {
				method: "GET",
				success: function(data) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.extensionModel.setData(data);
				},

				error: function(error) {
					MessageToast.show(that.getTextFromResourceBundle("failDisplayExt"));
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					return;
				}

			});
		},

		onNavToExtDetail: function(oEvent) {
			var indexPath = oEvent.getSource().getBindingContext("extensionModel").getPath(),
				selectedIndex = this.getIndexOfIem(indexPath),
				budgetId = this.extensionModel.getProperty("/results")[selectedIndex].BdgId,
				lineId = this.extensionModel.getProperty("/results")[selectedIndex].LineId,
				createdBy = this.extensionModel.getProperty("/results")[selectedIndex].UserId,
				oRouter = this.getRouter();

			oRouter.navTo("Route_Ext_Details", {

				BdgId: budgetId,
				LineId: lineId,
				CreatedBy: createdBy
			});
		},

		clearAll: function() {
			this.extensionModel.setData({});
		},

		onNavBack: function() {
			var oHistory, sPreviousHash;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();
			this.clearAll();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("Route_Display", {}, true /*no history*/ );
			}
		}

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf BudgetExtension.view.Created_Extensions
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf BudgetExtension.view.Created_Extensions
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf BudgetExtension.view.Created_Extensions
		 */
		//	onExit: function() {
		//
		//	}

	});

});