sap.ui.define([
	"BudgetExtension/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"BudgetExtension/model/formatter",
	"sap/ui/core/library",
	"sap/ui/unified/library",
	"sap/ui/model/Sorter"
], function(BaseController, JSONModel, MessageToast, MessageBox, Fragment, Filter, FilterOperator, FilterType, formatter, CoreLibrary,
	UnifiedLibrary, Sorter) {
	"use strict";

	return BaseController.extend("BudgetExtension.controller.Display", {
		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf BudgetExtension.view.Display
		 */
		onInit: function() {
			// configurationModel will contain data like user role and view mode(view budget, change and edit budget , not authorized to see any budgets)

			this.oDataModel = this.getOwnerComponent().getModel();
			this.configurationModel = new JSONModel();
			this.budgetModel = new JSONModel();
			this.processFlowModel = new JSONModel();
			this.filterModel = new JSONModel();
			
			this.filterSuggestionFlag = false;

			this.setModel(this.configurationModel, "configurationModel");
			this.setModel(this.budgetModel, "budgetModel");
			this.setModel(this.processFlowModel, "processFlowModel");
			this.setModel(this.filterModel, "filterModel");

			this.filterModel.setData(this.retriveDefaultFilters());
			this.configurationModel.setData(this.retriveDefaultConfSetting());

			this.retriveBudgetAllocation();
		},

		retriveBudgetAllocation: function() {

			var notAuth = this.getTextFromResourceBundle("notAuthStatus"),
				emptyAndAuthFlag = false,
				that = this,
				oFilters = [],
				BDGPath = "/BdgAllocationSet";

			oFilters.push(new Filter("BdgMonth", FilterOperator.EQ, ""));

			this.configurationModel.setProperty("/busyIndicatorFlag", true);

			this.oDataModel.read(BDGPath, {

				filters: oFilters,
				method: "GET",
				success: function(data) {
					var budgetArr = data.results;
					budgetArr.forEach(function(x) {
						// check if user dosen't have any role to view this app 
						if (x.SalesDesc === notAuth) {
							emptyAndAuthFlag = true;
							that.configurationModel.setProperty("/role", "NotAuthorized");
							return;
						}
						if (x.BdgId === "0000000000") {
							emptyAndAuthFlag = true;
							return;
						}
					});

					if (!emptyAndAuthFlag) {
						that.budgetModel.setData(data);
						if (!that.filterSuggestionFlag) {
							that.setSuggestionOfFilters(budgetArr);
							that.filterSuggestionFlag = true;
						}
					}
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					return;
				},
				error: function(error) {
					MessageToast.show(that.getTextFromResourceBundle("failureBdgReq"));
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					return;
				}

			});
		},

		onDisplayExtPress: function(oEvent) {

			var
				indexPath = oEvent.getSource().getBindingContext("budgetModel").getPath(),
				selectedIndex = this.getIndexOfIem(indexPath),
				budgetId = this.budgetModel.getProperty("/results")[selectedIndex].BdgId,
				oRouter = this.getRouter();
			// currency = this.budgetModel.getProperty("/results")[selectedIndex].Currency,
			// budgetHistoryPath = "/BdgAllocationSet('" + budgetId + "')/AllocationToExtensionNav",
			// that = this;

			oRouter.navTo("Route_Created_Ext", {

				BdgId: budgetId
			});

		},


		onSelectionChange: function(oEvent) {
			var selectedKey = oEvent.getParameters().key;

			if (selectedKey === "flowSummary") {
				this.getView().byId("processFlowPanelId").setVisible(false);
				this.getView().byId("flowSummaryPanelId").setVisible(true);
			} else {
				this.getView().byId("flowSummaryPanelId").setVisible(false);
				this.getView().byId("processFlowPanelId").setVisible(true);
			}

		},

		onCreateExtPress: function(oEvent) {
			var indexPath = oEvent.getSource().getBindingContext("budgetModel").sPath,
				selectedIndex = this.getIndexOfIem(indexPath),
				oRouter = this.getRouter();
		
			oRouter.navTo("Route_Create_Ext", {

				BdgId: this.budgetModel.getProperty("/results")[selectedIndex].BdgId
			});

		},

	
		onCancelPress: function(oEvent) {

			var oTable = this.getView().byId("budgetTableId"),
				oItems = oTable.mAggregations.items;

			this.setAppMode("View");
			this.retriveBudgetAllocation();
			this.clearStateOfAllInputs(oItems);
		},

		setSuggestionOfFilters: function(arr) {
			var dntypeArr = [],
				salesChannelArr = [],
				brandArr = [],
				dntypes = [],
				salesChannels = [],
				brands = [],
				dntypeObj = {},
				salesObj = {},
				brandObj = {};

			arr.forEach(function(x) {

				if (!dntypeArr.includes(x.DnType)) {
					// x.DnType = formatter.captalizeFirstChar(x.DnType);
					dntypeArr.push(x.DnType);
				}

				if (!salesChannelArr.includes(x.SalesDesc)) {
					// x.SalesDesc = formatter.captalizeFirstChar(x.SalesDesc);
					salesChannelArr.push(x.SalesDesc);
				}

				if (!brandArr.includes(x.Brand)) {
					// x.Brand = formatter.captalizeFirstChar(x.Brand);
					brandArr.push(x.Brand);
				}

			});

			dntypeArr.forEach(function(x) {
				dntypeObj.DnType = formatter.captalizeFirstChar(x);
				dntypes.push(dntypeObj);
				dntypeObj = {};
			});

			salesChannelArr.forEach(function(x) {
				salesObj.SalesDesc = formatter.captalizeFirstChar(x);
				salesChannels.push(salesObj);
				salesObj = {};
			});

			brandArr.forEach(function(x) {
				brandObj.Brand = formatter.captalizeFirstChar(x);
				brands.push(brandObj);
				brandObj = {};
			});

			this.filterModel.setProperty("/DNTypes", dntypes);
			this.filterModel.setProperty("/SalesChannels", salesChannels);
			this.filterModel.setProperty("/Brands", brands);

		},

		onFilterPress: function(oEvent) {
			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this._filterFragment = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.Filter", this);
			this.getView().addDependent(this._filterFragment);
			this._filterFragment.setModel(this.configurationModel);
			this._filterFragment.setModel(this.filterModel);
			this._filterFragment.open();
			this.configurationModel.setProperty("/busyIndicatorFlag", false);
		},

		onSortPress: function(oEvent) {
			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this._sortFragment = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.Sort", this);
			this.getView().addDependent(this._sortFragment);
			this._sortFragment.setModel(this.configurationModel);
			this._sortFragment.open();
			this.configurationModel.setProperty("/busyIndicatorFlag", false);
		},

		onSortConfirm: function(oEvent) {
			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			var oTable = this.getView().byId("budgetTableId"),
				oParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				oSorter = new Sorter(oParams.sortItem.getKey(), oParams.sortDescending);

			oBinding.sort([oSorter]);
			this.configurationModel.setProperty("/busyIndicatorFlag", false);

		},

		onApplyFilter: function(oEvent) {

			this.handleAddingFilters();

			var dnTypeFilter = this.filterModel.getProperty("/SelectedDnType"),
				channelFilter = this.filterModel.getProperty("/SelectedSalesChannel"),
				brandFilter = this.filterModel.getProperty("/SelectedBrand"),
				createdByFilter = this.filterModel.getProperty("/UserId"),
				createdFrom = this.filterModel.getProperty("/CreatedFrom").split('.')[1],
				createdTo = this.filterModel.getProperty("/CreatedTo").split('.')[1],
				createdFromMonthFilter = createdFrom ? this.addLeftZero(createdFrom, 2) : "undefined",
				createdToMonthFilter = createdTo ? this.addLeftZero(createdTo, 2) : "undefined",
				createdFromYearFilter = createdFrom ? this.filterModel.getProperty("/CreatedFrom").split('.')[2] : "undefined",
				createdToYearFilter = createdTo ? this.filterModel.getProperty("/CreatedTo").split('.')[2] : "undefined",
				oFilters = [],
				dateValidator = "",
				oTable = this.getView().byId("budgetTableId");

			if (dnTypeFilter) {
				oFilters.push(new Filter("DnType", FilterOperator.Contains, dnTypeFilter));
			}
			if (channelFilter) {
				oFilters.push(new Filter("SalesDesc", FilterOperator.Contains, channelFilter));
			}
			if (brandFilter) {
				oFilters.push(new Filter("Brand", FilterOperator.Contains, brandFilter));
			}
			if (createdByFilter) {
				oFilters.push(new Filter("UserId", FilterOperator.Contains, createdByFilter));
			}

			if (createdFromMonthFilter !== "undefined" || createdToMonthFilter !== "undefined") {
				if (createdFromMonthFilter !== "undefined" && createdToMonthFilter !== "undefined") {

					dateValidator = this.validteDatePicker(createdFromMonthFilter, createdFromYearFilter, createdToMonthFilter, createdToYearFilter);

					if (dateValidator) {
						oFilters.push(new Filter("BdgMonth", FilterOperator.BT, createdFromMonthFilter, createdToMonthFilter));
						oFilters.push(new Filter("BdgYear", FilterOperator.BT, createdFromYearFilter, createdToYearFilter));
					} else {
						MessageToast.show(this.getTextFromResourceBundle("invalidDate"));
						return;
					}

				} else {
					if (createdFromMonthFilter !== "undefined") {
						oFilters.push(new Filter("BdgMonth", FilterOperator.GE, createdFromMonthFilter));
						oFilters.push(new Filter("BdgYear", FilterOperator.GE, createdFromYearFilter));
					} else {
						oFilters.push(new Filter("BdgMonth", FilterOperator.LE, createdToMonthFilter));
						oFilters.push(new Filter("BdgYear", FilterOperator.LE, createdToYearFilter));
					}
				}

			}

			oTable.getBinding("items").filter(oFilters);
			this._filterFragment.destroy();
		},

		onClearFilter: function(oEvent) {
			// this.filterModel.setData(this.retriveDefaultFilters);
			var oTable = this.getView().byId("budgetTableId");
			oTable.getBinding("items").filter([]);
			this.clearAllAppliedFilters();
			this._filterFragment.destroy();
		},

		onCancelFilter: function(oEvent) {
			// this.byId("dnTypeInputId").data("customData", oKey);
			this._filterFragment.destroy();
		},

		onNavBack: function(oEvent) {
			var oNavCon = Fragment.byId(this.getView().getId(), "navCon");
			oNavCon.back();
			this.removeProccessFlow();
			this._DisplayExtFragment.focus();
		},

		removeProccessFlow: function() {

			// 			this.getView().byId("processFlow").destroyLayoutData();
			// 			this.getView().byId("processFlow").removeAllNodes();
			this.processFlowModel.setProperty("/flowSummary", "");
			this.processFlowModel.setProperty("/nodes", "");
			this.processFlowModel.setProperty("/lanes", "");
			// this.processFlowModel.setData({}); 
		}

	});

});