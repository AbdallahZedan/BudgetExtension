sap.ui.define(function() {
	"use-strict";

	return {

		budgetState: function(amount, orgAmount) {
			amount = parseInt(amount);
			orgAmount = parseInt(orgAmount);
			if (amount === 0) {
				return "Error";
			} else {
				return "Success";
			}
		},

		monthState: function(month) {

			var currentMonth = new Date().getMonth();
			month = parseInt(month);
			currentMonth = parseInt(currentMonth);
			if (month === currentMonth) {
				return "Warning";
			} else if (month < currentMonth) {
				return "Error";
			} else {
				return "Success";
			}
		},

		// round number dependant on currecy 
		roundAmount: function(amount, currency) {

			if (amount === "" || amount === undefined) {
				return "";
			}
			switch (currency) {
				case "SAR":
				case "USD":
				case "GBP":
				case "EUR":
					amount = parseFloat(amount).toFixed(2);
					break;
				default:
					amount = parseFloat(amount).toFixed(3);
			}

			return amount;
		},

		// capital first letter of words
		captalizeFirstChar: function(str, type) {

			var lower = String(str).toLowerCase();
			if (type === "oneWord") {
				return lower.replace(/(^|\. *)(\w)/g, function(firstChar) {
					return firstChar.toUpperCase();
				});

			} else {
				return lower.replace(/(^| )(\w)/g, function(firstChar) {
					return firstChar.toUpperCase();
				});
			}
		},

		formatDate: function(oDate) {

			if (oDate !== null && oDate !== undefined) {
				return oDate.substr(6, 2) + "-" + oDate.substr(4, 2) + "-" + oDate.substr(0, 4);
			} else {
				return "";
			}
		},

		formatDateWithDot: function(oDate) {

			if (oDate !== null && oDate !== undefined) {
				return oDate.substr(6, 2) + "." + oDate.substr(4, 2) + "." + oDate.substr(0, 4);
			} else {
				return "";
			}
		},

		formatDateTime: function(sDate, sTime) {
			return sTime.substring(0, 2) + ":" + sTime.substring(2, 4) + ":" + sTime.substring(4, 6) + ", " + sDate.substr(6, 2) + "/" + sDate.substr(
				4, 2) + "/" + sDate.substr(0, 4);
		},

		getProcessFlowIntro: function(oValue) {

			if (parseInt(oValue) === 1) {
				return this.getTextFromResourceBundle("Reviewer");
			} else if (parseInt(oValue) === 2) {
				return this.getTextFromResourceBundle("Approval_1");
			} else if (parseInt(oValue) === 3) {
				return this.getTextFromResourceBundle("Approval_2");
			} else if (parseInt(oValue) === 4) {
				return this.getTextFromResourceBundle("Approval_3");
			} else if (parseInt(oValue) === 5) {
				return this.getTextFromResourceBundle("CFO");
			} else if (parseInt(oValue) === 6) {
				return this.getTextFromResourceBundle("CEO");
			}
			// if (parseInt(oValue) < 6) {
			// return "Approver " + (parseInt(oValue));
			// }
			// return "Reviewer " + (parseInt(oValue) - 5);
		},

		status: function(sValue) {

			if (sValue === "APPROVED") {

				return "Success";

			} else if (sValue === "RELEASED" || sValue === "ACTIVATED" || sValue === "STARTED") {

				return "Warning";

			} else if (sValue === "DELETED" || sValue === "REJECTED") {

				return "Error";

			} else {
				return "Error";

			}

		},
		// convert milliseconds (ms) to hours, minutes seconds and milliseconds like to 360000 to 01:01 
		timeFormatter: function(duration) {
			var ms = duration.ms,
				milliseconds = parseInt((ms % 1000) / 100),
				seconds = Math.floor((ms / 1000) % 60),
				minutes = Math.floor((ms / (1000 * 60)) % 60),
				hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

			hours = (hours < 10) ? "0" + hours : hours;
			minutes = (minutes < 10) ? "0" + minutes : minutes;
			seconds = (seconds < 10) ? "0" + seconds : seconds;

			return hours + ":" + minutes;
		},

		formatDateWithDot: function(oDate) {

			if (oDate !== null && oDate !== undefined) {
				return oDate.substr(3, 2) + "." + oDate.substr(0, 2) + "." + oDate.substr(6, 4);
			} else {
				return "";
			}
		},

		// remove left zeros from string
		leftShiftZeros: function(number) {
			return parseInt(number);
		},

		setStateText: function(oStateText) {
			var state = "Success";
			switch (oStateText) {
				case this.getTextFromResourceBundle("Pending"):
					state = "Warning";
					break;
				case this.getTextFromResourceBundle("Reject"):
					state = "Error";
					break;
				default:
					break;
			}
			return state;
		}

	};
});