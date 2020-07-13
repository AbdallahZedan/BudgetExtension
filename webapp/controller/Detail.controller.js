/*global location */
sap.ui.define([
	"ExtensionApproval/ExtensionApproval/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"ExtensionApproval/ExtensionApproval/model/formatter",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function(BaseController, JSONModel, formatter, MessageToast, MessageBox, Filter, FilterOperator, Fragment) {
	"use strict";

	return BaseController.extend("ExtensionApproval.ExtensionApproval.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.overviewModel = new JSONModel();
			this.workItemModel = new JSONModel();
			this.setModel(oViewModel, "detailView");
			this.setModel(this.overviewModel, "overviewModel");
			this.setModel(this.workItemModel, "workItemModel");

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			if (!this.firstLockFlag) {
				this.getRouter().getTargets().display("detailWelcomeMessage");
				this.firstLockFlag = true;
				return;
			}

			// 			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function(oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			this.sWorkItem = oEvent.getParameter("arguments").workItem;
			this.sUserName = oEvent.getParameter("arguments").username;
			this.slectedIndex = oEvent.getParameter("arguments").index;

			this.retiveWorkItem();
			// 			this.getModel().metadataLoaded().then(function() {
			// 				// var sObjectPath = this.getModel().createKey("INBOXSet", {
			// 				// 	WorkItem: sWorkItem,
			// 				// 	UserName: sUserName
			// 				// });
			// 				// this._bindView("/" + sObjectPath);
			// 				// this._onBindingChange();
			// 			}.bind(this));
		},

		retiveWorkItem: function() {
			var workItemPath = "/INBOXSet(WorkItem='" + this.sWorkItem + "',UserName='" + this.sUserName + "')",
				oModel = this.getOwnerComponent().getModel(),
				that = this;

			oModel.read(workItemPath, {
				success: function(data) {
					that.workItemModel.setData(data);
					that.setConfigOfLaneAndNode();
					that._onBindingChange();
				},
				error: function(error) {
					MessageToast.show(that.getResourceBundle("failureAllocReq"));
				}
			});
		},

		setConfigOfLaneAndNode: function() {

			var inboxSetPath = "/INBOXSet",
				oModel = this.getOwnerComponent().getModel(),
				workflowType = new Filter("WorkflowType", FilterOperator.EQ, "EXTENSION"),
				requestFilter = new Filter("IMRequestId", FilterOperator.EQ, this.workItemModel.getProperty("/RequestId")),
				lineIdFilter = new Filter("LineId", FilterOperator.EQ, this.workItemModel.getProperty("/LineId")),
				filters = [requestFilter, workflowType, lineIdFilter],
				that = this;

			oModel.read(inboxSetPath, {
				filters: filters,
				method: "GET",
				async: false,

				success: function(inboxSetData) {
				    
				    var flowSummaryArr = inboxSetData.results.filter(function(item){
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
						title: that.workItemModel.getProperty("/CreatedBy"),
						titleAbbreviation: that.workItemModel.getProperty("/CreatedBy"),
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
							label: item.Role,
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
							role: item.Role,
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
                    that.workItemModel.setProperty("/flowSummary", flowSummaryArr);
					that.workItemModel.setProperty("/lanes", lanes);
					that.workItemModel.setProperty("/nodes", nodes);
				},
				error: function(error) {
					MessageToast.show(that.getTextFromResourceBundle("getTextFromResourceBundle"));
				}

			});

		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView();
			// oElementBinding = oView.getElementBinding();

			// 			// No data for the binding
			// 			if (!oElementBinding.getBoundContext()) {
			// 				this.getRouter().getTargets().display("detailObjectNotFound");
			// 				// if object could not be found, the selection in the master list
			// 				// does not make sense anymore.
			// 				this.getOwnerComponent().oListSelector.clearMasterListSelection();
			// 				return;
			// 			}

			// 			var sPath = oElementBinding.getPath(),
			// 				oResourceBundle = this.getResourceBundle(),
			// 				oObject = oView.getModel().getObject(sPath),
			var sWorkItem = this.workItemModel.getProperty("/WorkItem"),
				sRequestId = this.workItemModel.getProperty("/RequestId"),
				sLineId = this.workItemModel.getProperty("/LineId"),
				oViewModel = this.getModel("detailView");
			//add method to retrive extension details and other model to get allocation detail
			this.retriveExtensionDetails(sRequestId, sLineId);

			// 			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			// 			oViewModel.setProperty("/shareSendEmailSubject",
			// 				oResourceBundle.getText("shareSendEmailObjectSubject", [sWorkItem]));
			// 			oViewModel.setProperty("/shareSendEmailMessage",
			// 				oResourceBundle.getText("shareSendEmailObjectMessage", [sRequestId, sWorkItem, location.href]));
		},

		retriveExtensionDetails: function(sRequestId, sLineId) {

			var oModel = this.getOwnerComponent().getModel(),
				that = this,
				allocationPath = "/BdgAllocationSet('" + sRequestId + "')",
				extensionPath = "/BdgExtensionSet(BdgId='" + sRequestId + "',LineId='" + sLineId + "')";

			this.getModel("detailView").setProperty("/busy", true);

			oModel.read(extensionPath, {
				filter: [],
				method: "GET",
				success: function(extData) {
					that.overviewModel.setData(extData);
				},
				error: function(error) {
					MessageToast.show(that.getResourceBundle("failureExtReq"));
					that.getModel("detailView").setProperty("/busy", false);
					that.getRouter().getTargets().display("detailObjectNotFound");
					return;
				}
			});

			oModel.read(allocationPath, {

				filter: [new Filter("BdgYear", FilterOperator.EQ, "forApproval")],
				method: "GET",
				success: function(allocData) {
					that.overviewModel.setProperty("/allocationDetails", allocData);
					that.getModel("detailView").setProperty("/busy", false);
					return;
				},
				error: function(error) {
					MessageToast.show(that.getResourceBundle("failureAllocReq"));
					that.getModel("detailView").setProperty("/busy", false);
					that.getRouter().getTargets().display("detailObjectNotFound");
					// 	return;
				}

			});

		},

		onConfirmPress: function(oEvent) {

			var oId = oEvent.getSource().getId().split('-')[5],
				confirmationModel = new JSONModel(),
				// oView = this.getView(),
				decision,
				decisionCode;
			// confirmFlag,
			// oElementBinding = oView.getElementBinding(),
			// sObjectPath = oElementBinding.getPath(),
			// extObj = oView.getModel().getObject(sObjectPath),

			// itemsLength = workItems.length;

			this.setModel(confirmationModel, "confirmationModel");

			if (oId === "IdInboxRejectButton") {
				decision = this.getTextFromResourceBundle("Reject");
				decisionCode = "0002";

			} else {
				decision = this.getTextFromResourceBundle("Approve");
				decisionCode = "0001";
			}

			confirmationModel.setProperty("/decision", decision);
			confirmationModel.setProperty("/decisionCode", decisionCode);
			confirmationModel.setProperty("/comment", "");

			this._commentFragment = sap.ui.xmlfragment(this.getView().getId(), "ExtensionApproval.ExtensionApproval.view.Comment", this);
			this.getView().addDependent(this._commentFragment);
			this._commentFragment.setModel(this.configurationModel);
			this._commentFragment.open();

			// 			var confirmationStatus = this.confirmMultiReq([workItem], decision, decisionCode);
			// 			if (confirmationStatus) {
			// 				if (decisionCode === "0001") {
			// 					items[this.slectedIndex].Status = this.getTextFromResourceBundle("ApprovedStatus");

			// 				} else {
			// 					items[this.slectedIndex].Status = this.getTextFromResourceBundle("RejectedStatus");
			// 				}
			// 				inboxModel.setProperty("/results", items);
			// 				this.getOwnerComponent().oListSelector._oList.setModel(inboxModel, "inboxModel");
			// 			}
			// 			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			// this.getRouter().getTargets().display("master");

			// 			if (decisionCode === "0001") {
			// 				oListBinding.oList[this.slectedIndex].Status = this.getTextFromResourceBundle("ApprovedStatus");
			// 				this._bindView(sObjectPath);
			// 			} else {
			// 				oListBinding.oList[this.slectedIndex].Status = this.getTextFromResourceBundle("RejectedStatus");
			// 				this._bindView(sObjectPath);
			// 			}
			// 			sap.ui.controller("ExtensionApproval.ExtensionApproval.Master").retriveAllExtRequsts();
			//             sap.ui.getCore().byId("Master");
			//  oListBinding.refresh(true);
		},

		onAddComment: function(oEvent) {
			this.cofirmAction();
		},

		onCloseCommentDialog: function(oEvent) {
			this._commentFragment.destroy();
		},

		cofirmAction: function() {

			var _oComponent = this.getOwnerComponent(),
				oList = _oComponent.oListSelector._oList,
				inboxModel = oList.getModel("inboxModel"),
				items = inboxModel.getProperty("/results"),
				workItem = this.sWorkItem,
				oModel = this.getOwnerComponent().getModel(),
				confirmPath = "/ApproveMultiReq",
				confirmationModel = this.getView().getModel("confirmationModel"),
				decision = confirmationModel.getProperty("/decision"),
				decisionCode = confirmationModel.getProperty("/decisionCode"),
				comment = confirmationModel.getProperty("/comment"),
				that = this,
				createObj = {};

			createObj.WorkItem = this.sWorkItem;
			createObj.Decision = decisionCode;
			createObj.Comments = comment;

			that.getView().setBusy(true);
			oModel.callFunction(confirmPath, {
				method: "POST",
				async: false,
				urlParameters: {
					RequestIDs: [workItem],
					Decision: decisionCode
				},
				success: function(data) {
					// 		resolved(true);
					that.getView().setBusy(false);
					if (decisionCode === "0001") {
						items[that.slectedIndex].Status = that.getTextFromResourceBundle("ApprovedStatus");
					} else {
						items[that.slectedIndex].Status = that.getTextFromResourceBundle("RejectedStatus");
					}
					inboxModel.setProperty("/results", items);
					that.getOwnerComponent().oListSelector._oList.setModel(inboxModel, "inboxModel");
					that.getRouter().getRoute("object").attachPatternMatched(that._onObjectMatched, that);
					that.retiveWorkItem();
					MessageBox.success(that.getTextFromResourceBundle("actionSucc", decision));
					that._commentFragment.destroy();
				},
				error: function(error) {
					// 		rejected(false);
					that.getView().setBusy(false);
					MessageBox.error(that.getTextFromResourceBundle("decisionFail", decision));
					that._commentFragment.destroy();

				}
			});
		},

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("contentId"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		}

	});

});