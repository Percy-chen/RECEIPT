sap.ui.define(["./BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/m/UploadCollectionParameter",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"./messages",
		"sap/m/library",
		"sap/ui/comp/filterbar/FilterBar",
		"sap/ui/comp/filterbar/FilterGroupItem",
		"sap/m/Table",
		'sap/m/Token',
		"sap/ui/comp/valuehelpdialog/ValueHelpDialog",
		"sap/m/Input",
		"sap/m/MultiInput",
		"sap/m/Text",
		"sap/ui/core/format/DateFormat",
	],
	function (BaseController, JSONModel, Filter, FilterOperator, UploadCollectionParameter, MessageToast, MessageBox, messages,
		MobileLibrary, FilterBar, FilterGroupItem, mTable, Token, ValueHelpDialog, Input, MultiInput, Text, DateFormat) {
		"use strict";
		return BaseController.extend("FICO.RECEIPT.controller.AR_SUBMIT", {
			onInit: function () {
				this._JSONModel = this.getModel();
				// var today = new Date();
				// var year = today.getFullYear();
				// var month = today.getMonth() + 1;
				// var strDate = today.getDate();
				// if (month >= 1 && month <= 9) {
				// 	month = "0" + month;
				// }
				// if (strDate >= 0 && strDate <= 9) {
				// 	strDate = "0" + strDate;
				// }
				// today = year.toString() + month.toString() + strDate.toString();
				// this._JSONModel.setProperty("/REData/APPLICATIONDATE", today);
				this.getView().setModel(new JSONModel({
					"maximumFilenameLength": 55,
					"maximumFileSize": 10,
					"mode": MobileLibrary.ListMode.SingleSelectMaster,
					"uploadEnabled": true,
					"uploadButtonVisible": true,
					"enableEdit": false,
					"enableDelete": true,
					"visibleEdit": false,
					"visibleDelete": true,
					"listSeparatorItems": [
						MobileLibrary.ListSeparators.All,
						MobileLibrary.ListSeparators.None
					],
					"showSeparators": MobileLibrary.ListSeparators.All,
					"listModeItems": [{
						"key": MobileLibrary.ListMode.SingleSelectMaster,
						"text": "Single"
					}, {
						"key": MobileLibrary.ListMode.MultiSelect,
						"text": "Multi"
					}],
					"busy": false,
					"submitEnabled": true
				}), "settings");
				var today = new Date();
				today = this.date(today);
				this._JSONModel.setProperty("/REData/APPLICATIONDATE", today); //到期日
				// this.getUserInfo();
			},
			getUserInfo: function () {
				this.setBusy(true);
				this._ODataModel = this.getModel("GetEMPLOYEES");
				var sPath = "/EMPLOYEES" + "('" + this._JSONModel.getProperty("/UserSet/name") + "')";
				var mParameters = {
					success: function (oData) {
						this._JSONModel.setProperty("/REData/APPLICANT", oData.ACCOUNT); //申请人账号
						this._JSONModel.setProperty("/REData/APPLICANTNAME", oData.FULLNAME); //申请人姓名
						this._JSONModel.setProperty("/REData/COMPANYCODE", oData.COMPANYCODE); //公司
						this.getCompanyName(oData.COMPANYCODE);
						this.getCompanyCodeCurr(oData.COMPANYCODE);
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						if (oError.statusCode === "404") {
							MessageToast.show("请先维护用户信息！");
							this.setBusy(false);
							return;
						} else {
							MessageToast.show(oError.statusText);
						}
						this.setBusy(false);
					}.bind(this),
				};
				this._ODataModel.read(sPath, mParameters);
			},
			getCompanyName: function (CompanyCode) {
				this.setBusy(true);
				var sPath = "/YY1_CompanyCode" + "('" + CompanyCode + "')";
				var mParameters = {
					success: function (oData) {
						this._JSONModel.setProperty("/REData/COMPANYNAME", oData.CompanyCodeName); //公司名称
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this),
				};
				this.getModel("COMPANYNAME").read(sPath, mParameters);
			},
			//取汇率
			getCurrencyRate: function () {
				this.setBusy(true);
				var REData = this._JSONModel.getData().REData;
				// var oFilter1 = new sap.ui.model.Filter("ExchangeRateEffectiveDate", sap.ui.model.FilterOperator.EQ, new Date());
				var oFilter2 = new sap.ui.model.Filter("TargetCurrency", sap.ui.model.FilterOperator.EQ, REData.COMCURRENCY);
				var oFilter3 = new sap.ui.model.Filter("SourceCurrency", sap.ui.model.FilterOperator.EQ, REData.CURRENCY);
				var oFilter4 = new sap.ui.model.Filter("ExchangeRateType", sap.ui.model.FilterOperator.EQ, "M");
				var aFilters = [oFilter2, oFilter3, oFilter4];
				var mParameters = {
					filters: aFilters,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						for (var p = 0; p < Arry.length; p++) {
							var datetime = new Date(Arry[p].ExchangeRateEffectiveDate).getTime();
							Arry[p].datetime = datetime;
						}
						Arry.sort(sortDate);

						function sortDate(a, b) {
							return b.datetime - a.datetime;
						}
						if (Arry.length > 0) {
							this._JSONModel.setProperty("/REData/RATE", Arry[0].ExchangeRate); //汇率 
						} else {
							this._JSONModel.setProperty("/REData/RATE", "1"); //汇率
						}
						// this._JSONModel.setProperty("/REData/RATE", "1"); //汇率
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this),
				};
				this.getModel("RATEVH").read("/YY1_RATEVH", mParameters);
			},
			//获取当前公司货币
			getCompanyCodeCurr: function (CompanyCode) {
				var that = this;
				var mParameters = {
					success: function (oData) {
						that._JSONModel.setProperty("/REData/COMCURRENCY", oData.Currency); //公司货币
						// that._JSONModel.setProperty("/REData/CURRENCY", oData.Currency); //货币
						// that._JSONModel.setProperty("/REData/RATE", 1); //汇率
					},
					error: function (oError) {
						// reject(oError);
					}
				};
				var sPath = "/YY1_COMPANYCODECURRVH('" + CompanyCode + "')";
				that.getModel("COMPANYCODECURR").read(sPath, mParameters);
			},
			getSaleman: function () {
				this.setBusy(true);
				var CompanyCode = this._JSONModel.getData().REData.COMPANYCODE;
				var Customer = this._JSONModel.getData().REData.CUSTOMER;
				var oFilter1 = new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, Customer);
				var oFilter2 = new sap.ui.model.Filter("PartnerFunction", sap.ui.model.FilterOperator.EQ, "VE");
				var oFilter3 = new sap.ui.model.Filter("SalesOrganization", sap.ui.model.FilterOperator.EQ, CompanyCode);
				var aFilters = [oFilter1, oFilter2, oFilter3];
				var mParameters = {
					filters: aFilters,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						if (Arry.length !== 0) {
							this._JSONModel.setProperty("/REData/SALEMAN", Arry[0].PersonFullName); //业务员	
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this),
				};
				this.getModel("SALEMAN").read("/YY1_Saleman", mParameters);

			},
			onSearchBankAccount: function (oEvent) {
				var that = this;
				//设置语言
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}
				var CompanyCode = this._JSONModel.getData().REData.COMPANYCODE;
				if (!this._oMTableBKA) {
					var oSRColumnModel = new JSONModel();
					oSRColumnModel.setData({
						cols: [{
							label: "科目",
							template: "GLAccount"
						}, {
							label: "科目描述",
							template: "GLAccountName"
						}, {
							label: "科目货币",
							template: "GLAccountCurrency"
						}]
					});
					this._oMTableBKA = new mTable();
					this._oMTableBKA.setModel(oSRColumnModel, "columns");
					this._oMTableBKA.setModel(this.getModel("BANKGLACCOUNTVH"), "BANKGLACCOUNTVH");
					this._oMTableBKA.getModel("BANKGLACCOUNTVH").attachBatchRequestCompleted(function (oEvent) {
						that._oValueHelpDialogBKA.setContentHeight("100%");
					});
				}
				if (!this._oFilterBarBKA) {
					this._oFilterBarBKA = new FilterBar({
						advancedMode: true,
						filterBarExpanded: true, //Device.system.phone,
						filterGroupItems: [new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "GLAccount",
								label: "會計科目",
								control: new Input({
									id: "GLAccount"
								}),
								visibleInFilterBar: true
							}),
							new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "GLAccountName",
								label: "科目描述",
								control: new Input({
									id: "GLAccountName"
								}),
								visibleInFilterBar: true
							})
						],
						search: function (oEvent) {
							var aSearchItems = oEvent.getParameters().selectionSet;
							var aFilters = [];
							for (var i = 0; i < aSearchItems.length; i++) {
								if (aSearchItems[i].getValue() != "") {
									var filter = new Filter({
										path: aSearchItems[i].getId(),
										operator: FilterOperator.Contains,
										value1: aSearchItems[i].getValue()
									});
									aFilters.push(filter);
								}

							}
							var aFiltersLast = [new Filter({
									path: "Language",
									operator: FilterOperator.EQ,
									value1: sLanguage
								}),
								new Filter({
									path: "CompanyCode",
									operator: FilterOperator.EQ,
									value1: CompanyCode
								})
							];
							if (aFilters.length > 0) {
								aFiltersLast.push(new Filter({
									filters: aFilters,
									and: false
								}));
							}

							that._oMTableBKA.bindItems({
								path: "BANKGLACCOUNTVH>/YY1_BANKGLACCOUNTVH",
								template: new sap.m.ColumnListItem({
									// type: "Navigation",
									cells: [
										new Text({
											text: "{BANKGLACCOUNTVH>GLAccount}"
										}),
										new Text({
											text: "{BANKGLACCOUNTVH>GLAccountName}"
										}),
										new Text({
											text: "{BANKGLACCOUNTVH>GLAccountCurrency}"
										})
									]
								}),
								filters: aFiltersLast
							});

						},
						clear: function (oEvent) {

						}
					});
				}

				if (!this._oValueHelpDialogBKA) {
					this._oValueHelpDialogBKA = new ValueHelpDialog("idValueHelpBKA", {
						supportRanges: false,
						supportMultiselect: false,
						// filterMode: true,
						key: "GLAccount",
						descriptionKey: "GLAccount",
						title: "银行科目",
						ok: function (oEvent) {

							this.close();
						},
						cancel: function () {
							this.close();
						},
						selectionChange: function (oEvent) {
							var sPath = oEvent.getParameter("tableSelectionParams").listItem.getBindingContextPath();
							// var sItemPath_G = that.getModel().getProperty("/valueHelpItemPath");
							// that.getModel().setProperty(sItemPath_G + "/Material", that.getModel("Product").getProperty(sPath).Product);
							// that.getModel().setProperty(sItemPath_G + "/MaterialDescription", that.getModel("Product").getProperty(sPath).ProductDescription);
							// that.getModel().setProperty(sItemPath + "/Material",that.gt)
							that._JSONModel.setProperty("/REData/BANKACCOUNT", that.getModel("BANKGLACCOUNTVH").getProperty(sPath).GLAccount);
							that._JSONModel.setProperty("/REData/BANKACCOUNTDES", that.getModel("BANKGLACCOUNTVH").getProperty(sPath).GLAccountName);
							that._JSONModel.setProperty("/REData/CURRENCY", that.getModel("BANKGLACCOUNTVH").getProperty(sPath).GLAccountCurrency);
							that._oMTableBKA.removeSelections(true);
							var REData = that._JSONModel.getData().REData;
							if (REData.CURRENCY !== REData.COMCURRENCY) {
								that.getCurrencyRate();
							} else {
								that._JSONModel.setProperty("/REData/RATE", 1);
							}
						}
					});
					this._oValueHelpDialogBKA.setTable(this._oMTableBKA);
					this._oValueHelpDialogBKA.setFilterBar(this._oFilterBarBKA);
				}

				this._oValueHelpDialogBKA.open();

			},
			onSearchCustomer: function (oEvent) {
				var that = this;
				//设置语言
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}
				var CompanyCode = this._JSONModel.getData().REData.COMPANYCODE;
				if (!this._oMTableC) {
					var oSRColumnModel = new JSONModel();
					oSRColumnModel.setData({
						cols: [{
							label: "客户编码",
							template: "Customer"
						}, {
							label: "客户描述",
							template: "CustomerName"
						}, {
							label: "客户简称",
							template: "SearchTerm1"
						}]
					});
					this._oMTableC = new mTable();
					this._oMTableC.setModel(oSRColumnModel, "columns");
					this._oMTableC.setModel(this.getModel("CUSTOMERVH"), "CUSTOMERVH");
					this._oMTableC.getModel("CUSTOMERVH").attachBatchRequestCompleted(function (oEvent) {
						that._oValueHelpDialogC.setContentHeight("100%");
					});
				}
				if (!this._oFilterBarC) {
					this._oFilterBarC = new FilterBar({
						advancedMode: true,
						filterBarExpanded: true, //Device.system.phone,
						//showGoOnFB: !Device.system.phone,
						filterGroupItems: [new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "Customer",
								label: "客户编码",
								control: new Input({
									id: "Customer"
								}),
								visibleInFilterBar: true
							}),
							new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "CustomerName",
								label: "客户描述",
								control: new Input({
									id: "CustomerName"
								}),
								visibleInFilterBar: true
							}),
							new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "SearchTerm1",
								label: "客户简称",
								control: new Input({
									id: "SearchTerm1"
								}),
								visibleInFilterBar: true
							})
						],
						search: function (oEvent) {
							var aSearchItems = oEvent.getParameters().selectionSet;
							var aFilters = [];
							for (var i = 0; i < aSearchItems.length; i++) {
								// sMsg += "/" + aSearchItems[i].getValue();
								if (aSearchItems[i].getValue() != "") {
									var filter = new Filter({
										path: aSearchItems[i].getId(),
										operator: FilterOperator.Contains,
										value1: aSearchItems[i].getValue()
									});
									aFilters.push(filter);
								}

							}
							var aFiltersLast = [
								// new Filter({
								// 	path: "Language",
								// 	operator: FilterOperator.EQ,
								// 	value1: sLanguage
								// }),
								new Filter({
									path: "CompanyCode",
									operator: FilterOperator.EQ,
									value1: CompanyCode
								})
							];
							if (aFilters.length > 0) {
								aFiltersLast.push(new Filter({
									filters: aFilters,
									and: false
								}));
							}

							that._oMTableC.bindItems({
								path: "CUSTOMERVH>/YY1_CUMTOMERVH",
								template: new sap.m.ColumnListItem({
									// type: "Navigation",
									cells: [
										new Text({
											text: "{CUSTOMERVH>Customer}"
										}),
										new Text({
											text: "{CUSTOMERVH>CustomerName}"
										}),
										new Text({
											text: "{CUSTOMERVH>SearchTerm1}"
										})
									]
								}),
								filters: aFiltersLast
							});

						},
						clear: function (oEvent) {

						}
					});
				}

				if (!this._oValueHelpDialogC) {
					this._oValueHelpDialogC = new ValueHelpDialog("idValueHelpC", {
						supportRanges: false,
						supportMultiselect: false,
						// filterMode: true,
						key: "CUSTOMER",
						descriptionKey: "CUSTOMER",
						title: "客户",
						ok: function (oEvent) {

							this.close();
						},
						cancel: function () {
							this.close();
						},
						selectionChange: function (oEvent) {
							var sPath = oEvent.getParameter("tableSelectionParams").listItem.getBindingContextPath();
							if (that.getModel("CUSTOMERVH").getProperty(sPath).BusinessPartnerGrouping === "CPDA" || that.getModel("CUSTOMERVH").getProperty(
									sPath).BusinessPartnerGrouping === "CPDN") {
								that._JSONModel.setProperty("/REData/ONETIMECUSTOMER", "是");
							} else {
								that._JSONModel.setProperty("/REData/ONETIMECUSTOMER", "否");
							}
							that._JSONModel.setProperty("/REData/CUSTOMER", that.getModel("CUSTOMERVH").getProperty(sPath).Customer);
							that._JSONModel.setProperty("/REData/CUSTOMERNAME", that.getModel("CUSTOMERVH").getProperty(sPath).CustomerName);
							that._JSONModel.setProperty("/REData/SHORTNAME", that.getModel("CUSTOMERVH").getProperty(sPath).SearchTerm1);
							that._oMTableC.removeSelections(true);
							that.getSaleman();
						}
					});
					this._oValueHelpDialogC.setTable(this._oMTableC);
					this._oValueHelpDialogC.setFilterBar(this._oFilterBarC);
				}

				this._oValueHelpDialogC.open();
			},
			onSearchCurrency: function (oEvent) {
				var that = this;
				//设置语言
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}

				if (!this._oMTableCUR) {
					var oSRColumnModel = new JSONModel();
					oSRColumnModel.setData({
						cols: [{
							label: "货币",
							template: "Currency"
						}, {
							label: "描述",
							template: "CurrencyName"
						}]
					});
					this._oMTableCUR = new mTable();
					this._oMTableCUR.setModel(oSRColumnModel, "columns");
					this._oMTableCUR.setModel(this.getModel("CURRENCYVH"), "CURRENCYVH");
					this._oMTableCUR.getModel("CURRENCYVH").attachBatchRequestCompleted(function (oEvent) {
						that._oValueHelpDialogCUR.setContentHeight("100%");
					});
				}

				// that._oMTableCUR.bindItems({
				// 	path: "CURRENCYVH>/YY1_CURRVH",
				// 	template: new sap.m.ColumnListItem({
				// 		cells: [
				// 			new Text({
				// 				text: "{CURRENCYVH>Currency}"
				// 			}),
				// 			new Text({
				// 				text: "{CURRENCYVH>CurrencyName}"
				// 			})
				// 		]
				// 	}),
				// 	filters: [
				// 		new Filter({
				// 			path: "Language",
				// 			operator: FilterOperator.EQ,
				// 			value1: sLanguage
				// 		})
				// 	]
				// });

				if (!this._oFilterBarCUR) {
					if (!this._CurrencyInput) {
						this._CurrencyInput = new Input({
							id: "Currency"
						});
					}

					if (!this._CurrencyNameInput) {
						this._CurrencyNameInput = new Input({
							id: "CurrencyName"
						});
					}

					this._oFilterBarCUR = new FilterBar({
						advancedMode: true,
						filterBarExpanded: true, //Device.system.phone,
						//showGoOnFB: !Device.system.phone,
						filterGroupItems: [new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "Currency",
								label: "币种",
								control: this._CurrencyInput,
								visibleInFilterBar: true
							}),
							new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "CurrencyName",
								label: "币种描述",
								control: this._CurrencyNameInput,
								visibleInFilterBar: true
							})
						],
						search: function (oEvent) {
							var aSearchItems = oEvent.getParameters().selectionSet;
							var aFilters = [];
							for (var i = 0; i < aSearchItems.length; i++) {
								// sMsg += "/" + aSearchItems[i].getValue();
								if (aSearchItems[i].getValue() != "") {
									var filter = new Filter({
										path: aSearchItems[i].getId(),
										operator: FilterOperator.Contains,
										value1: aSearchItems[i].getValue()
									});
									aFilters.push(filter);
								}

							}
							var aFiltersLast = [new Filter({
									path: "Language",
									operator: FilterOperator.EQ,
									value1: sLanguage
								})
								// new Filter({
								// 	path: "CompanyCode",
								// 	operator: FilterOperator.EQ,
								// 	value1: that.getModel("Payment").getProperty("/Header/ApplicteCompany")
								// })
							];
							if (aFilters.length > 0) {
								aFiltersLast.push(new Filter({
									filters: aFilters,
									and: false
								}));
							}
							that._oMTableCUR.bindItems({
								path: "CURRENCYVH>/YY1_CURRVH",
								template: new sap.m.ColumnListItem({
									cells: [
										new Text({
											text: "{CURRENCYVH>Currency}"
										}),
										new Text({
											text: "{CURRENCYVH>CurrencyName}"
										})
									]
								}),
								filters: aFiltersLast
							});
							// that._oMTableCUR.bindItems({
							// 	path: "BANKGLACCOUNTVH>/YY1_BANKGLACCOUNTVH",
							// 	template: new sap.m.ColumnListItem({
							// 		cells: [
							// 			new Text({
							// 				text: "{BANKGLACCOUNTVH>GLAccount}"
							// 			}),
							// 			new Text({
							// 				text: "{BANKGLACCOUNTVH>GLAccountName}"
							// 			}),
							// 			new Text({
							// 				text: "{BANKGLACCOUNTVH>CompanyCode}"
							// 			})
							// 		]
							// 	}),
							// 	filters: aFiltersLast
							// });

						},
						clear: function (oEvent) {

						}
					});
				}

				if (!this._oValueHelpDialogCUR) {
					this._oValueHelpDialogCUR = new ValueHelpDialog("idValueHelpCUR", {
						supportRanges: false,
						supportMultiselect: false,
						key: "Currency",
						descriptionKey: "CurrencyName",
						title: "货币搜索",
						ok: function (oEvent) {
							this.close();
						},
						cancel: function () {
							this.close();
						},
						selectionChange: function (oEvent) {
							var sPath = oEvent.getParameter("tableSelectionParams").listItem.getBindingContextPath();
							that._JSONModel.setProperty("/REData/CURRENCY", that.getModel("CURRENCYVH").getProperty(sPath).Currency);
							that._oMTableCUR.removeSelections(true);
							var REData = that._JSONModel.getData().REData;
							if (REData.CURRENCY !== REData.COMCURRENCY) {
								that.getCurrencyRate();
							} else {
								that._JSONModel.setProperty("/REData/RATE", 1);
							}

						}
					});
				}
				this._oValueHelpDialogCUR.setTable(this._oMTableCUR);
				this._oValueHelpDialogCUR.setFilterBar(this._oFilterBarCUR);

				this._oValueHelpDialogCUR.open();

			},
			handleSubmit: function () {
				this.setBusy(true);
				var REData = this._JSONModel.getData().REData; //REData Data
				if (REData.FLOW !== "") {
					messages.showText("当前数据已提交！");
					this.setBusy(false);
					return;
				}
				if (REData.BANKACCOUNT === "11810001" & (REData.NETDUEDATE === "" || REData.BILLNUMBER === "")) {
					messages.showText("请先输入票据编号和到期日！");
					this.setBusy(false);
					return;
				}
				var oBankAccount = this.byId("BankAccount");
				var oCustomer = this.byId("Customer");
				var oReceivingAmountTrans = this.byId("ReceivingAmountTrans");
				if (REData.BANKACCOUNT === "" || REData.CUSTOMER === "" || REData.RAMOUNTT === "") {
					messages.showText("请先输入必输字段");
					this.setBusy(false);
					oBankAccount.setValueState(sap.ui.core.ValueState.Error);
					oCustomer.setValueState(sap.ui.core.ValueState.Error);
					oReceivingAmountTrans.setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					oBankAccount.setValueState(sap.ui.core.ValueState.None);
					oCustomer.setValueState(sap.ui.core.ValueState.None);
					oReceivingAmountTrans.setValueState(sap.ui.core.ValueState.None);
				}
				var that = this;
				that.createDIR().then(function (oData) {
					//上传 Attachment
					that.uploadAttachment(oData);
					// 回写XSODATA 日志
					that.postToCFHana().then(function (oData1) {
						// 启动工作流
						var token = that._fetchToken();
						that._startInstance(token).then(function (result) {
							//存储抬头日志表
							that.saveLogHeader(result);
							that.setBusy(false);
							MessageToast.show("工作流程已成功启动");
						});
					});
				});
			},
			postToCFHana: function () {
				var that = this;
				var promise = new Promise(function (resolve, reject) {
					that.createRECEIPT(that).then(function (oData) {
						that.getModel().setProperty("/REData/FLOW", oData.FLOW);
						resolve(oData);
					});
				});
				return promise;
			},
			createRECEIPT: function (oController) {
				var REData = oController._JSONModel.getData().REData; //REData Data
				var promise = new Promise(function (resolve, reject) {
					oController.GetSequence(oController).then(function (oSequence) {
						var ERPOSTData = {
							FLOW: oSequence, //oSequence.Number,
							APPLICATIONDATE: new Date(), //REData.APPLICATIONDATE,
							APPLICANT: REData.APPLICANT,
							COMPANYCODE: REData.COMPANYCODE,
							BANKACCOUNT: REData.BANKACCOUNT,
							CUSTOMER: REData.CUSTOMER,
							SALEMAN: REData.SALEMAN,
							ASSIGNMENT: REData.ASSIGNMENT,
							NETDUEDATE: new Date(), //REData.NETDUEDATE,
							BILLNUMBER: REData.BILLNUMBER,
							CURRENCY: REData.CURRENCY,
							RATE: REData.RATE,
							RAMOUNTT: REData.RAMOUNTT,
							RAMOUNTL: REData.RAMOUNTL,
							CHARGEINLANDT: REData.CHARGEINLANDT,
							CHARGEINLANDL: REData.CHARGEINLANDL,
							CHARGEFOREIGNT: REData.CHARGEFOREIGNT,
							CHARGEFOREIGNL: REData.CHARGEFOREIGNL,
							NOTE: REData.NOTE
						};
						if (ERPOSTData.RATE === "") {
							ERPOSTData.RATE = 0;
						}
						if (ERPOSTData.RAMOUNTT === "") {
							ERPOSTData.RAMOUNTT = 0;
						}
						if (ERPOSTData.RAMOUNTL === "") {
							ERPOSTData.RAMOUNTL = 0;
						}
						if (ERPOSTData.CHARGEINLANDT === "") {
							ERPOSTData.CHARGEINLANDT = 0;
						}
						if (ERPOSTData.CHARGEINLANDL === "") {
							ERPOSTData.CHARGEINLANDL = 0;
						}
						if (ERPOSTData.CHARGEFOREIGNT === "") {
							ERPOSTData.CHARGEFOREIGNT = 0;
						}
						if (ERPOSTData.CHARGEFOREIGNL === "") {
							ERPOSTData.CHARGEFOREIGNL = 0;
						}

						var mParameter = {
							success: function (oData) {
								resolve(oData);
							},
							error: function (oError) {
								reject(oError);
							}
						};
						oController.getModel("RECEIPT").create("/RECEIPT", ERPOSTData, mParameter);
					});
				});
				return promise;
			},
			GetSequence: function (oController) {
				var appType = "RECEIPT";
				var promise = new Promise(function (resolve, reject) {
					$.ajax({
						url: "/destinations/Print/ws/data/order-no" + "?code=" + appType,
						method: "GET",
						async: false,
						success: function (data) {
							resolve(data);
						},
						error: function (xhr, textStatus, errorText) {
							reject(Error(errorText));
						}
					});
				});
				return promise;
				// var appType = "RECEIPT";
				// var promise = new Promise(function (resolve, reject) {
				// 	$.ajax({
				// 		url: "/destinations/APLEXHANA/xsjs/Sequence.xsjs" + "?DocType=" + appType,
				// 		method: "GET",
				// 		contentType: "application/json",
				// 		dataType: "json",
				// 		success: function (result, xhr, data) {
				// 			// resolve with the process context as result
				// 			resolve(data.responseJSON);
				// 		},
				// 		error: function (xhr, textStatus, errorText) {
				// 			reject(Error(errorText));
				// 		}
				// 	});
				// });
				// return promise;
			},
			createDIR: function () {
				var oDeferred = new jQuery.Deferred();
				var DIRCreate = {
					"DocumentInfoRecordDocType": "YBO",
					"DocumentInfoRecordDocVersion": "01",
					"DocumentInfoRecordDocPart": "000",
					"to_DocDesc": {
						"results": [{
							"Language": "ZH",
							"DocumentDescription": "123"
						}, {
							"Language": "EN",
							"DocumentDescription": "123"
						}, {
							"Language": "ZF",
							"DocumentDescription": "123"
						}]
					}
				};
				var mParameters = {
					success: function (oData) {
						oDeferred.resolve(oData);
					},
					error: function (oError) {
						MessageToast.show("存储附件错误");
						return;
					}
				};
				this.getModel("DIR").create("/A_DocumentInfoRecord", DIRCreate, mParameters);
				return oDeferred.promise();

			},
			uploadAttachment: function (oData) {
				this.getModel().setProperty("/DocumentInfoRecord", oData);
				// 上传附件
				var oUploadCollection = this.byId("UploadCollectionAttach");
				oUploadCollection.upload();

				// 绑定Upload Collection的OData URL
				var path = "Attach>/A_DocumentInfoRecordAttch(DocumentInfoRecordDocType='" + oData.DocumentInfoRecordDocType +
					"',DocumentInfoRecordDocNumber='" + oData.DocumentInfoRecordDocNumber + "',DocumentInfoRecordDocVersion='" +
					oData.DocumentInfoRecordDocVersion + "',DocumentInfoRecordDocPart='" + oData.DocumentInfoRecordDocPart + "')";

				oUploadCollection.bindElement(path);
			},
			onChange: function (oEvent) {
				this.getModel().setProperty("/AttachUploaded", "true");
			},
			onBeforeUploadStarts: function (oEvent) {
				// 设置提交附件的参数
				var oCustomerHeaderSlug = new UploadCollectionParameter({
					name: "Slug",
					value: encodeURIComponent(oEvent.getParameter("fileName"))
				});
				oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

				var oBusinessObjectTypeName = new UploadCollectionParameter({
					name: "BusinessObjectTypeName",
					value: "DRAW"
				});
				oEvent.getParameters().addHeaderParameter(oBusinessObjectTypeName);

				var oLinkedSAPObjectKey = new UploadCollectionParameter({
					name: "LinkedSAPObjectKey",
					value: this.getModel().getProperty("/DocumentInfoRecord").DocumentInfoRecord
				});
				oEvent.getParameters().addHeaderParameter(oLinkedSAPObjectKey);

				var xCsrfToken = this.getModel("Attach").getSecurityToken();
				var oxsrfToken = new UploadCollectionParameter({
					name: "x-csrf-token",
					value: xCsrfToken
				});
				oEvent.getParameters().addHeaderParameter(oxsrfToken);
			},

			onUploadComplete: function (oEvent) {
				this.getModel("Attach").refresh();
			},
			getMediaUrl: function (sUrl) {
				// if (oContext.getProperty("media_src")) {
				// 	return oContext.getProperty("media_src");
				// } else {
				// 	return "null";
				// }
				if (sUrl) {
					var url = new URL(sUrl);
					var start = url.href.indexOf(url.origin);
					var sPath = url.href.substring(start + url.origin.length, url.href.length);
					return sPath.replace("/sap/opu/odata/sap", "/destinations/WT_S4HC");

				} else {
					return "";
				}
			},
			_fetchToken: function () {
				var token;
				$.ajax({
					url: "/bpmworkflowruntime/rest/v1/xsrf-token",
					method: "GET",
					async: false,
					headers: {
						"X-CSRF-Token": "Fetch"
					},
					success: function (result, xhr, data) {
						token = data.getResponseHeader("X-CSRF-Token");
					}
				});
				return token;
			},
			_startInstance: function (token) {
				var REData = this._JSONModel.getData().REData; //REData Data
				var that = this;
				var promise = new Promise(function (resolve, reject) {
					var oContext = {
						FLOW: REData.FLOW,
						APPLICATIONDATE: REData.APPLICATIONDATE,
						APPLICANT: REData.APPLICANT,
						APPLICANTNAME: REData.APPLICANTNAME,
						COMPANYCODE: REData.COMPANYCODE,
						COMPANYNAME: REData.COMPANYNAME,
						BANKACCOUNT: REData.BANKACCOUNT,
						BANKACCOUNTDES: REData.BANKACCOUNTDES,
						CUSTOMER: REData.CUSTOMER,
						CUSTOMERNAME: REData.CUSTOMERNAME,
						ONETIMECUSTOMER: REData.ONETIMECUSTOMER,
						ONETIMECUSTOMERNAME: REData.ONETIMECUSTOMERNAME,
						SHORTNAME: REData.SHORTNAME,
						SALEMAN: REData.SALEMAN,
						ASSIGNMENT: REData.ASSIGNMENT,
						NETDUEDATE: REData.NETDUEDATE,
						BILLNUMBER: REData.BILLNUMBER,
						CURRENCY: REData.CURRENCY,
						COMCURRENCY: REData.COMCURRENCY,
						RATE: REData.RATE,
						RAMOUNTT: REData.RAMOUNTT,
						RAMOUNTTDis: REData.RAMOUNTTDis,
						RAMOUNTL: REData.RAMOUNTL,
						RAMOUNTLDis: REData.RAMOUNTLDis,
						CHARGEINLANDT: REData.CHARGEINLANDT,
						CHARGEINLANDTDis: REData.CHARGEINLANDTDis,
						CHARGEINLANDL: REData.CHARGEINLANDL,
						CHARGEINLANDLDis: REData.CHARGEINLANDLDis,
						CHARGEFOREIGNT: REData.CHARGEFOREIGNT,
						CHARGEFOREIGNTDis: REData.CHARGEFOREIGNTDis,
						CHARGEFOREIGNL: REData.CHARGEFOREIGNL,
						CHARGEFOREIGNLDis: REData.CHARGEFOREIGNLDis,
						CurrUpperCase1: REData.CurrUpperCase1,
						CurrUpperCase2: REData.CurrUpperCase2,
						CurrUpperCase3: REData.CurrUpperCase3,
						CurrUpperCase4: REData.CurrUpperCase4,
						NOTE: REData.NOTE,
						POSTAGEEXPENSE: REData.POSTAGEEXPENSE,
						POSTAGEEXPENSEL: REData.POSTAGEEXPENSEL,
						DocumentInfoRecord: that.getModel().getProperty("/DocumentInfoRecord")
					};
					$.ajax({
						url: "/bpmworkflowruntime/rest/v1/workflow-instances",
						method: "POST",
						async: false,
						contentType: "application/json",
						headers: {
							"X-CSRF-Token": token
						},
						data: JSON.stringify({
							definitionId: "workflow_receipt",
							context: oContext
						}),
						success: function (result, xhr, data) {
							resolve(result);
						},
						error: function (result, xhr, data) {
							reject(result);
						}
					});
				});
				return promise;
			},
			saveLogHeader: function (oHeader) {
				var REData = this._JSONModel.getData().REData; //REData Data
				var logheader = {
					STARTCOMPANY: REData.COMPANYCODE,
					FLOWID: "workflow_receipt",
					INSTANCEID: oHeader.id,
					DOCUMENT: REData.FLOW,
					REQUESTER: REData.APPLICANT,
					STATUS: ""
				};
				this.getModel("WORKFLOWLOG").create("/WORKFLOWHEAD", logheader);
			},
			changeMoneyToChinese: function (oEvent) {
				this.setBusy(true);
				var RATE = this._JSONModel.getData().REData.RATE;
				var CURRENCY = this._JSONModel.getData().REData.CURRENCY;
				var COMPANYCODE = this._JSONModel.getData().REData.COMPANYCODE;
				if (CURRENCY === "") {
					MessageToast.show("请先输入货币！");
					this.setBusy(false);
					return;
				}
				if (RATE === "") {
					RATE = 1;
				}
				var fcode = this.getfcode(oEvent);
				switch (fcode) {
				case "ReceivingAmountTrans":
					var money = this._JSONModel.getData().REData.RAMOUNTT;
					break;
				case "ChargeInlandTrans":
					var money = this._JSONModel.getData().REData.CHARGEINLANDT;
					break;
				case "ChargeForeignTrans":
					var money = this._JSONModel.getData().REData.CHARGEFOREIGNT;
					break;
				case "PostageExpense":
					var money = this._JSONModel.getData().REData.POSTAGEEXPENSE;
					break;
				}
				if (money === "") {
					money = 0;
				}
				if (CURRENCY === 'TWD') {
					money = parseFloat(money).toFixed(0);
				} else {
					money = parseFloat(money).toFixed(2);
				}
				var wan = this.getModel("i18n").getResourceBundle().getText("Curr1");
				var yi = this.getModel("i18n").getResourceBundle().getText("Curr2");
				var liu = this.getModel("i18n").getResourceBundle().getText("Curr3");
				var er = this.getModel("i18n").getResourceBundle().getText("Curr4");
				var cnNums = new Array("零", "壹", er, "叁", "肆", "伍", liu, "柒", "捌", "玖"); //汉字的数字  
				var cnIntRadice = new Array("", "拾", "佰", "仟"); //基本单位  
				var cnIntUnits = new Array("", wan, yi, "兆"); //对应整数部分扩展单位  
				var cnDecUnits = new Array("角", "分", "毫", "厘"); //对应小数部分单位  
				//var cnInteger = "整"; //整数金额时后面跟的字符  
				var cnIntLast = "元"; //整型完以后的单位  
				var maxNum = 999999999999999.9999; //最大处理的数字  

				var IntegerNum; //金额整数部分  
				var DecimalNum; //金额小数部分  
				var ChineseStr = ""; //输出的中文金额字符串  
				var parts; //分离金额后用的数组，预定义  
				if (money === "") {
					this.setBusy(false);
					return;
				}
				money = parseFloat(money);
				if (money >= maxNum) {
					MessageToast.show("超出最大处理数字");
					this.setBusy(false);
					return;
				}
				if (money === 0) {
					ChineseStr = cnNums[0] + cnIntLast;
					switch (fcode) {
					case "ReceivingAmountTrans":
						this.getModel().setProperty("/REData/CurrUpperCase1", ChineseStr);
						break;
					case "ChargeInlandTrans":
						this.getModel().setProperty("/REData/CurrUpperCase2", ChineseStr);
						break;
					case "ChargeForeignTrans":
						this.getModel().setProperty("/REData/CurrUpperCase3", ChineseStr);
						break;
					case "PostageExpense":
						this.getModel().setProperty("/REData/CurrUpperCase4", ChineseStr);
						break;
					}
					this.setBusy(false);
					return;
				}
				money = money.toString(); //转换为字符串  
				if (money.indexOf(".") === -1) {
					IntegerNum = money;
					DecimalNum = '';
				} else {
					parts = money.split(".");
					IntegerNum = parts[0];
					DecimalNum = parts[1].substr(0, 4);
				}
				if (parseInt(IntegerNum, 10) > 0) { //获取整型部分转换  
					var zeroCount = 0;
					var IntLen = IntegerNum.length;
					for (var i = 0; i < IntLen; i++) {
						var n = IntegerNum.substr(i, 1);
						var p = IntLen - i - 1;
						var q = p / 4;
						var m = p % 4;
						if (n == "0") {
							zeroCount++;
						} else {
							if (zeroCount > 0) {
								ChineseStr += cnNums[0];
							}
							zeroCount = 0; //归零  
							ChineseStr += cnNums[parseInt(n)] + cnIntRadice[m];
						}
						if (m == 0 && zeroCount < 4) {
							ChineseStr += cnIntUnits[q];
						}
					}
					ChineseStr += cnIntLast;
					//整型部分处理完毕  
				}
				if (DecimalNum != '') { //小数部分  
					var decLen = DecimalNum.length;
					for (var i = 0; i < decLen; i++) {
						n = DecimalNum.substr(i, 1);
						if (n != '0') {
							ChineseStr += cnNums[Number(n)] + cnDecUnits[i];
						}
					}
				}
				if (ChineseStr === '') {
					ChineseStr += cnNums[0] + cnIntLast;
				}

				if (CURRENCY === 'TWD') {
					money = parseFloat(money).toFixed(0);
				} else {
					money = parseFloat(money).toFixed(2);
				}
				switch (fcode) {
				case "ReceivingAmountTrans":
					this.getModel().setProperty("/REData/CurrUpperCase1", ChineseStr);
					if (COMPANYCODE === '6310') {
						this.getModel().setProperty("/REData/RAMOUNTL", parseFloat(RATE * money).toFixed(0));
						// this.getModel().setProperty("/REData/RAMOUNTLDis", this.fmoney(parseFloat(RATE * money), 0));
					} else {
						this.getModel().setProperty("/REData/RAMOUNTL", parseFloat(RATE * money).toFixed(2));
						// this.getModel().setProperty("/REData/RAMOUNTLDis", this.fmoney(parseFloat(RATE * money), 2));
					}
					if (CURRENCY === 'TWD') {
						this.getModel().setProperty("/REData/RAMOUNTT", parseFloat(money).toFixed(0));
						// this.getModel().setProperty("/REData/RAMOUNTTDis", this.fmoney(parseFloat(money), 0));
					} else {
						this.getModel().setProperty("/REData/RAMOUNTT", parseFloat(money).toFixed(2));
						// this.getModel().setProperty("/REData/RAMOUNTTDis", this.fmoney(parseFloat(money), 2));
					}
					break;
				case "ChargeInlandTrans":
					this.getModel().setProperty("/REData/CurrUpperCase2", ChineseStr);
					if (COMPANYCODE === "6310") {
						this.getModel().setProperty("/REData/CHARGEINLANDL", parseFloat(RATE * money).toFixed(0));
						// this.getModel().setProperty("/REData/CHARGEINLANDLDis", this.fmoney(parseFloat(RATE * money), 0));
					} else {
						this.getModel().setProperty("/REData/CHARGEINLANDL", parseFloat(RATE * money).toFixed(2));
						// this.getModel().setProperty("/REData/CHARGEINLANDLDis", this.fmoney(parseFloat(RATE * money), 2));
					}
					if (CURRENCY === "TWD") {
						this.getModel().setProperty("/REData/CHARGEINLANDT", parseFloat(money).toFixed(0));
						// this.getModel().setProperty("/REData/CHARGEINLANDTDis", this.fmoney(parseFloat(money), 0));
					} else {
						this.getModel().setProperty("/REData/CHARGEINLANDT", parseFloat(money).toFixed(2));
						// this.getModel().setProperty("/REData/CHARGEINLANDTDis", this.fmoney(parseFloat(money), 2));
					}
					break;
				case "ChargeForeignTrans":
					this.getModel().setProperty("/REData/CurrUpperCase3", ChineseStr);
					if (COMPANYCODE === "6310") {
						this.getModel().setProperty("/REData/CHARGEFOREIGNL", parseFloat(RATE * money).toFixed(0));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNLDis", this.fmoney(parseFloat(RATE * money), 0));
					} else {
						this.getModel().setProperty("/REData/CHARGEFOREIGNL", parseFloat(RATE * money).toFixed(2));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNLDis", this.fmoney(parseFloat(RATE * money), 2));
					}
					if (CURRENCY === "TWD") {
						this.getModel().setProperty("/REData/CHARGEFOREIGNT", parseFloat(money).toFixed(0));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNTDis", this.fmoney(parseFloat(money), 0));
					} else {
						this.getModel().setProperty("/REData/CHARGEFOREIGNT", parseFloat(money).toFixed(2));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNTDis", this.fmoney(parseFloat(money), 2));
					}
					break;
				case "PostageExpense":
					this.getModel().setProperty("/REData/CurrUpperCase4", ChineseStr);
					if (COMPANYCODE === "6310") {
						this.getModel().setProperty("/REData/POSTAGEEXPENSEL", parseFloat(RATE * money).toFixed(0));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNLDis", this.fmoney(parseFloat(RATE * money), 0));
					} else {
						this.getModel().setProperty("/REData/POSTAGEEXPENSEL", parseFloat(RATE * money).toFixed(2));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNLDis", this.fmoney(parseFloat(RATE * money), 2));
					}
					if (CURRENCY === "TWD") {
						this.getModel().setProperty("/REData/POSTAGEEXPENSE", parseFloat(money).toFixed(0));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNTDis", this.fmoney(parseFloat(money), 0));
					} else {
						this.getModel().setProperty("/REData/POSTAGEEXPENSE", parseFloat(money).toFixed(2));
						// this.getModel().setProperty("/REData/CHARGEFOREIGNTDis", this.fmoney(parseFloat(money), 2));
					}
					break;
				}
				this.setBusy(false);
			},
			getfcode: function (oEvent) {
				// var sButId = oEvent.getParameter("id");
				// var aButId = sButId.split("-");
				// var iLast = parseInt(aButId.length) - 1;
				// var sOP = aButId[iLast].replace("button", "");
				// sOP = sOP.replace("but", "");
				// sOP = sOP.replace("bt", "");
				// return sOP;
				var sButId = oEvent.getParameter("id");
				var aButId = sButId.split("-");
				var sOP = aButId[8].replace("button", ""); /*5 */
				return sOP;
			},
			changeENCY: function () {
				var REData = this._JSONModel.getData().REData;
				if (REData.CURRENCY !== "") {
					REData.CURRENCY = REData.CURRENCY.toUpperCase();
					if (REData.CURRENCY !== REData.COMCURRENCY) {
						this.getCurrencyRate();
					}
				}
			},
			handleCancel: function () {
				var REData = this._JSONModel.getData().REData;
				var sREData = {
					FLOW: "", //申请编号
					APPLICATIONDATE: new Date(), //申请日期
					APPLICANT: REData.APPLICANT, //申请人
					APPLICANTNAME: REData.APPLICANTNAME, //申请人姓名
					COMPANYCODE: REData.COMPANYCODE, //公司代码
					COMPANYNAME: REData.COMPANYNAME,
					COMCURRENCY: REData.COMCURRENCY, //本币币种
					BANKACCOUNT: "", //银行账号can
					CUSTOMER: "", //客户
					SALEMAN: "", //业务员
					ASSIGNMENT: "", //分配
					NETDUEDATE: "", //到期日
					BILLNUMBER: "", //票据编号
					CURRENCY: "", //币种
					RATE: "", //汇率
					RAMOUNTT: "", //收款金额
					RAMOUNTTDis: "",
					RAMOUNTL: "", //本币金额
					RAMOUNTLDis: "",
					CHARGEINLANDT: "", //手续费(国内)
					CHARGEINLANDTDis: "",
					CHARGEINLANDL: "", //本币金额
					CHARGEINLANDLDis: "",
					CHARGEFOREIGNT: "", //手续费(国外)
					CHARGEFOREIGNTDis: "",
					CHARGEFOREIGNL: "", //本币金额
					CHARGEFOREIGNLDis: "",
					SHORTNAME: "", //客户简称
					CurrUpperCase1: "", //金额大写
					CurrUpperCase2: "", //金额大写
					CurrUpperCase3: "", //金额大写
					CurrUpperCase4: "", //金额大写
					NOTE: "", //备注
					POSTAGEEXPENSE: "", //邮资款
					POSTAGEEXPENSEL: ""
				};
				this.getModel().setProperty("/REData", sREData);
			},
			fmoney: function (s, n) {
				// n = n > 0 & n <= 20 ? n : 2;
				s = parseFloat((s + "").replace(/[^\d\.-]/g, "")).toFixed(n) + "";
				if (n === 0) {
					var l = s.split(".")[0].split("").reverse();
					// r = s.split(".")[1];
					var t = "";
					for (var i = 0; i < l.length; i++) {
						t += l[i] + ((i + 1) % 3 == 0 && (i + 1) != l.length ? "," : "");
					}
					return t.split("").reverse().join("");
				} else {
					var l = s.split(".")[0].split("").reverse(),
						r = s.split(".")[1];
					var t = "";
					for (var i = 0; i < l.length; i++) {
						t += l[i] + ((i + 1) % 3 == 0 && (i + 1) != l.length ? "," : "");
					}
					return t.split("").reverse().join("") + "." + r;
				}
			},
			//客户
			handleChangeC: function () {
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
				case "zh-Hant-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}
				var Customer = this._JSONModel.getData().REData.CUSTOMER;
				var oFilter1 = new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, Customer);
				var oFilter2 = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, sLanguage);
				var aFilters = [oFilter1, oFilter2];
				var mParameters = {
					filters: aFilters,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						if (Arry.length !== 0) {
							this._JSONModel.setProperty("/REData/CUSTOMERNAME", Arry[0].CustomerName);
						} else {
							MessageToast.show("客户不存在，请检查输入！");
							// this.setBusy(false);
							this._JSONModel.setProperty("/REData/CUSTOMER", "");
							this._JSONModel.setProperty("/REData/CUSTOMERNAME", "");
							return;
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this),
				};
				this.getModel("CUSTOMERVH").read("/YY1_CUMTOMERVH", mParameters);

			},
			//银行账户
			handleChangeB: function () {
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}
				var REData = this._JSONModel.getData().REData;
				var oFilter1 = new sap.ui.model.Filter("GLAccount", sap.ui.model.FilterOperator.EQ, REData.BANKACCOUNT);
				// var oFilter2 = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, sLanguage);
				var oFilter3 = new sap.ui.model.Filter("CompanyCode", sap.ui.model.FilterOperator.EQ, REData.COMPANYCODE);
				var aFilters = [oFilter1, oFilter3];
				var mParameters = {
					filters: aFilters,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						if (Arry.length !== 0) {
							this._JSONModel.setProperty("/REData/BANKACCOUNTDES", Arry[0].GLAccountName);
						} else {
							MessageToast.show("账户不存在，请检查输入！");
							// this.setBusy(false);
							this._JSONModel.setProperty("/REData/BANKACCOUNT", "");
							this._JSONModel.setProperty("/REData/BANKACCOUNTDES", "");
							return;
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this),
				};
				this.getModel("BANKGLACCOUNTVH").read("/YY1_BANKGLACCOUNTVH", mParameters);
			},
			changeNCY: function () {
				this.setBusy(true);
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}
				var Currency = this.byId("Currency").getValue();
				Currency = Currency.toUpperCase();
				var oFilter1 = new sap.ui.model.Filter("Currency", sap.ui.model.FilterOperator.EQ, Currency);
				var oFilter2 = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, sLanguage);
				var aFilters = [oFilter1, oFilter2];
				var mParameters = {
					filters: aFilters,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						if (Arry.length !== 0) {
							this.getCurrencyRate();
							this._JSONModel.setProperty("/REData/CURRENCY", Arry[0].Currency);
						} else {
							MessageToast.show("币种不存在，请检查输入！");
							// this.setBusy(false);
							this._JSONModel.setProperty("/REData/CURRENCY", "");
							this._JSONModel.setProperty("/REData/RATE", "");
							this.setBusy(false);
							return;
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this),
				};
				this.getModel("CURRENCYVH").read("/YY1_CURRVH", mParameters);
			},
			onSearchOneCustomer: function (oEvent) {
				var that = this;
				//设置语言
				// var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				// switch (sLanguage) {
				// case "zh-Hant":
				// case "zh-TW":
				// 	sLanguage = "ZF";
				// 	break;
				// case "zh-Hans":
				// case "zh-CN":
				// 	sLanguage = "ZH";
				// 	break;
				// case "EN":
				// case "en":
				// 	sLanguage = "EN";
				// 	break;
				// default:
				// 	break;
				// }
				var CompanyCode = this._JSONModel.getData().REData.COMPANYCODE;
				if (!this._oMTableoneC) {
					var oOneCColumnModel = new JSONModel();
					oOneCColumnModel.setData({
						cols: [{
							label: "会计传票",
							template: "AccountingDocument"
						}, {
							label: "行项目",
							template: "LedgerGLLineItem"
						}, {
							label: "临时客户名称",
							template: "BusinessPartnerName1"
						}]
					});
					this._oMTableoneC = new mTable();
					this._oMTableoneC.setModel(oOneCColumnModel, "columns");
					this._oMTableoneC.setModel(this.getModel("ONETIMECUSTOMERVH"), "ONETIMECUSTOMERVH");
					this._oMTableoneC.getModel("ONETIMECUSTOMERVH").attachBatchRequestCompleted(function (oEvent) {
						that._oValueHelpDialogC.setContentHeight("100%");
					});
				}
				if (!this._oFilterBaroneC) {
					this._oFilterBaroneC = new FilterBar({
						advancedMode: true,
						filterBarExpanded: true, //Device.system.phone,
						//showGoOnFB: !Device.system.phone,
						filterGroupItems: [new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "AccountingDocument",
								label: "会计传票",
								control: new Input({
									id: "AccountingDocument"
								}),
								visibleInFilterBar: true
							}),
							new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "LedgerGLLineItem",
								label: "行项目",
								control: new Input({
									id: "LedgerGLLineItem"
								}),
								visibleInFilterBar: true
							}),
							new FilterGroupItem({
								groupTitle: "More Fields",
								groupName: "gn1",
								name: "BusinessPartnerName1",
								label: "临时客户名称",
								control: new Input({
									id: "BusinessPartnerName1"
								}),
								visibleInFilterBar: true
							})
						],
						search: function (oEvent) {
							var aSearchItems = oEvent.getParameters().selectionSet;
							var aFilters = [];
							for (var i = 0; i < aSearchItems.length; i++) {
								// sMsg += "/" + aSearchItems[i].getValue();
								if (aSearchItems[i].getValue() != "") {
									var filter = new Filter({
										path: aSearchItems[i].getId(),
										operator: FilterOperator.Contains,
										value1: aSearchItems[i].getValue()
									});
									aFilters.push(filter);
								}

							}
							var aFiltersLast = [
								new Filter({
									path: "Ledger",
									operator: FilterOperator.EQ,
									value1: "2L"
								}),
								new Filter({
									path: "CompanyCode",
									operator: FilterOperator.EQ,
									value1: CompanyCode
								}),
								new Filter({
									path: "Customer",
									operator: FilterOperator.EQ,
									value1: "A109999"
								}),
								new Filter({
									path: "ClearingAccountingDocument",
									operator: FilterOperator.EQ,
									value1: ""
								}),
							];
							if (aFilters.length > 0) {
								aFiltersLast.push(new Filter({
									filters: aFilters,
									and: false
								}));
							}

							that._oMTableoneC.bindItems({
								path: "ONETIMECUSTOMERVH>/YY1_ONETIMECUSTOMERH",
								template: new sap.m.ColumnListItem({
									// type: "Navigation",
									cells: [
										new Text({
											text: "{ONETIMECUSTOMERVH>AccountingDocument}"
										}),
										new Text({
											text: "{ONETIMECUSTOMERVH>LedgerGLLineItem}"
										}),
										new Text({
											text: "{ONETIMECUSTOMERVH>BusinessPartnerName1}"
										})
									]
								}),
								filters: aFiltersLast
							});

						},
						clear: function (oEvent) {

						}
					});
				}

				if (!this._oValueHelpDialogoneC) {
					this._oValueHelpDialogoneC = new ValueHelpDialog("idValueHelponeC", {
						supportRanges: false,
						supportMultiselect: false,
						// filterMode: true,
						key: "ONETIMECUSTOMERNAME",
						descriptionKey: "ONETIMECUSTOMERNAME",
						title: "临时客户",
						ok: function (oEvent) {

							this.close();
						},
						cancel: function () {
							this.close();
						},
						selectionChange: function (oEvent) {
							var sPath = oEvent.getParameter("tableSelectionParams").listItem.getBindingContextPath();
							that._JSONModel.setProperty("/REData/ONETIMECUSTOMERNAME", that.getModel("ONETIMECUSTOMERVH").getProperty(sPath).BusinessPartnerName1);
							that._oMTableoneC.removeSelections(true);
							// that.getSaleman();
						}
					});
					this._oValueHelpDialogoneC.setTable(this._oMTableoneC);
					this._oValueHelpDialogoneC.setFilterBar(this._oFilterBaroneC);
				}

				this._oValueHelpDialogoneC.open();
			},
			handleSearch: function () {
				var aFilters = [];
				var oFilter1 = new sap.ui.model.Filter("DocumentReferenceID", sap.ui.model.FilterOperator.EQ, "FK20120317");
				aFilters.push(oFilter1);
				this._ODataModel = this.getModel("ACCTGDOC");
				var mParameters = {
					filters: aFilters,
					success: function (oData) {
						if (oData.results.length > 0) {
							var flag = "X";
						}
					}.bind(this)
				};
				this._ODataModel.read("/A_OperationalAcctgDocItemCube", mParameters);
			},
			date: function (value) {
				if (value) {
					var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
						pattern: "yyyy-MM-dd"
					});
					return oDateFormat.format(new Date(value));
				} else {
					return value;
				}
			}
		});
	});