sap.ui.define([
	"BudgetExtension/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"BudgetExtension/model/formatter",
	"sap/ui/core/routing/History",
	"sap/ui/core/Fragment"
], function(BaseController, JSONModel, MessageToast, Filter, FilterOperator, FilterType, formatter, History, Fragment) {
	"use strict";

	return BaseController.extend("BudgetExtension.controller.Extension_Details", {

		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf BudgetExtension.view.Extension_Details
		 */
		onInit: function() {

			var oRouter = this.getRouter();

			this.oDataModel = this.getOwnerComponent().getModel();

			this.configurationModel = new JSONModel();

			this.setModel(this.configurationModel, "configurationModel");
			this.extDetailsModel = new JSONModel();
			this.setModel(this.extDetailsModel, "extDetailsModel");

			oRouter.getRoute("Route_Ext_Details").attachMatched(this._onRouteFound, this);
		},

		_onRouteFound: function(oEvtent) {

			var oArgument = oEvtent.getParameter("arguments"),
				budgetId = oArgument.BdgId,
				lineId = oArgument.LineId,
				createdBy = oArgument.CreatedBy;

			this.retriveExtDetail(budgetId, lineId);
			this.setConfigOfLaneAndNode(budgetId, lineId, createdBy);
			this.retriveExtAttachment(budgetId, lineId);
			this.retriveDnoteReqests(lineId);
		},

		retriveExtDetail: function(budgetId, lineId) {

			var extDetailsPath = "/BdgExtensionSet(LineId='" + lineId + "',BdgId='" + budgetId + "')",
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this.oDataModel.read(extDetailsPath, {
				method: "GET",
				success: function(extDetails) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.extDetailsModel.setProperty("/extDetails", extDetails);
				},
				error: function(error) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("failDisplayExt"));
				}
			});

		},

		retriveExtAttachment: function(budgetId, lineId) {

			var extAttachPath = "/BdgExtensionSet(LineId='" + lineId + "',BdgId='" + budgetId + "')/DNoteAttachmentSet",
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);

			this.oDataModel.read(extAttachPath, {
				method: "GET",
				success: function(extAttach) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.extDetailsModel.setProperty("/extAttachments", extAttach.results);
				},
				error: function(error) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("failDisplayExt"));
				}

			});

		},

		retriveDnoteReqests: function(lineId) {
			var DNotePath = "/BdgExtensionSet(LineId='" + lineId + "',BdgId='0000000000')/DNoteOfExtSet",
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this.oDataModel.read(DNotePath, {
				method: "GET",

				success: function(dnoteReq) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.extDetailsModel.setProperty("/DNoteRequests", dnoteReq.results);
				},
				error: function(error) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("failDisplayDNoteReq"));
				}
			});

		},

		onAttachmentItemPress: function(oEvent) {
			var attchPhysicalId = oEvent.getSource().getBindingContext("extDetailsModel").getObject().PhysicalId;
			if (attchPhysicalId) {
				var url = this.getOwnerComponent().getModel().sServiceUrl + "/DNoteOriginalSet('" + attchPhysicalId + "')/$value";
				window.open(url, '_blank');
			}
		},

		setConfigOfLaneAndNode: function(budgetId, lineId, createdBy) {

			var inboxSetPath = "/INBOXSet",
				oModel = this.getOwnerComponent().getModel(),
				workflowType = new Filter("WorkflowType", FilterOperator.EQ, "EXTENSION"),
				requestFilter = new Filter("IMRequestId", FilterOperator.EQ, budgetId),
				lineIdFilter = new Filter("LineId", FilterOperator.EQ, lineId),
				filters = [requestFilter, workflowType, lineIdFilter],
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

					// push nodes of level one as child of inititor node&nbsp;
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
								true : (item.UserName === item.DecisionBy && item.Status === that.getTextFromResourceBundle("RejectedStatus")) ?
								true : false,
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

					that.extDetailsModel.setProperty("/flowSummary", flowSummaryArr);
					that.extDetailsModel.setProperty("/lanes", lanes);
					that.extDetailsModel.setProperty("/nodes", nodes);
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.getView().byId("processFlow").updateModel();

				},
				error: function(error) {
					MessageToast.show(that.getTextFromResourceBundle("failureGetInbox"));
				}

			});

		},

		onNodePress: function(oEvent) {
			var selectedNode = oEvent.getParameters().getBindingContext("extDetailsModel").getObject(),
				oContextBinding = oEvent.getParameters().getBindingContext("extDetailsModel");

			if (selectedNode.laneId !== "0") {
				this._nodeDialog = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.NodeDialog",
					this);
				this._nodeDialog.setBindingContext(oContextBinding, "extDetailsModel");
				this.getView().addDependent(this._nodeDialog);
				this._nodeDialog.open();
			}
		},

		onCloseProcessFlow: function(oEvent) {
			this._nodeDialog.destroy();
		},

		onZoomInPress: function() {
			var oProcessFlow1 = this.getView().byId("processFlow");
			oProcessFlow1.zoomIn();
		},

		onZoomOutPress: function() {
			var oProcessFlow1 = this.getView().byId("processFlow");
			oProcessFlow1.zoomOut();
		},

		clearAll: function() {
			this.extDetailsModel.setData({});
		},

		onNavBack: function() {
			var oHistory, sPreviousHash, previousPage;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();
			previousPage = oHistory.getPreviousHash().split('/')[1];
			this.clearAll();
			if (sPreviousHash !== undefined && previousPage !== "Create_Extension") {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("Route_Display", {}, true /*no history*/ );
			}
		}

	
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf BudgetExtension.view.Extension_Details
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf BudgetExtension.view.Extension_Details
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf BudgetExtension.view.Extension_Details
		 */
		//	onExit: function() {
		//
		//	}

	});

});