Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var callbackCounts = [];

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
};

var setupTest = function(test) {
  utils          = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
  storage        = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.mStorage.storage;
  controller.assertJS("subject != null", utils);
  controller.assertJS("subject != null", storage);
};

var teardownTest = function(test)
{  
};

urlsArray =
[
    "ftp://www.example.com",
    "http://www.example.com",
    "http://www.example.com/",
    "http://www.example.com/dir",
    "http://www.example.com/dir/",
    "http://www.example.com/dir/a",
    "http://www.example.com:0",
    "http://www.example.com:65535",
    "http://aa:bb@www.example.com",
    "http://aa:bb@www.example.com:8080",
    "http://aa@www.example.com",
    "http://aa@www.example.com:12345"
];

var testMatchesURLExact = function()
{
    for (var i = 0; i < urlsArray.length; i++)
    {
        doURLExactTest(urlsArray[i]);
    }
    
    // Standard canonicalization
    doURLsCanonExactTest("http://www.example.com", "http://www.example.com/");
    doURLsCanonExactTest("http://www.example.com/", "http://www.example.com:80/");
    doURLsCanonExactTest("http://www.example.com:90/", "http://www.example.com:90");
    
    // Extra canonicalization
    doURLsCanonExactTest("http://www.example.com/dir1", "http://www.example.com/dir1/");
    doURLsCanonExactTest("http://www.example.com/dir1/", "http://www.example.com/dir1/index.html");
    doURLsCanonExactTest("http://www.example.com/dir1/", "http://www.example.com/dir1/index.htm");
    doURLsCanonExactTest("http://www.example.com/dir1/", "http://www.example.com/dir1/index.php");
    
    doURLsDifferExactTest("ftp://www.example.com/", "http://www.example.com/");
    doURLsDifferExactTest("http://www.example.com:90/", "http://www.example.com/");
    doURLsDifferExactTest("http://aa@www.example.com/", "http://www.example.com/");
    doURLsDifferExactTest("http://aa:bb@www.example.com/", "http://www.example.com/");
    doURLsDifferExactTest("http://aa:bb@www.example.com/", "http://aa@www.example.com/");
    doURLsDifferExactTest("http://aa:bb@www.example.com/", "http://www.example.com/");
    doURLsDifferExactTest("http://www.example.com/dir1", "http://www.example.com/dir2");
    doURLsDifferExactTest("http://www.example.com/dir1/a", "http://www.example.com/dir1/");
};

var testMatchesURLSite = function()
{
    var siteTestURLArray =
    [
        "http://www.example.com",
        "ftp://www.example.com",
        "http://www.example.com/",
        "http://www.example.com/dir1",
        "http://www.example.com:80",
        "http://aa@www.example.com",
        "http://bb@www.example.com",
    ];
    
    var invalidArray =
    [
        "www.example.com/",
        ":www.example.com",
        "@www.example.com",
        "ww.example.com",
        "www.example.co",
        "wwwexample.com",
        "www.examplecom",
        "www.example2.com",
        "www.example.comm",
        "wwww.example.com",
        "wwy.example.com",
        "www.fxample.com",
        "qww.example.com",
        "www.example.cop",
    ];
    
    for (var i = 0; i < siteTestURLArray.length; i++)
    {
        doURLSiteSameTest(siteTestURLArray[i], "www.example.com");
    
        for (var j = 0; j < invalidArray.length; j++)
        {
            doURLSiteDiffTest(siteTestURLArray[i], invalidArray[j]);
        }   
    }
};

var testAll = function()
{
    for (var i = 0; i < urlsArray.length; i++)
    {
        var pageURL = urlsArray[i];
        doDoesAppearTest("",   storage.URL_MATCH_ALL, pageURL);
        for (var j = 0; j < urlsArray.length; j++)
        {
            var ignoredNoteURL = urlsArray[j];
            doDoesAppearTest(ignoredNoteURL, storage.URL_MATCH_ALL, pageURL);
        }
    }
};

var doURLSiteSameTest = function(url, site)
{
    doDoesAppearTest(site, storage.URL_MATCH_SITE, url);
};

var doURLSiteDiffTest = function(url, site)
{
    doDoesntAppearTest(site, storage.URL_MATCH_SITE, url);
};

var doURLExactTest = function(url)
{
    doDoesAppearTest(url, storage.URL_MATCH_URL, url);
};

var doURLsCanonExactTest = function(url1, url2)
{
    doDoesAppearTest(url1, storage.URL_MATCH_URL, url2);
    doDoesAppearTest(url2, storage.URL_MATCH_URL, url1);
};

var doURLsDifferExactTest = function(url1, url2)
{
    doDoesntAppearTest(url1, storage.URL_MATCH_URL, url2);
    doDoesntAppearTest(url2, storage.URL_MATCH_URL, url1);
};

var doDoesAppearTest = function(noteURL, noteMatchType, pageURL)
{
    var note = new storage.InternoteNote();
    note.url       = noteURL;
    note.matchType = noteMatchType;
    controller.assert(function() { return storage.matchesURL(note, pageURL); });
};

var doDoesntAppearTest = function(noteURL, noteMatchType, pageURL)
{
    var note = new storage.InternoteNote();
    note.url       = noteURL;
    note.matchType = noteMatchType;
    controller.assert(function() { return !storage.matchesURL(note, pageURL); });
};
