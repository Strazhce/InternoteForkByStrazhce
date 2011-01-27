Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
};

var setupTest = function(test) {
  utils          = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
  controller.assertJS("subject != null", utils);
};

var teardownTest = function(test)
{
};

var testSites = function()
{
	doValidTest("www.example.com");
    doValidTest("wwww.example.com");
    doValidTest("wwww.example.co");
    doValidTest("www.example.co.uk");
    doValidTest("example.com");
    doValidTest("example.co.uk");
    doValidTest("www.domain.example.com.uk");
	doValidTest("a.b.c");
	doValidTest("www.példa.hu");
    doValidTest("12345.com");
    doValidTest("12345example.com");
    doValidTest("example12345.com");
    doValidTest("123-45.com");
    doValidTest("a.b");
    doValidTest("a-b.com");
    doValidTest("a--b.com");
    doValidTest("a-b-c.com");
	doValidTest("EXAMPLE.COM");
    doValidTest("EXAMPLE.com");
    doValidTest("example.COM");
	doValidTest("\u0080.com");
    doValidTest("\u00FF.com");
    doValidTest("\u0100.com");
    doValidTest("\uFFFF.com");
    
    doInvalidTest("\u0000.com");
    doInvalidTest("\u0001.com");
    doInvalidTest("\u007F.com");
    doInvalidTest("com");
    doInvalidTest("COM");
    doInvalidTest("co.uk");
    doInvalidTest("com.au");
    doInvalidTest("au");
    doInvalidTest(".com.au");
    doInvalidTest(".example.com");
    doInvalidTest("wwwexamplecom");
    doInvalidTest(".www.example.com");
    doInvalidTest("www.example.com.");
    doInvalidTest(".....");
    doInvalidTest(".");
    doInvalidTest("-");
    doInvalidTest("");
	doInvalidTest("-com");
    doInvalidTest("-.com");
    doInvalidTest("-a.com");
    doInvalidTest("a-.com");
    doInvalidTest("a_b.com");
    doInvalidTest("a b.com");
	doInvalidTest("a*b.com");
};

var doValidTest = function(str)
{
	controller.assert(function() { return utils.isValidSite(str); });
};

var doInvalidTest = function(str)
{
    controller.assert(function() { return !utils.isValidSite(str); });
};
