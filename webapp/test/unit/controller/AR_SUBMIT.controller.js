/*global QUnit*/

sap.ui.define([
	"FICO/RECEIPT/controller/AR_SUBMIT.controller"
], function (Controller) {
	"use strict";

	QUnit.module("AR_SUBMIT Controller");

	QUnit.test("I should test the AR_SUBMIT controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});