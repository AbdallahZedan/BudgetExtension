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
], function(Controller, JSONModel, MessageToast, MessageBox, Fragment, Filter, FilterOperator, FilterType, formatter, CoreLibrary,
	UnifiedLibrary, Sorter) {
	"use strict";

	return Controller.extend("BudgetExtension.controller.Display", {
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
			this.extensionModel = new JSONModel();
			this.processFlowModel = new JSONModel();
			this.createExtModel = new JSONModel();
			this.filterModel = new JSONModel();
			this.filterSuggestionFlag = false;

			this.setModel(this.configurationModel, "configurationModel");
			this.setModel(this.budgetModel, "budgetModel");
			this.setModel(this.extensionModel, "extensionModel");
			this.setModel(this.processFlowModel, "processFlowModel");
			this.setModel(this.createExtModel, "createExtModel");
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
				currency = this.budgetModel.getProperty("/results")[selectedIndex].Currency,
				budgetHistoryPath = "/BdgAllocationSet('" + budgetId + "')/AllocationToExtensionNav",
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);

			this._DisplayExtFragment = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.Created_Extensions", this);
			this.getView().addDependent(this._DisplayExtFragment);
			this._DisplayExtFragment.setModel(this.configurationModel);
			this._DisplayExtFragment.setModel(this.extensionModel);
			this._DisplayExtFragment.setModel(this.processFlowModel);

			this.oDataModel.read(budgetHistoryPath, {
				method: "GET",
				success: function(data) {
					that.extensionModel.setData(data);
					that.extensionModel.setProperty("/Currency", currency);
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that._DisplayExtFragment.open();
				},

				error: function(error) {
					MessageToast.show(that.getTextFromResourceBundle("failDisplayExt"));
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that._DisplayExtFragment.destroy();
					return;
				}

			});

		},

		onNavToProcessFlow: function(oEvent) {

			var indexPath = oEvent.getSource().getBindingContext("extensionModel").getPath(),
				selectedIndex = this.getIndexOfIem(indexPath),
				budgetId = this.extensionModel.getProperty("/results")[selectedIndex].BdgId,
				lineId = this.extensionModel.getProperty("/results")[selectedIndex].LineId,
				createdBy = this.extensionModel.getProperty("/results")[selectedIndex].UserId;

			this.setConfigOfLaneAndNode(budgetId, lineId, createdBy);

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
			var
				indexPath = oEvent.getSource().getBindingContext("budgetModel").sPath,
				selectedIndex = this.getIndexOfIem(indexPath),
				extObj = {
					"OriginalBdg": this.budgetModel.getProperty("/results")[selectedIndex].OriginalBdg,
					"RemaningBdg": this.budgetModel.getProperty("/results")[selectedIndex].RemaningBdg,
					"CompCode": this.budgetModel.getProperty("/results")[selectedIndex].CompanyCode,
					"BdgId": this.budgetModel.getProperty("/results")[selectedIndex].BdgId,
					"Currency": this.budgetModel.getProperty("/results")[selectedIndex].Currency,
					"ExtAmount": ""
				};

			this.createExtModel.setData(extObj);

			this._CreateExtFragment = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.Create_Extension", this);
			this.getView().addDependent(this._CreateExtFragment);
			this._CreateExtFragment.setModel(this.configurationModel);
			this._CreateExtFragment.setModel(this.createExtModel);
			this._CreateExtFragment.open();

		},

		onReleasePress: function(oEvent) {

			var createExtBdg = "/BdgExtensionSet",
				oExtBudget = {},
				that = this,
				bdgId = this.createExtModel.getProperty("/ExtAmount"),
				currency = this.createExtModel.getProperty("/Currency"),
				companyCode = this.createExtModel.getProperty("/CompCode"),
				remAmount = this.createExtModel.getProperty("/RemaningBdg"),
				validatorFlag = false,
				oValidator = [],
				oValidatorObj = {
					id: this.getView().byId("extAmountInputlId"),
					type: "float",
					max: 16
				};

			oValidator.push(oValidatorObj);
			validatorFlag = this.validator(oValidator);

			oExtBudget.BdgId = this.createExtModel.getProperty("/BdgId");
			oExtBudget.ExtAmount = formatter.roundAmount(bdgId, currency);
			oExtBudget.CompCode = companyCode;
			oExtBudget.Curr = currency;
			oExtBudget.RemAmount = remAmount;

			if (!validatorFlag) {
				MessageToast.show(this.getTextFromResourceBundle("ExtNotValid"));
				return;
			}

			this.configurationModel.setProperty("/busyIndicatorFlag", true);

			this.oDataModel.create(createExtBdg, oExtBudget, {

				success: function(data) {
					MessageBox.success(that.getTextFromResourceBundle("CreatSucc"), {
						actions: [MessageBox.Action.OK],
						onClose: function() {
							// make app in view mode after all budgets saved successfuly.
							that.configurationModel.setProperty("/busyIndicatorFlag", false);
							that._CreateExtFragment.destroy();
						}
					});
				},
				error: function(oError) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("CreatFail"));
				}
			});

		},

		onCloseDisplayDialog: function(oEvent) {
			this.removeProccessFlow();
			this._DisplayExtFragment.destroy();
		},

		onCloseCreateDialog: function(oEvent) {

			this._CreateExtFragment.destroy();

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

		setConfigOfLaneAndNode: function(budgetId, lineId, createdBy) {

			var inboxSetPath = "/INBOXSet",
				oModel = this.getOwnerComponent().getModel(),
				workflowType = new Filter("WorkflowType", FilterOperator.EQ, "EXTENSION"),
				requestFilter = new Filter("IMRequestId", FilterOperator.EQ, budgetId),
				lineIdFilter = new Filter("LineId", FilterOperator.EQ, lineId),
				filters = [requestFilter, workflowType, lineIdFilter],
				oNavCon = Fragment.byId(this.getView().getId(), "navCon"),
				oDetailPage = Fragment.byId(this.getView().getId(), "detail"),
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			oModel.read(inboxSetPath, {
				filters: filters,
				method: "GET",
				async: false,

				success: function(inboxSetData) {

					var flowSummaryArr = inboxSetData.results.filter(function(item) {
						return item.UserName === item.DecisionBy;
					});

					var inboxArr = inboxSetData.results;
					$.each(inboxArr, function(index, value) {
						inboxArr[index].StepNo = parseInt(value.StepNo).toString();
					});

					// var aInboxSetCopy = JSON.parse(JSON.stringify(aInboxSet));
					//delete adjacent duplicates from the the inbox set array

					var inboxArrCopy = inboxArr.filter(function(item, pos, arr) {
						// Always keep the 0th element as there is nothing before it
						// Then check if each element is different than the one before it
						return pos === 0 || item.StepNo !== arr[pos - 1].StepNo;
					});

					//intialize lane array which is first element refer to intiator
					var lanes = [{
						laneId: "0",
						iconSrc: "sap-icon://activate",
						label: that.getTextFromResourceBundle("inboxInitiator"),
						position: 0
					}];
					//intialize node array which is first element refer to intiator
					var nodes = [{
						nodeId: "0",
						laneId: "0",
						title: createdBy,
						titleAbbreviation: createdBy,
						children: [],
						state: sap.suite.ui.commons.ProcessFlowNodeState.Positive,
						stateText: that.getTextFromResourceBundle("requestActivated"),
						highlighted: true
					}];

					// construct array of any item belong to level 1 (stepNo equal 1)
					var children = inboxArr.filter(function(oValue) {
						return oValue.StepNo === '1';
					});

					// push nodes of level one as child of inititor node 
					children.forEach(function(child) {
						nodes[0].children.push(child.UserName + child.WorkItem);
					});

					// insert lane for each step
					inboxArrCopy.forEach(function(item) {

						lanes.push({
							laneId: item.StepNo,
							iconSrc: "sap-icon://monitor-payments",
							label: item.StepPosition,
							position: parseInt(item.StepNo)
						});

					});

					inboxArr.forEach(function(item) {
						nodes.push({
							nodeId: item.UserName + item.WorkItem,
							laneId: item.StepNo,
							title: item.UserName,
							titleAbbreviation: item.UserName,
							children: [],
							role: item.StepPosition,
							state: (item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("ApprovedStatus")) ? sap.suite
								.ui.commons
								.ProcessFlowNodeState
								.Positive : (item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("RejectedStatus")) ?
								sap.suite.ui.commons.ProcessFlowNodeState.Negative : sap.suite.ui.commons.ProcessFlowNodeState
								.Neutral,
							stateText: (item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("ApprovedStatus")) ?
								that.getTextFromResourceBundle(
									"Approve") :
								(item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("RejectedStatus")) ? that.getTextFromResourceBundle(
									"Reject") : that.getTextFromResourceBundle("Pending"),
							highlighted: (item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("ApprovedStatus")) ?
								true : (item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("RejectedStatus")) ? true : false,
							texts: [formatter.formatDate(item.DecisionDate), item.Comments]

						});

						var children = inboxArr.filter(function(oValue) {
							return oValue.StepNo === (parseInt(item.StepNo) + 1).toString();
						});

						children.forEach(function(child) {
							var childId = child.UserName + child.WorkItem;
							if (nodes[nodes.length - 1].nodeId !== childId) {
								nodes[nodes.length - 1].children.push(childId);
							}
						});

					});

					that.processFlowModel.setProperty("/flowSummary", flowSummaryArr);
					that.processFlowModel.setProperty("/lanes", lanes);
					that.processFlowModel.setProperty("/nodes", nodes);
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.getView().byId("processFlow").updateModel();
					oNavCon.to(oDetailPage);
					that._DisplayExtFragment.focus();

				},
				error: function(error) {
					MessageToast.show(that.getTextFromResourceBundle("failureGetInbox"));
				}

			});

		},

		onZoomInPress: function() {
			var oProcessFlow1 = this.getView().byId("processFlow");
			oProcessFlow1.zoomIn();
		},

		onZoomOutPress: function() {
			var oProcessFlow1 = this.getView().byId("processFlow");
			oProcessFlow1.zoomOut();
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