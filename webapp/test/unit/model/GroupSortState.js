/*global QUnit*/

sap.ui.define([
	"ExtensionApproval/ExtensionApproval/model/GroupSortState",
	"sap/ui/model/json/JSONModel"
], function (GroupSortState, JSONModel) {
	"use strict";

	QUnit.module("GroupSortState - grouping and sorting", {
		beforeEach: function () {
			this.oModel = new JSONModel({});
			// System under test
			this.oGroupSortState = new GroupSortState(this.oModel, function() {});
		}
	});

	QUnit.test("Should always return a sorter when sorting", function (assert) {
		// Act + Assert
		assert.strictEqual(this.oGroupSortState.sort("Amount").length, 1, "The sorting by Amount returned a sorter");
		assert.strictEqual(this.oGroupSortState.sort("RequestId").length, 1, "The sorting by RequestId returned a sorter");
	});

	QUnit.test("Should return a grouper when grouping", function (assert) {
		// Act + Assert
		assert.strictEqual(this.oGroupSortState.group("Amount").length, 1, "The group by Amount returned a sorter");
		assert.strictEqual(this.oGroupSortState.group("None").length, 0, "The sorting by None returned no sorter");
	});


	QUnit.test("Should set the sorting to Amount if the user groupes by Amount", function (assert) {
		// Act + Assert
		this.oGroupSortState.group("Amount");
		assert.strictEqual(this.oModel.getProperty("/sortBy"), "Amount", "The sorting is the same as the grouping");
	});

	QUnit.test("Should set the grouping to None if the user sorts by RequestId and there was a grouping before", function (assert) {
		// Arrange
		this.oModel.setProperty("/groupBy", "Amount");

		this.oGroupSortState.sort("RequestId");

		// Assert
		assert.strictEqual(this.oModel.getProperty("/groupBy"), "None", "The grouping got reset");
	});
});