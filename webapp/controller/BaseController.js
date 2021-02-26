sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/UIComponent"
], function(Controller, History, UIComponent) {
	"use strict";

	return Controller.extend("BudgetExtension.controller.BaseController", {

		// handle back button
		onNavBack: function() {
			var oHistory, sPreviousHash;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("Route_Display", {}, true /*no history*/ );
			}
		},

		getRouter: function() {
			return UIComponent.getRouterFor(this);
		},

		// get json model from view
		getModel: function(oName) {
			return this.getView().getModel(oName);
		},

		// bind json model to view
		setModel: function(oModel, oName) {
			return this.getView().setModel(oModel, oName);
		},

		// get text from i18n 
		getTextFromResourceBundle: function(oName) {
			return this.getResourceBundle().getText(oName);
		},

		// get access to translated text file (i18n)
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		// get number after second '/' letter from string 
		getIndexOfIem: function(oValue) {
			var index = oValue.split("/")[2];
			return index;
		},

		getNavigationUrl: function(ReqId) {

			// get a handle on the global XAppNav service
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"),
				// generate the Hash to display report for request
				hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
					target: {
						semanticObject: "DNOTE_REP_SEM",
						action: "lookup"
					}
				})) || "";
			//Generate a  URL for the second application
			return window.location.href.split("#")[0] + hash + "&/Detail/" + ReqId;
			// var reportUrl = window.location.href.split("#")[0] + hash + "&/Detail/" + ReqId;
			// this.extDetailsModel.setProperty("/reportUrl", reportUrl);          
		},

		// validate array of controls like float, integer and string 
		validator: function(oArray) {

			var oFlag = true,
				letterFlag = true,
				that = this,
				oValue = "";

			oArray.forEach(function(x) {
				switch (x.type) {
					case "char":
						oValue = x.id.getValue();
						letterFlag = that.validateAlph(oValue);
						break;
					case "num":
						oValue = x.id.getValue();
						letterFlag = that.validateAllNumber(oValue);
						break;
					case "float":
						oValue = x.id.getValue();
						letterFlag = that.validateFloat(oValue);
						break;
					default:
						letterFlag = true;
				}

				if (x.id.getValue().length === 0 || x.id.getValue().length > x.max || letterFlag === false) {
					x.id.setValueState(sap.ui.core.ValueState.Error);
					oFlag = false;
					letterFlag = true;
				} else {
					x.id.setValueState(sap.ui.core.ValueState.None);
				}
			});
			return oFlag;
		},

		// check if string is only have letters like welcome not like welcome21
		validateAlph: function(oValue) {

			var letters = /^[A-Za-z]+$/;
			if (oValue.match(letters)) {
				return true;
			} else {
				return false;
			}
		},

		// check if string has only have numbers
		validateAllNumber: function(oValue) {
			var numbers = /^[0-9]+$/;
			if (oValue.match(numbers)) {
				return true;
			} else {
				return false;
			}
		},

		// check if string has integer or float numbers
		validateFloat: function(oValue) {

			var numbers = /^(\d{1,16})+(\.\d+)?$/;
			if (oValue.match(numbers)) {
				return true;
			} else {
				return false;
			}
		},

		validteDatePicker: function(monthFrom, YearFrom, monthTo, YearTo) {

			if (YearFrom > YearTo) {
				return false;
			}

			if (YearFrom === YearTo) {

				if (monthFrom > monthTo) {
					return false;
				}

			}

			return true;

		},
		
		dateNotOverlapped: function(fromDate, toDate) {

			var fromYear = fromDate.split(".")[2],
				toYear = toDate.split(".")[2],
				fromMonth = fromDate.split(".")[1],
				toMonth = toDate.split(".")[1],
				fromDay = fromDate.split(".")[0],
				toDay = toDate.split(".")[0];

			if (fromYear > toYear) {
				return false;
			} else if (fromYear === toYear) {

				if (fromMonth > toMonth) {

					return false;

				} else if (fromMonth === toMonth) {

					if (fromDay > toDay) {
						return false;
					} else {
						return true;
					}
				} else {
					return true;
				}
			} else {
				return true;
			}
		},
		addLeftZero: function(num, size) {

			var convertdNum = num + "";
			while (convertdNum.length < size) {
				convertdNum = "0" + convertdNum;
			}
			return convertdNum;

		},

		retriveDefaultConfSetting: function() {
			return {
				"busyIndicatorFlag": false,
				"role": "View"
			};
		},

		retriveDefaultFilters: function() {
			return {
				"DNTypes": [],
				"Brands": [],
				"CreatedFrom": "",
				"SalesChannels": [],
				"UserId": "",
				"CreatedTo": "",
				"SelectedDnType": "",
				"SelectedSalesChannel": "",
				"SelectedBrand": ""
			};
		},

		handleAddingFilters: function() {

			var dnTypeComboBox = this.getView().byId("DNTypeComboBoxId"),
				channelComboBox = this.getView().byId("salesChannelComboBoxId"),
				brandComboBox = this.getView().byId("brandComboBoxId"),
				oDnTypeItem = dnTypeComboBox.getSelectedItem(),
				oChannelItem = channelComboBox.getSelectedItem(),
				oBrandItem = brandComboBox.getSelectedItem(),
				lastDnTypeValue = dnTypeComboBox._lastValue,
				lastChannelValue = channelComboBox._lastValue,
				lastBrandValue = brandComboBox._lastValue,
				dnTypeArr = this.filterModel.getProperty("/DNTypes"),
				channelArr = this.filterModel.getProperty("/SalesChannels"),
				brandArr = this.filterModel.getProperty("/Brands"),
				newDnTypeFilter = {},
				newChannelFilter = {},
				newBrandFilter = {};

			if (!oDnTypeItem && lastDnTypeValue !== "") {
				dnTypeComboBox.setSelectedKey(lastDnTypeValue);
				newDnTypeFilter.DnType = lastDnTypeValue;
				dnTypeArr.push(newDnTypeFilter);
				this.filterModel.setProperty("/DNTypes", dnTypeArr);
			}

			if (!oChannelItem && lastChannelValue !== "") {
				channelComboBox.setSelectedKey(lastChannelValue);
				newChannelFilter.SalesDesc = lastChannelValue;
				channelArr.push(newChannelFilter);
				this.filterModel.setProperty("/SalesChannels", channelArr);
			}

			if (!oBrandItem && lastBrandValue !== "") {
				brandComboBox.setSelectedKey(lastBrandValue);
				newBrandFilter.Brand = lastBrandValue;
				brandArr.push(newBrandFilter);
				this.filterModel.setProperty("/Brands", brandArr);
			}

		},

		clearAllAppliedFilters: function() {
			this.filterModel.setProperty("/SelectedDnType", "");
			this.filterModel.setProperty("/SelectedBrand", "");
			this.filterModel.setProperty("/CreatedFrom", "");
			this.filterModel.setProperty("/SelectedSalesChannel", "");
			this.filterModel.setProperty("/SelectedUser", "");
			this.filterModel.setProperty("/SelectedYear", "");
			this.filterModel.setProperty("/SelectedMonth", "");
			this.filterModel.setProperty("/CreatedFrom", "");
			this.filterModel.setProperty("/CreatedTo", "");
		},

		hasDuplicates: function(oArray) {
			var valuesSoFar = [];
			for (var i = 0; i < oArray.length; ++i) {
				var value = oArray[i].getValue();
				if (valuesSoFar.indexOf(value) !== -1) {
					oArray[i].setValueState(sap.ui.core.ValueState.Error);
				} else {
					valuesSoFar.push(value);
				}
			}

			if (valuesSoFar.length !== oArray.length) {
				return false;
			} else {
				return true;
			}
		},

		removeAllErrors: function() {
			var oTable = this.getView().byId("DNTableId"),
				oItems = oTable.getAggregation("items");

			oItems.forEach(function(item) {
				item.getAggregation("cells")[0].setValueState(sap.ui.core.ValueState.None);
			});
		}

	});

});