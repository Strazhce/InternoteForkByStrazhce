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

var testParse = function() {
    doIsValidTest("ftp://www.example.com", { protocol: "ftp", site: "www.example.com", path: [] });
    doIsValidTest("http://www.example.com", { protocol: "http", site: "www.example.com", path: [] });
    doIsValidTest("http://www.example.com/", { protocol: "http", site: "www.example.com", path: [] });
    doIsValidTest("http://www.example.com/dir", { protocol: "http", site: "www.example.com", path: ["dir"] });
    doIsValidTest("http://www.example.com/dir/", { protocol: "http", site: "www.example.com", path: ["dir", ""] });
    doIsValidTest("http://www.example.com/dir/a", { protocol: "http", site: "www.example.com", path: ["dir", "a"] });
    doIsValidTest("http://www.example.com:0", { protocol: "http", site: "www.example.com", path: [], port: 0 });
    doIsValidTest("http://www.example.com:80", { protocol: "http", site: "www.example.com", path: [], port: 80 });
    doIsValidTest("http://www.example.com:65535", { protocol: "http", site: "www.example.com", path: [], port: 65535 });
    doIsValidTest("http://aa:bb@www.example.com", { protocol: "http", site: "www.example.com", path: [], userName: "aa", password: "bb" });
    doIsValidTest("http://aa:bb@www.example.com:8080", { protocol: "http", site: "www.example.com", path: [], port: 8080, userName: "aa", password: "bb" });
    doIsValidTest("http://aa@www.example.com", { protocol: "http", site: "www.example.com", path: [], userName: "aa" });
    doIsValidTest("http://aa@www.example.com:12345", { protocol: "http", site: "www.example.com", path: [], port: 12345, userName: "aa" });
    
    doIsInvalidTest("://www.example.com");
    doIsInvalidTest("http//www.example.com");
    doIsInvalidTest("http:/www.example.com");
    doIsInvalidTest("http://aaa:www.example.com");
    doIsInvalidTest("http://www.example.com:aaa");
    doIsInvalidTest("http://www.example.com:");
    doIsInvalidTest("http://www.example.com:-1");
    doIsInvalidTest("http://www.example.com:65536");
    doIsInvalidTest("http://www.example.com:100000");
};

var doIsValidTest = function(url, expectedParsedData)
{
    var actualParsedData = utils.filterNulls(utils.parseURL(url));
    controller.assert(function() { return actualParsedData != null &&
                                   utils.areObjectsDeepEqual(actualParsedData, expectedParsedData); });
};

var doIsInvalidTest = function(url)
{
  var parsedURL = utils.parseURL(url);
  controller.assertJS("subject != null", parsedURL);
};

