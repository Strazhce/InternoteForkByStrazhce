Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
};

var setupTest = function(test) {
  utils = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
  controller.assertJS("subject != null", utils);
};

var teardownTest = function(test) {  
};

var testURLSite = function() {
    doURLSiteTest("ftp://www.example.com", "www.example.com");
    doURLSiteTest("http://www.example.com", "www.example.com");
    doURLSiteTest("http://www.example.com/", "www.example.com");
    doURLSiteTest("http://www.example.com/dir", "www.example.com");
    doURLSiteTest("http://www.example.com/dir/", "www.example.com");
    doURLSiteTest("http://www.example.com/dir/a", "www.example.com");
    doURLSiteTest("http://www.example.com:0", "www.example.com");
    doURLSiteTest("http://www.example.com:80", "www.example.com");
    doURLSiteTest("http://www.example.com:65535", "www.example.com");
    doURLSiteTest("http://aa:bb@www.example.com", "www.example.com");
    doURLSiteTest("http://aa:bb@www.example.com:8080", "www.example.com");
    doURLSiteTest("http://aa@www.example.com", "www.example.com");
    doURLSiteTest("http://aa@www.example.com:12345", "www.example.com");
};

var doURLSiteTest = function(url, site)
{
    controller.assert(function()
	{
		return utils.getURLSite(url) == site;
	});
};
