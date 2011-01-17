Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var callbackCounts = [];

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
};

var setupTest = function(test) {
  utils          = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
  controller.assertJS("subject != null", utils);
};

var teardownTest = function(test) {  
};

var testParse = function() {
    testIsValid("ftp://www.example.com", { protocol: "ftp", site: "www.example.com", path: "/" });
    testIsValid("http://www.example.com", { protocol: "http", site: "www.example.com", path: "/" });
    testIsValid("http://www.example.com/", { protocol: "http", site: "www.example.com", path: "/" });
    testIsValid("http://www.example.com/dir", { protocol: "http", site: "www.example.com", path: "/dir" });
    testIsValid("http://www.example.com/dir/", { protocol: "http", site: "www.example.com", path: "/dir/" });
    testIsValid("http://www.example.com/dir/a", { protocol: "http", site: "www.example.com", path: "/dir/a" });
    testIsValid("http://www.example.com:0", { protocol: "http", site: "www.example.com", port: 0 });
    testIsValid("http://www.example.com:65535", { protocol: "http", site: "www.example.com", port: 65535 });
    testIsValid("http://aa:bb@www.example.com", { protocol: "http", site: "www.example.com", username: "aa", port: "bb });
    testIsValid("http://aa:bb@www.example.com:8080", { protocol: "http", site: "www.example.com", port: 8080, username: "aa", port: "bb });
    testIsValid("http://aa@www.example.com", { protocol: "http", site: "www.example.com", username: "aa" });
    testIsValid("http://aa@www.example.com:12345", { protocol: "http", site: "www.example.com", port: 12345, username: "aa" });
	
    testIsInvalid("://www.example.com");
    testIsInvalid("http//www.example.com");
    testIsInvalid("http:/www.example.com");
    testIsInvalid("http://aaa:www.example.com");
    testIsInvalid("http://www.example.com:aaa");
    testIsInvalid("http://www.example.com:");
    testIsInvalid("http://www.example.com:-1");
    testIsInvalid("http://www.example.com:65536");
    testIsInvalid("http://www.example.com:100000");
};

var testIsValid = function(url, expectedParsedData)
{
    var actualParsedData = utils.filterNulls(utils.parseURL(url));
    controller.assert(function() { actualParsedData != null &&
                                   return utils.areObjectsEqual(actualParsedData, expectedParsedData); });
};

var testIsInvalid = function(url)
{
  var parsedURL = utils.parseURL(url);
  controller.assertJS("subject != null", parsedURL);
};

