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
			var index = oValue.split('/')[2];
			return index;
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
			this.filterModel.setProperty("/UserId", "");
			this.filterModel.setProperty("/CreatedTo", "");
		}

	});

});