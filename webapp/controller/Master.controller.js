/*global history */
sap.ui.define([
	"ExtensionApproval/ExtensionApproval/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"ExtensionApproval/ExtensionApproval/model/formatter",
	"ExtensionApproval/ExtensionApproval/model/grouper",
	"ExtensionApproval/ExtensionApproval/model/GroupSortState",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function(BaseController, JSONModel, Filter, FilterOperator, GroupHeaderListItem, Device, formatter, grouper, GroupSortState,
	MessageBox, MessageToast) {
	"use strict";

	return BaseController.extend("ExtensionApproval.ExtensionApproval.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function() {
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			// 			this._oGroupSortState = new GroupSortState(oViewModel, grouper.groupUnitNumber(this.getResourceBundle()));
			// this.onBypassed();
			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			this.filterModel = new JSONModel();
			this.inboxModel = new JSONModel();
			this.setModel(this.filterModel, "filterModel");
			this.setModel(this.inboxModel, "inboxModel");
			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function() {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList, this.inboxModel);
					// this._oListFilterState.aFilter = [
					// 	new Filter("UserName", FilterOperator.EQ,
					// 		// this.getModel("FLP").getProperty("/id")
					// 		"CIC2"),
					// 	// 		new Filter("Status", FilterOperator.EQ, "STARTED"),
					// 	new Filter("WorkflowType", FilterOperator.EQ, "EXTENSION")
					// ];
					// this.onBypassed();
					// this._applyFilterSearch();
				}.bind(this)
			});

			this.retriveAllExtRequsts();
			this.filterModel.setData(this._oListFilterState);
			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);
		},

		retriveAllExtRequsts: function() {

			var oModel = this.getOwnerComponent().getModel(),
				oFilters = [new Filter("UserName", FilterOperator.EQ,
						// this.getModel("FLP").getProperty("/id")
						"CIC2"),
					// 		new Filter("Status", FilterOperator.EQ, "STARTED"),
					new Filter("WorkflowType", FilterOperator.EQ, "EXTENSION")
				],
				inboxPath = "/INBOXSet",
				that = this;
			this.getView().setBusy(true);
			oModel.read(inboxPath, {
				method: "GET",
				filters: oFilters,
				async: false,
				success: function(inboxData) {

					inboxData.results.forEach(function(item) {
						item.CreationDate = new Date(formatter.formatDate2(item.CreationDate));
					});
					that.getView().setBusy(false);
					that.inboxModel.setData(inboxData);
				},
				error: function(error) {
					that.getView().setBusy(false);
					MessageToast.show(that.getTextFromResourceBundle("errorText"));
				}
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter and hides the pull to refresh control, if
		 * necessary.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			// hide pull to refresh if necessary
			this.byId("pullToRefresh").hide();
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("RequestId", FilterOperator.Contains, sQuery)];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			// 			this._oList.getBinding("items").refresh();
			this.retriveAllExtRequsts();
		},

		/**
		 * Event handler for the sorter selection.
		 * @param {sap.ui.base.Event} oEvent the select event
		 * @public
		 */
		onSort: function(oEvent) {

			var sKey = oEvent.getSource().getSelectedItem().getKey(),
				aSorters = this._oGroupSortState.sort(sKey);

			this._applyGroupSort(aSorters);
		},

		/**
		 * Event handler for the grouper selection.
		 * @param {sap.ui.base.Event} oEvent the search field event
		 * @public
		 */
		onGroup: function(oEvent) {
			var sKey = oEvent.getSource().getSelectedItem().getKey(),
				aSorters = this._oGroupSortState.group(sKey);

			this._applyGroupSort(aSorters);
		},

		/**
		 * Event handler for the filter button to open the ViewSettingsDialog.
		 * which is used to add or remove filters to the master list. This
		 * handler method is also called when the filter bar is pressed,
		 * which is added to the beginning of the master list when a filter is applied.
		 * @public
		 */
		onOpenViewSettings: function() {

			if (this.filterModel.getProperty("/AllStatus") === undefined) {
				this.setSuggestionFilters(this._oList);
			}

			this._filterFragment = sap.ui.xmlfragment(this.getView().getId(), "ExtensionApproval.ExtensionApproval.view.Filter", this);
			this.getView().addDependent(this._filterFragment);
			this._filterFragment.setModel(this.filterModel);

			this._filterFragment.open();

			// 			if (!this._oViewSettingsDialog) {
			// 				this._oViewSettingsDialog = sap.ui.xmlfragment("ExtensionApproval.ExtensionApproval.view.ViewSettingsDialog", this);
			// 				this.getView().addDependent(this._oViewSettingsDialog);
			// 				// forward compact/cozy style into Dialog
			// 				this._oViewSettingsDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			// 			}
			// 			this._oViewSettingsDialog.open();
		},

		onApplyFilter: function(oEvent) {

			this.handleAddingFilters();

			var companyFilter = this.filterModel.getProperty("/SelectedCompany"),
				statusFilter = this.filterModel.getProperty("/SelectedStatus"),
				createdByFilter = this.filterModel.getProperty("/CreatedBy"),
				createdFromFilter = this.filterModel.getProperty("/CreatedFrom"),
				createdToFilter = this.filterModel.getProperty("/CreatedTo"),
				createdFromDayFilter = createdFromFilter ? createdFromFilter.split('/')[0] : "undefined",
				createdToDayFilter = createdToFilter ? createdToFilter.split('/')[0] : "undefined",
				createdFromMonthFilter = createdFromFilter ? createdFromFilter.split('/')[1] : "undefined",
				createdToMonthFilter = createdToFilter ? createdToFilter.split('/')[1] : "undefined",
				createdFromYearFilter = createdFromFilter ? createdFromFilter.split('/')[2] : "undefined",
				createdToYearFilter = createdToFilter ? createdToFilter.split('/')[2] : "undefined",
				createdFromDate = new Date(createdFromFilter),
				createdToDate = new Date(createdToFilter),
				oFilters = [],
				dateValidator = "";

			createdFromDate.setMilliseconds(0);
			createdFromDate.setSeconds(0);
			createdFromDate.setMinutes(0);
			createdFromDate.setHours(0);

			createdToDate.setMilliseconds(0);
			createdToDate.setSeconds(59);
			createdToDate.setMinutes(59);
			createdToDate.setHours(23);

			if (companyFilter) {
				oFilters.push(new Filter("CompanyText", FilterOperator.Contains, companyFilter));
			}
			if (statusFilter) {
				oFilters.push(new Filter("Status", FilterOperator.Contains, statusFilter));
			}
			if (createdByFilter) {
				oFilters.push(new Filter("CreatedBy", FilterOperator.Contains, createdByFilter));
			}

			if (createdFromDayFilter !== "undefined" || createdToDayFilter !== "undefined") {
				if (createdFromDayFilter !== "undefined" && createdToDayFilter !== "undefined") {

					dateValidator = this.validteDatePicker(createdFromDayFilter, createdFromMonthFilter, createdFromYearFilter, createdToDayFilter,
						createdToMonthFilter, createdToYearFilter);

					if (dateValidator) {
						oFilters.push(new Filter("CreationDate", FilterOperator.BT, createdFromDate, createdToDate));
						// 		oFilters.push(new Filter("CreationDate", FilterOperator.BT, createdFromFilter, createdToFilter));
					} else {
						MessageToast.show(this.getTextFromResourceBundle("invalidDate"));
						return;
					}

				} else {
					if (createdFromDayFilter !== "undefined") {
						oFilters.push(new Filter("CreationDate", FilterOperator.GE, createdFromDate));
					} else {
						oFilters.push(new Filter("CreationDate", FilterOperator.LE, createdToDate));
					}
				}

			}

			this._oListFilterState.aSearch = oFilters;

			this._applyFilterSearch();
			// 			var oList = this.getView().byId("list");
			// 			oList.getBinding("items").filter(oFilters);
			this._filterFragment.destroy();
		},

		onClearFilter: function(oEvent) {
			// this.filterModel.setData(this.retriveDefaultFilters);
			this._oList.getBinding("items").filter([]);
			this.clearAllAppliedFilters();
			this._filterFragment.destroy();
		},

		onCancelFilter: function(oEvent) {
			this._filterFragment.destroy();
		},

		setSuggestionFilters: function(oList) {

			var statusArr = [],
				companyArr = [],
				allStatus = [],
				allCompany = [],
				Obj = {},
				statusValue,
				companyValue,
				items = oList.getItems();

			items.forEach(function(value) {
				statusValue = value.mAggregations.firstStatus.mProperties.text;
				companyValue = value.mAggregations.attributes[2].mProperties.text;

				if (!statusArr.includes(statusValue)) {
					statusArr.push(statusValue);
				}

				if (!companyArr.includes(companyValue)) {
					companyArr.push(companyValue);
				}

			});

			statusArr.forEach(function(value) {
				Obj.Status = value;
				allStatus.push(Obj);
				Obj = {};
			});

			companyArr.forEach(function(value) {
				Obj.Company = value;
				allCompany.push(Obj);
				Obj = {};
			});

			this.filterModel.setProperty("/AllStatus", allStatus);
			this.filterModel.setProperty("/AllCompany", allCompany);
		},

		handleAddingFilters: function() {

			var companyComboBox = this.getView().byId("companyComboBoxId"),
				statusComboBox = this.getView().byId("statusComboBoxId"),
				companyItem = companyComboBox.getSelectedItem(),
				statuslItem = statusComboBox.getSelectedItem(),
				lastCompanyValue = companyComboBox._lastValue,
				lastStatusValue = statusComboBox._lastValue,
				allCompanyArr = this.filterModel.getProperty("/AllCompany"),
				allStatusArr = this.filterModel.getProperty("/AllStatus"),
				companyArr = allCompanyArr ? allCompanyArr : [],
				statusArr = allStatusArr ? allStatusArr : [],
				newCompanyFilter = {},
				newStatusFilter = {};

			if (!companyItem && lastCompanyValue !== "") {
				companyComboBox.setSelectedKey(lastCompanyValue);
				newCompanyFilter.Company = lastCompanyValue;
				companyArr.push(newCompanyFilter);
				this.filterModel.setProperty("/AllCompany", companyArr);
			}

			if (!statuslItem && lastStatusValue !== "") {
				statusComboBox.setSelectedKey(lastStatusValue);
				newStatusFilter.SalesDesc = lastStatusValue;
				statusArr.push(newStatusFilter);
				this.filterModel.setProperty("/AllStatus", statusArr);
			}

		},

		clearAllAppliedFilters: function() {
			this.filterModel.setProperty("/SelectedCompany", "");
			this.filterModel.setProperty("/SelectedStatus", "");
			this.filterModel.setProperty("/CreatedFrom", "");
			this.filterModel.setProperty("/CreatedBy", "");
			this.filterModel.setProperty("/CreatedTo", "");
		},

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters
		 * are applied to the master list, which can also mean that the currently
		 * applied filters are removed from the master list, in case the filter
		 * settings are removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog: function(oEvent) {
			var aFilterItems = oEvent.getParameters().filterItems,
				aFilters = [],
				aCaptions = [];

			// update filter state:
			// combine the filter array and the filter string
			aFilterItems.forEach(function(oItem) {
				switch (oItem.getKey()) {
					case "Filter1":
						aFilters.push(new Filter("Amount", FilterOperator.LE, 100));
						break;
					case "Filter2":
						aFilters.push(new Filter("Amount", FilterOperator.GT, 100));
						break;
					default:
						break;
				}
				aCaptions.push(oItem.getText());
			});

			this._oListFilterState.aFilter = aFilters;
			this._updateFilterBar(aCaptions.join(", "));
			this._applyFilterSearch();
		},

		onMultiSelectPressed: function() {
			var toggleButton = this.getView().byId("multiSelectButton");
			var PressAction = toggleButton.getPressed(); //true if activating and false if disabling
			var oList = this.getView().byId("list");

			if (PressAction) {
				// this._showSummaryPage();
				if (!Device.system.phone) {
					this.getRouter().navTo("detailWelcomeMessage");
				}
				this.selectionFlag = true;
				oList.setMode("MultiSelect");
				oList.setIncludeItemInSelection(true);
				// this.getView().byId("idApproveAllButton").setVisible(true);
				// this.getView().byId("idRejectAllButton").setVisible(true);
				// this.getRouter().getTargets().display("detailWelcomeMessage");

			} else {
				this.selectionFlag = false;
				oList.setMode("SingleSelectMaster");
				this.getView().byId("idApproveAllButton").setVisible(false);
				this.getView().byId("idRejectAllButton").setVisible(false);
				if (!Device.system.phone) {
					if (oList.getItems().length > 0) {
						var oItem = oList.getItems()[0];
						this.getRouter().getTargets().display("detailWelcomeMessage");
						// 		this._showDetail(oItem);
					} else {
						//navigate to empty view
						this.getRouter().getTargets().display("detailObjectNotFound");

					}
				}
			}
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function(oEvent) {
			// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
			var selectedContexts = this._oList.getSelectedContexts(),
				slectedIndex = selectedContexts[0].sPath.split('/')[2];

			// 			this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			// 			if (!Device.system.phone) {
			// 				this.getRouter().getTargets().display("detailWelcomeMessage");
			// 			}

			if (selectedContexts.length > 1) {
				//   var len = selectedContexts.length ;
				// var step = selectedContexts[len-1].getObject().StepNo ;

				this.getView().byId("idApproveAllButton").setVisible(true);
				this.getView().byId("idRejectAllButton").setVisible(true);
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), slectedIndex);
			} else {

				this.getView().byId("idApproveAllButton").setVisible(false);
				this.getView().byId("idRejectAllButton").setVisible(false);
				//_showDetail action moved to onItemPress method
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), slectedIndex);
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function() {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function(oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function() {
			history.go(-1);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_createViewModel: function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "RequestId",
				groupBy: "None"
			});
		},

		/**
		 * If the master route was hit (empty hash) we have to set
		 * the hash to to the first item in the list as soon as the
		 * listLoading is done and the first item in the list is known
		 * @private
		 */
		_onMasterMatched: function() {

			if (this.selectionFlag) {
				this.onBypassed();
				this.selectionFlag = false;
				this.getRouter().getTargets().display("detailWelcomeMessage");
				return;
			}

			this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(
				function(mParams) {
					if (mParams.list.getMode() === "None") {
						return;
					}
					var sWorkItem = mParams.firstListitem.getBindingContext().getProperty("WorkItem"),
						// 		sLineId = mParams.firstListitem.getBindingContext().getProperty("LineId"),
						// oList = this._oList,
						sUserName = mParams.firstListitem.getBindingContext().getProperty("UserName");
					// 		sIndex = 
					this.getRouter().navTo("object", {
						workItem: sWorkItem,
						// 		lineId: sLineId,
						// 		list: oList,
						username: sUserName
							// 		index: 
					}, true);
				}.bind(this),
				function(mParams) {
					if (mParams.error) {
						return;
					}
					this.getRouter().getTargets().display("detailNoObjectsAvailable");
				}.bind(this)
			);
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function(oItem, index) {
            
// 			if (this._oList.getMode() === "SingleSelectMaster") {
				var bReplace = !Device.system.phone;
				this.getRouter().navTo("object", {
					workItem: this.inboxModel.getProperty("/results")[index].WorkItem,
					// workItem: oItem.mProperties.title,
					// workItem: oItem.getBindingContext().getProperty("WorkItem"),
					// username: oItem.getBindingContext().getProperty("UserName")
					username: this.getModel("FLP").getProperty("/id") /*"CIC2"*/,
					index: index
				}, bReplace);

				// var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				// 			oRouter.navTo("detailObjectNotFound", {});
				// 		this.getRouter().navTo("detailObjectNotFound",{});
// 			}
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function(iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch: function() {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method to apply both group and sort state together on the list binding
		 * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
		 * @private
		 */
		// 		_applyGroupSort: function(aSorters) {
		// 			this._oList.getBinding("items").sort(aSorters);
		// 		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar: function(sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},

		onItemPress: function(oEvent) {
			this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
		},

		onPressConfirmAll: function(oEvent) {

			var workItems = this.getAllSelectedItem(),
				buttonPressed = oEvent.getSource().getText(),
				decision,
				decisionCode;

			switch (buttonPressed) {
				case this.getTextFromResourceBundle("ApproveAll"):
					decision = this.getTextFromResourceBundle("Approve");
					decisionCode = "0001";
					break;
				case this.getTextFromResourceBundle("RejectAll"):
					decision = this.getTextFromResourceBundle("Reject");
					decisionCode = "0002";
					break;
				default:
					decision = this.getTextFromResourceBundle("Approve");
					decisionCode = "0001";
			}

			if (workItems === "") {
				if (decision === this.getTextFromResourceBundle("Approve")) {
					MessageBox.error(this.getTextFromResourceBundle("InavlidApprovedItems"));
				} else {
					MessageBox.error(this.getTextFromResourceBundle("InavlidRejectedItems"));
				}
				return;
			} else {

				this.getView().byId("idApproveAllButton").setVisible(false);
				this.getView().byId("idRejectAllButton").setVisible(false);
				this.confirmMultiReq(workItems, decision, decisionCode);
				this.onBypassed();
				this.onRefresh();
			}

		},

		getAllSelectedItem: function() {

			var oList = this.getView().byId("list"),
				status,
				workItem,
				that = this,
				faliureFlag = false,
				selectedItems = oList.getSelectedContexts(),
				allItems = $.map(selectedItems, function(value) {
					status = value.getObject().Status;
					workItem = value.getObject().WorkItem;
					if (status === that.getTextFromResourceBundle("ApprovedStatus") || status === that.getTextFromResourceBundle("RejectedStatus")) {
						faliureFlag = true;
						return;
					}
					return workItem;
				});

			return faliureFlag ? "" : allItems;
		}

	});

});