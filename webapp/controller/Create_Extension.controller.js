sap.ui.define([
	"BudgetExtension/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"BudgetExtension/model/formatter",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType"
], function(BaseController, JSONModel, MessageToast, MessageBox, formatter, History, Filter, FilterOperator, FilterType) {

	"use strict";

	return BaseController.extend("BudgetExtension.controller.Create_Extension", {

		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf BudgetExtension.view.Create_Extension
		 */

		onInit: function() {

			var oRouter = this.getRouter();

			this.budgetModel = new JSONModel();
			this.createExtModel = new JSONModel();
			this.configurationModel = new JSONModel();
			this.DNModel = new JSONModel();
			this.setModel(this.DNModel, "DNModel");
			//this.setModel(this.budgetModel, "budgetModel");
			this.setModel(this.createExtModel, "createExtModel");
			this.setModel(this.configurationModel, "configurationModel");

			this.configurationModel.setProperty("/busyIndicatorFlag", false);
			this.DNModel.setProperty("/DNoteReqests", []);

			this.oDataModel = this.getOwnerComponent().getModel();
			oRouter.getRoute("Route_Create_Ext").attachMatched(this._onRouteFound, this);

		},

		_onRouteFound: function(oEvtent) {
			var oArgument = oEvtent.getParameter("arguments"),
				// brand = oArgument.Brand,
				bdgAllocPath = "/BdgAllocationSet('" + oArgument.BdgId + "')",
				that = this;

			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this.oDataModel.read(bdgAllocPath, {
				method: 'GET',
				success: function(data) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.createExtModel.setData(data);
					// that.getAllDebitNote();
				},
				error: function(error) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("failGetBdg"));
				}
			});

		},

		getAllDebitNote: function() {

			var DNOfEvxtPath = "/DNoteOfExtSet",
				oDNFilters = [],
				that = this;

			oDNFilters.push(new Filter("Status", FilterOperator.EQ, "CREATED"));
			// oDNFilters.push(new Filter("Brand", FilterOperator.Contains, brand));
			oDNFilters.push(new Filter("CompCode", FilterOperator.EQ,
				this.createExtModel.getProperty("/CompanyCode")));

			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this.oDataModel.read(DNOfEvxtPath, {
				method: 'GET',
				filters: oDNFilters,
				success: function(data) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					that.createExtModel.setProperty("/DNoteReqests", data.results);

				},
				error: function(error) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("failGetDN"));
				}
			});
		},

		onReleaseExt: function(oEvent) {

			var createExtBdg = "/BdgExtensionSet",
				oExtBudget = {},
				oRouter = this.getRouter(),
				bdgId = this.createExtModel.getProperty("/ExtAmount"),
				currency = this.createExtModel.getProperty("/Currency"),
				companyCode = this.createExtModel.getProperty("/CompanyCode"),
				remAmount = this.createExtModel.getProperty("/RemaningBdg"),
				extAttachmentArr = this.createExtModel.getProperty("/DNoteAttachmentSet"),
				validatorFlag = false,
				oValidator = [],
				oValidatorObj = {
					id: this.getView().byId("extAmountInputlId"),
					type: "float",
					max: 16
				},
				that = this;

			oValidator.push(oValidatorObj);
			validatorFlag = this.validator(oValidator);

			oExtBudget.BdgId = this.createExtModel.getProperty("/BdgId");
			oExtBudget.ExtAmount = formatter.roundAmount(bdgId, currency);
			oExtBudget.CompCode = companyCode;
			oExtBudget.Curr = currency;
			oExtBudget.RemAmount = remAmount;

			//add attachment
			oExtBudget.DNoteAttachmentSet = extAttachmentArr;

			// add dnote
			oExtBudget.DNoteOfExtSet = this.validateDnArray(this.DNModel.getProperty("/DNoteReqests"));

			if (!validatorFlag) {
				MessageToast.show(this.getTextFromResourceBundle("ExtNotValid"));
				return;
			}

			this.configurationModel.setProperty("/busyIndicatorFlag", true);

			this.oDataModel.create(createExtBdg, oExtBudget, {

				success: function(extReq) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);

					if (extReq.BdgId !== "0000000000") {

						//call deep insert of DNote

						MessageBox.success(that.getTextFromResourceBundle("CreatSucc"), {
							actions: [MessageBox.Action.OK],
							onClose: function() {
								// make app in view mode after all budgets saved successfuly.
								that.clearAll();
								//navigate to created extenison page
								oRouter.navTo("Route_Ext_Details", {

									BdgId: extReq.BdgId,
									LineId: extReq.LineId,
									CreatedBy: extReq.UserId
								});
							}
						});
					} else {
						MessageToast.show(that.getTextFromResourceBundle("CreatFail"));
					}
				},
				error: function(oError) {
					that.configurationModel.setProperty("/busyIndicatorFlag", false);
					MessageToast.show(that.getTextFromResourceBundle("CreatFail"));
				}
			});

		},

		handleAddAttachmentPress: function() {

			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this._addAttachmentFragment = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.Attachment", this);
			this.getView().addDependent(this._addAttachmentFragment);
			this._addAttachmentFragment.setModel(this.configurationModel);
			this._addAttachmentFragment.open();
			this.configurationModel.setProperty("/busyIndicatorFlag", false);

		},

		onDeleteListPress: function(oEvent) {

			var editmode = false,
				oControl;
			if (oEvent.getSource) {
				oControl = oEvent.getSource();
				editmode = true;
			} else {
				oControl = this.byId(oEvent);
			}
			var parent = oControl.getParent().getParent();
			if (oControl.getIcon() === "sap-icon://delete" && editmode) {
				oControl.setTooltip(this.getTextFromResourceBundle("attachmentCancel"));
				oControl.setIcon("sap-icon://decline");
				parent.setMode("Delete");
			} else {
				oControl.setTooltip(this.getTextFromResourceBundle("deleteTooltip"));
				oControl.setIcon("sap-icon://delete");
				parent.setMode("None");
			}
		},

		onDeleteAttachItemPress: function(oEvent) {

			var path = oEvent.getParameter("listItem").getBindingContext("createExtModel").getPath(),
				that = this;

			MessageBox.confirm(that.getTextFromResourceBundle("confirmDeleteAttach"), {
				title: that.getTextFromResourceBundle("confirm"),
				onClose: function(oAction) {
					if (oAction === sap.m.MessageBox.Action.OK) {
						// 		var selectedSet = path.substring(0, path.lastIndexOf("/"));
						var index = parseInt(path.substring(path.lastIndexOf("/") + 1, path.length));
						var TempSet = that.createExtModel.getProperty("/DNoteAttachmentSet");
						TempSet.splice(index, 1);
						that.createExtModel.setProperty("/DNoteAttachmentSet", TempSet);
					}
				}
			});

		},

		validateDnArray: function(oArray) {

			var oExsistedDNotes = this.createExtModel.getProperty("/DNoteReqests"),
				validArray = [];

			if (oArray === undefined) {
				return undefined;
			}
			for (var i = 0; i < oArray.length; i++) {

				for (var j = 0; j < oExsistedDNotes.length; j++) {

					if (oExsistedDNotes[j].ReqId === oArray[i].ReqId) {
						validArray.push(oArray[i]);
					}
				}

			}

			return validArray;
		},

		handleUploadPress: function(oEvent) {
			var validAttachTypes = ["pdf", "jpg", "jpeg", "png", "txt", "xls", "xlsx", "xlsm", "xltx", "xltm", "doc", "docx"],
				that = this,
				id = oEvent.getParameters().id,
				oFileUploader = sap.ui.getCore().byId(id);

			oFileUploader.data("details", "");

			var periodIndex = oFileUploader.getValue().lastIndexOf("."),
				filename = oFileUploader.getValue().substring(0, periodIndex);

			if (!oFileUploader.getValue()) {
				MessageBox.error(that.getTextFromResourceBundle("noAttachAdded"));
				return;
			}
			var file = jQuery.sap.domById(oFileUploader.getId() +
				"-fu").files[0];
			// 			var type = file.type;
			// var fileType = file.type.split("/")[1];
			// var fileType = file.name.split(".")[file.name.split(".").length-1];
			var fileType = file.name.substring(periodIndex + 1, file.name.length);
			fileType = fileType.toLowerCase();
			if ($.inArray(fileType, validAttachTypes) > -1) {
				var BASE64_MARKER = 'data:' + file.type + ';base64,';
				var reader = new FileReader();
				reader.onload = (function(theFile) {
					return function(evt) {
						var base64Index = evt.target.result.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
						var base64 = evt.target.result.substring(base64Index);
						var attachment = {
							Original: base64,
							Extension: fileType,
							Filename: filename
						};
						oFileUploader.data("details", JSON.stringify(attachment));
					};
				})(file);
				reader.readAsDataURL(file);
			} else {
				oFileUploader.data("details", null);
				oFileUploader.setValue("");
				MessageBox.error(that.getTextFromResourceBundle("invalidAttachType"));
			}
		},

		onAddAttachment: function(oEvent) {
			var that = this,
				attachmentObject = {},
				attachmentSet = that.createExtModel.getProperty("/DNoteAttachmentSet") ? that.createExtModel.getProperty("/DNoteAttachmentSet") : [];
			if (that.byId("idRequestAttachment").data("details")) {
				attachmentObject = $.extend(attachmentObject, JSON.parse(that.byId("idRequestAttachment").data("details")));
			} else {
				MessageBox.error(that.getTextFromResourceBundle("noAttachAdded"));
				return;
			}
			// 			if (that.getModel("dataModel").getProperty("/ReqId")) {
			// 				attachmentObject.Flag = "A";
			// 			}
			attachmentObject.Flag = "A";
			attachmentSet.push(attachmentObject);
			that.createExtModel.setProperty("/DNoteAttachmentSet", attachmentSet);
			that._addAttachmentFragment.destroy();
		},

		onCancelAttachment: function(oEvent) {
			this._addAttachmentFragment.destroy();
		},

		onCloseCreateExt: function(oEvent) {

			this.clearAll();
			this.onNavBack();
		},

		clearAll: function() {
			this.createExtModel.setData({});
			this.DNModel.setData({});
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
		},

		onSaveDN: function(oEvent) {

			var oDNTable = this.getView().byId("DNTableId"),
				DNItems = this.DNModel.getProperty("/DNoteReqests"),
				that = this;

			// this.lastSelectedDNItems = oDNTable.getSelectedContextPaths();

			oDNTable.getSelectedContextPaths().forEach(function(item) {
				var index = that.getIndexOfIem(item);
				DNItems.push(that.createExtModel.getProperty("/DNoteReqests")[index]);
			});

			this.DNModel.setProperty("/DNoteReqests", DNItems);

			oDNTable.setMode("None");
			this.DNModel.getProperty("/StatusOfDNTable", "cancel");
		},

		onCancelDN: function() {
			var oDNTable = this.getView().byId("DNTableId");

			this.DNModel.setProperty("/DNoteReqests", []);
			oDNTable.setMode("MultiSelect");
			this.DNModel.getProperty("/StatusOfDNTable", "none");
			// oDNTable.setSelectedContextPaths(this.lastSelectedDNItems);

		},

		onAddDN: function(oEvent) {

			var oDNTable = this.getView().byId("DNTableId"),
				oRows = this.DNModel.getProperty("/DNoteReqests");

			// check if oRows is undefined so we will create empty array 
			if (oRows === undefined) {
				oRows = [];
			}

			oRows.unshift({

				DnoteType: "",
				ReqId: "",
				CompCode: "",
				ExtId: "",
				Status: ""
			});

			this.DNModel.setProperty("/DNoteReqests", oRows);
			this.DNModel.refresh(true);
			oDNTable.setSelectedItem(oDNTable.getItems()[0]);

		},

		onRemoveDN: function() {
			var oDNTable = this.getView().byId("DNTableId"),
				oRows = this.DNModel.getProperty("/DNoteReqests"),
				oContexts = oDNTable.getSelectedContexts();

			for (var i = oContexts.length - 1; i >= 0; i--) {

				var oObject = oContexts[i].getObject();

				var index = $.map(oRows, function(obj, index) {

					if (obj === oObject) {
						return index;
					}
				});

				oRows.splice(index, 1);
			}

			this.DNModel.setProperty("/DNoteReqests", oRows);
			oDNTable.removeSelections(true);
		},

		// onDNItemPress: function() {

		// 	var oDNTable = this.getView().byId("DNTableId");

		// 	if (oDNTable.getSelectedItems().length > 0) {
		// 		this.DNModel.getProperty("/StatusOfDNTable", "save");
		// 	}
		// }

		onPressValueHelp: function(oEvent) {

			this.oSelectedIndex = this.getIndexOfIem(oEvent.getSource().getBindingContext("DNModel").getPath());
			this.configurationModel.setProperty("/busyIndicatorFlag", true);
			this._DNFragment = sap.ui.xmlfragment(this.getView().getId(), "BudgetExtension.view.DNValueHelp", this);
			this.getView().addDependent(this._DNFragment);
			this._DNFragment.setModel(this.configurationModel);
			this._DNFragment.setModel(this.createExtModel);
			this._DNFragment.open();

			this.configurationModel.setProperty("/busyIndicatorFlag", false);

		},

		onCloseDialog: function(oEvent) {

			var oDNObject = oEvent.getSource().getBindingContext("createExtModel").getObject(),
				oRows = this.DNModel.getProperty("/DNoteReqests");

			oRows[this.oSelectedIndex] = oDNObject;
			this.DNModel.setProperty("/DNoteReqests", oRows);

			this.oSelectedIndex = null;
			this._DNFragment.destroy();
		},

		onCancelPressed: function() {
			this.oSelectedIndex = null;
			this._DNFragment.destroy();
		}

		// onSearchValueChanged: function() {

		// 	var searchValue = this.getView().byId("reqIdSearchInput").getValue(),
		// 		oDNTable = this.getView().byId("searchHelpTableId"),
		// 		oFilters = [];

		// 	oFilters.push(new Filter("ReqId", FilterOperator.Contains, searchValue));
		// 	oDNTable.getBinding("items").filter(oFilters);

		// }

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf BudgetExtension.view.Create_Extension
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf BudgetExtension.view.Create_Extension
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf BudgetExtension.view.Create_Extension
		 */
		//	onExit: function() {
		//
		//	}

	});

});