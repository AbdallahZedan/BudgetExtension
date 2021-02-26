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
				noBudget = this.getTextFromResourceBundle("noBudget"),
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
						x.CreationDate.setHours(0);
						if (x.SalesDesc === notAuth) {
							emptyAndAuthFlag = true;
							that.configurationModel.setProperty("/role", "NotAuthorized");
							return;
						}
						if (x.SalesDesc === noBudget) {
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

		handleSelectionFinish: function(oEvent) {
			var comboBoxId = oEvent.getSource().getId().split("-")[2],
				selectedItems = oEvent.getParameter("selectedItems"),
				filterArr = [];

			// get all selected values
			selectedItems.forEach(function(item) {
				filterArr.push(item.getText());
			});

			// add filter values on its own filter property 
			switch (comboBoxId) {
				case "DNTypeMComboBoxId":
					this.filterModel.setProperty("/SelectedDnType", filterArr);
					break;
				case "brandMComboBoxId":
					this.filterModel.setProperty("/SelectedBrand", filterArr);
					break;
				case "salesChannelMComboBoxId":
					this.filterModel.setProperty("/SelectedSalesChannel", filterArr);
					break;
				case "createdFromMMComboBoxId":
					this.filterModel.setProperty("/SelectedMonth", filterArr);
					break;
				case "createdFromYMComboBoxId":
					this.filterModel.setProperty("/SelectedYear", filterArr);
					break;
				case "createdByMComboBoxId":
					this.filterModel.setProperty("/SelectedUser", filterArr);
					break;
			}
		},

		setSuggestionOfFilters: function(arr) {
			var dntypeArr = [],
				salesChannelArr = [],
				brandArr = [],
				userArr = [],
				monthArr = [],
				yearArr = [],
				dntypes = [],
				salesChannels = [],
				brands = [],
				users = [],
				months = [],
				years = [],
				dntypeObj = {},
				salesObj = {},
				brandObj = {},
				userObj = {},
				monthObj = {},
				yearObj = {};

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

				if (!userArr.includes(x.UserId)) {
					userArr.push(x.UserId);
				}

				if (!monthArr.includes(x.BdgMonth)) {
					monthArr.push(x.BdgMonth);
				}

				if (!yearArr.includes(x.BdgYear)) {
					yearArr.push(x.BdgYear);
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

			userArr.forEach(function(x) {
				userObj.UserId = formatter.captalizeFirstChar(x);
				users.push(userObj);
				userObj = {};
			});

			monthArr.forEach(function(x) {
				monthObj.BdgMonth = formatter.leftShiftZeros(x);
				months.push(monthObj);
				monthObj = {};
			});

			yearArr.forEach(function(x) {
				yearObj.BdgYear = x;
				years.push(yearObj);
				yearObj = {};
			});

			this.filterModel.setProperty("/DNTypes", dntypes);
			this.filterModel.setProperty("/SalesChannels", salesChannels);
			this.filterModel.setProperty("/Brands", brands);
			this.filterModel.setProperty("/Users", users);
			this.filterModel.setProperty("/Months", months);
			this.filterModel.setProperty("/Years", years);

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

			// this.handleAddingFilters();

			// var dnTypeFilter = this.filterModel.getProperty("/SelectedDnType"),
			// 	channelFilter = this.filterModel.getProperty("/SelectedSalesChannel"),
			// 	brandFilter = this.filterModel.getProperty("/SelectedBrand"),
			// 	createdByFilter = this.filterModel.getProperty("/UserId"),
			// 	createdFrom = this.filterModel.getProperty("/CreatedFrom").split('.')[1],
			// 	createdTo = this.filterModel.getProperty("/CreatedTo").split('.')[1],
			// 	createdFromMonthFilter = createdFrom ? this.addLeftZero(createdFrom, 2) : "undefined",
			// 	createdToMonthFilter = createdTo ? this.addLeftZero(createdTo, 2) : "undefined",
			// 	createdFromYearFilter = createdFrom ? this.filterModel.getProperty("/CreatedFrom").split('.')[2] : "undefined",
			// 	createdToYearFilter = createdTo ? this.filterModel.getProperty("/CreatedTo").split('.')[2] : "undefined",
			// 	dateValidator = "",
			var dnTypeFilters = this.filterModel.getProperty("/SelectedDnType"),
				channelFilters = this.filterModel.getProperty("/SelectedSalesChannel"),
				brandFilters = this.filterModel.getProperty("/SelectedBrand"),
				bdgMonthFilters = this.filterModel.getProperty("/SelectedMonth"),
				bdgYearFilters = this.filterModel.getProperty("/SelectedYear"),
				createdByFilters = this.filterModel.getProperty("/SelectedUser"),
				createdFrom = this.filterModel.getProperty("/CreatedFrom") ? this.filterModel.getProperty("/CreatedFrom") : undefined,
				createdTo = this.filterModel.getProperty("/CreatedTo") ? this.filterModel.getProperty("/CreatedTo") : undefined,
				createdFromFilter = new Date(formatter.formatDateWithDot(createdFrom)),
				createdToFilter = new Date(formatter.formatDateWithDot(createdTo)),
				oTable = this.getView().byId("budgetTableId"),
				oFilters = [],
				dateValidator = "",
				that = this;

			// if (dnTypeFilter) {
			// 	oFilters.push(new Filter("DnType", FilterOperator.Contains, dnTypeFilter));
			// }
			// if (channelFilter) {
			// 	oFilters.push(new Filter("SalesDesc", FilterOperator.Contains, channelFilter));
			// }
			// if (brandFilter) {
			// 	oFilters.push(new Filter("Brand", FilterOperator.Contains, brandFilter));
			// }
			// if (createdByFilter) {
			// 	oFilters.push(new Filter("UserId", FilterOperator.Contains, createdByFilter));
			// }

			// if (createdFromMonthFilter !== "undefined" || createdToMonthFilter !== "undefined") {
			// 	if (createdFromMonthFilter !== "undefined" && createdToMonthFilter !== "undefined") {

			// 		dateValidator = this.validteDatePicker(createdFromMonthFilter, createdFromYearFilter, createdToMonthFilter, createdToYearFilter);

			// 		if (dateValidator) {
			// 			oFilters.push(new Filter("BdgMonth", FilterOperator.BT, createdFromMonthFilter, createdToMonthFilter));
			// 			oFilters.push(new Filter("BdgYear", FilterOperator.BT, createdFromYearFilter, createdToYearFilter));
			// 		} else {
			// 			MessageToast.show(this.getTextFromResourceBundle("invalidDate"));
			// 			return;
			// 		}

			// 	} else {
			// 		if (createdFromMonthFilter !== "undefined") {
			// 			oFilters.push(new Filter("BdgMonth", FilterOperator.GE, createdFromMonthFilter));
			// 			oFilters.push(new Filter("BdgYear", FilterOperator.GE, createdFromYearFilter));
			// 		} else {
			// 			oFilters.push(new Filter("BdgMonth", FilterOperator.LE, createdToMonthFilter));
			// 			oFilters.push(new Filter("BdgYear", FilterOperator.LE, createdToYearFilter));
			// 		}
			// 	}

			// }

			if (dnTypeFilters) {
				dnTypeFilters.forEach(function(dnType) {
					oFilters.push(new Filter("DnType", FilterOperator.EQ, dnType));
				});
			}

			if (channelFilters) {
				channelFilters.forEach(function(channel) {
					oFilters.push(new Filter("SalesDesc", FilterOperator.EQ, channel));
				});
			}

			if (brandFilters) {
				brandFilters.forEach(function(brand) {
					oFilters.push(new Filter("Brand", FilterOperator.EQ, brand));
				});
			}

			if (createdByFilters) {
				createdByFilters.forEach(function(user) {
					oFilters.push(new Filter("UserId", FilterOperator.EQ, user));
				});
			}

			if (bdgMonthFilters) {
				bdgMonthFilters.forEach(function(month) {
					oFilters.push(new Filter("BdgMonth", FilterOperator.EQ, that.addLeftZero(month, 2)));
				});
			}

			if (bdgYearFilters) {
				bdgYearFilters.forEach(function(year) {
					oFilters.push(new Filter("BdgYear", FilterOperator.EQ, year));
				});
			}

			if (createdFrom !== undefined || createdTo !== undefined) {
				if (createdFrom !== undefined && createdTo !== undefined) {
					// make sure two dates are not overlapped
					dateValidator = this.dateNotOverlapped(createdFrom, createdTo);

					if (dateValidator) {
						if (createdFrom === createdTo) {
							oFilters.push(new Filter("CreationDate", FilterOperator.EQ, createdFromFilter));
						} else {
							oFilters.push(new Filter("CreationDate", FilterOperator.BT, createdFromFilter, createdToFilter));
							// oFilters.push(new Filter("CreationDate", FilterOperator.GE, createdFromFilter));
							// oFilters.push(new Filter("CreationDate", FilterOperator.LE, createdToFilter));
						}
					} else {
						MessageToast.show(this.getTextFromResourceBundle("invalidDate"));
						return;
					}
				} else {
					if (createdFrom !== undefined) {
						oFilters.push(new Filter("CreationDate", FilterOperator.GE, createdFromFilter));
					} else {
						oFilters.push(new Filter("CreationDate", FilterOperator.LE, createdToFilter));
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