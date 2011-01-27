Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var setupModule = function(module)
{  
  module.controller = mozmill.getBrowserController();
};

var setupTest = function(test)
{
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
    doURLsMatchTest("http://www.example.com", "http://www.example.com/");
    doURLsMatchTest("http://www.example.com/", "http://www.example.com:80/");
    doURLsMatchTest("http://www.example.com:90/", "http://www.example.com:90");
    
    // Extra canonicalization
    doURLsMatchTest("http://www.example.com/dir1", "http://www.example.com/dir1/");
    doURLsMatchTest("http://www.example.com/dir1/", "http://www.example.com/dir1/index.html");
    doURLsMatchTest("http://www.example.com/dir1/", "http://www.example.com/dir1/index.htm");
    doURLsMatchTest("http://www.example.com/dir1/", "http://www.example.com/dir1/index.php");
    
    doURLsDifferTest("ftp://www.example.com/", "http://www.example.com/");
    doURLsDifferTest("http://www.example.com:90/", "http://www.example.com/");
    doURLsDifferTest("http://aa@www.example.com/", "http://www.example.com/");
    doURLsDifferTest("http://aa:bb@www.example.com/", "http://www.example.com/");
    doURLsDifferTest("http://aa:bb@www.example.com/", "http://aa@www.example.com/");
    doURLsDifferTest("http://aa:bb@www.example.com/", "http://www.example.com/");
    doURLsDifferTest("http://www.example.com/dir1", "http://www.example.com/dir2");
    doURLsDifferTest("http://www.example.com/dir1/a", "http://www.example.com/dir1/");
    doURLsDifferTest("http://www.example.com/dir1/a?a=b", "http://www.example.com/dir1/");
    doURLsDifferTest("http://www.example.com/dir1/a#anchor", "http://www.example.com/dir1/");
};

var testMatchesURLPrefix = function()
{
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://www.example.com/dir1/a?a=b");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://www.example.com/dir1/a");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://www.example.com/dir1/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://www.example.com/dir1");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://www.example.com/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://www.example.com");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b#anchor", "http://");
    doURLsDifferPrefixTest("http://www.example.com/dir1/a?a=b#anchor", "");
    
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b", "http://www.example.com/dir1/a");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b", "http://www.example.com/dir1/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b", "http://www.example.com/dir1");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b", "http://www.example.com/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b", "http://www.example.com");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a?a=b", "http://");
    doURLsDifferPrefixTest("http://www.example.com/dir1/a?a=b", "");
    
    doURLsDifferPrefixTest("http://www.example.com/dir1/a", "http://www.example.com/dir1/a?a=b");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a", "http://www.example.com/dir1/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a", "http://www.example.com/dir1");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a", "http://www.example.com/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a", "http://www.example.com");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/a", "http://");
    doURLsDifferPrefixTest("http://www.example.com/dir1/a", "");
    
    doURLsDifferPrefixTest("http://www.example.com/dir1/", "http://www.example.com/dir1/a?a=b");
    doURLsDifferPrefixTest("http://www.example.com/dir1/", "http://www.example.com/dir1/a");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/", "http://www.example.com/dir1");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/", "http://www.example.com/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/", "http://www.example.com");
    doURLsMatchPrefixTest ("http://www.example.com/dir1/", "http://");
    doURLsDifferPrefixTest("http://www.example.com/dir1/", "");
    
    doURLsDifferPrefixTest("http://www.example.com/dir1", "http://www.example.com/dir1/a?a=b");
    doURLsDifferPrefixTest("http://www.example.com/dir1", "http://www.example.com/dir1/a");
    doURLsDifferPrefixTest("http://www.example.com/dir1", "http://www.example.com/dir1/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1", "http://www.example.com/");
    doURLsMatchPrefixTest ("http://www.example.com/dir1", "http://www.example.com");
    doURLsMatchPrefixTest ("http://www.example.com/dir1", "http://");
    doURLsDifferPrefixTest("http://www.example.com/dir1", "");
    
    doURLsDifferPrefixTest("http://www.example.com/", "http://www.example.com/dir1/a?a=b");
    doURLsDifferPrefixTest("http://www.example.com/", "http://www.example.com/dir1/a");
    doURLsDifferPrefixTest("http://www.example.com/", "http://www.example.com/dir1/");
    doURLsDifferPrefixTest("http://www.example.com/", "http://www.example.com/dir1");
    doURLsMatchPrefixTest ("http://www.example.com/", "http://www.example.com");
    doURLsMatchPrefixTest ("http://www.example.com/", "http://");
    doURLsDifferPrefixTest("http://www.example.com/", "");
    
    doURLsDifferPrefixTest("http://www.example.com", "http://www.example.com/dir1/a?a=b");
    doURLsDifferPrefixTest("http://www.example.com", "http://www.example.com/dir1/a");
    doURLsDifferPrefixTest("http://www.example.com", "http://www.example.com/dir1/");
    doURLsDifferPrefixTest("http://www.example.com", "http://www.example.com/dir1");
    doURLsMatchPrefixTest ("http://www.example.com", "http://www.example.com/");
    doURLsMatchPrefixTest ("http://www.example.com", "http://");
    doURLsDifferPrefixTest("http://www.example.com", "");
};

var testMatchesIgnores = function()
{
    doURLsMatchTest ("http://www.example.com/?a=b",     "http://www.example.com/?a=b"    );
    doURLsMatchTest ("http://www.example.com/?a=b&c=d", "http://www.example.com/?c=d&a=b");
    
    doURLsMatchTest ("http://www.example.com/?a=b", "http://www.example.com/", false, true );
    doURLsMatchTest ("http://www.example.com/?a=b", "http://www.example.com/", true,  true );
    doURLsDifferTest("http://www.example.com/?a=b", "http://www.example.com/", false, false);
    doURLsDifferTest("http://www.example.com/?a=b", "http://www.example.com/", true,  false);
    
    doURLsMatchTest ("http://www.example.com/?a=b", "http://www.example.com/?c=d", false, true );
    doURLsMatchTest ("http://www.example.com/?a=b", "http://www.example.com/?c=d", true,  true );
    doURLsDifferTest("http://www.example.com/?a=b", "http://www.example.com/?c=d", false, false);
    doURLsDifferTest("http://www.example.com/?a=b", "http://www.example.com/?c=d", true,  false);
    
    doURLsMatchTest ("http://www.example.com/?a=b", "http://www.example.com/?b=a", false, true );
    doURLsMatchTest ("http://www.example.com/?a=b", "http://www.example.com/?b=a", true,  true );
    doURLsDifferTest("http://www.example.com/?a=b", "http://www.example.com/?b=a", false, false);
    doURLsDifferTest("http://www.example.com/?a=b", "http://www.example.com/?b=a", true,  false);
    
    doURLsMatchTest ("http://www.example.com/?a=b&c=d", "http://www.example.com/?c=d", false, true );
    doURLsMatchTest ("http://www.example.com/?a=b&c=d", "http://www.example.com/?c=d", true,  true );
    doURLsDifferTest("http://www.example.com/?a=b&c=d", "http://www.example.com/?c=d", false, false);
    doURLsDifferTest("http://www.example.com/?a=b&c=d", "http://www.example.com/?c=d", true,  false);
    
    doURLsMatchTest ("http://www.example.com/?a=b&c=d", "http://www.example.com/", false, true );
    doURLsMatchTest ("http://www.example.com/?a=b&c=d", "http://www.example.com/", true,  true );
    doURLsDifferTest("http://www.example.com/?a=b&c=d", "http://www.example.com/", false, false);
    doURLsDifferTest("http://www.example.com/?a=b&c=d", "http://www.example.com/", true,  false);
    
    doURLsMatchTest ("http://www.example.com/#anchor", "http://www.example.com/#anchor");
    
    doURLsMatchTest ("http://www.example.com/#anchor", "http://www.example.com/", true, false);
    doURLsMatchTest ("http://www.example.com/#anchor", "http://www.example.com/", true, true );
    doURLsDifferTest("http://www.example.com/#anchor", "http://www.example.com/", false, false);
    doURLsDifferTest("http://www.example.com/#anchor", "http://www.example.com/", false, true );
    
    doURLsMatchTest ("http://www.example.com/#anchor", "http://www.example.com/#banker", true, false);
    doURLsMatchTest ("http://www.example.com/#anchor", "http://www.example.com/#banker", true, true );
    doURLsDifferTest("http://www.example.com/#anchor", "http://www.example.com/#banker", false, false);
    doURLsDifferTest("http://www.example.com/#anchor", "http://www.example.com/#banker", false, true );
    
    doURLsMatchTest ("http://www.example.com/?a=b#anchor", "http://www.example.com/?a=b#anchor");
    
    doURLsMatchTest ("http://www.example.com/?a=b#anchor", "http://www.example.com/?a=b",    true,  false);
    doURLsMatchTest ("http://www.example.com/?a=b#anchor", "http://www.example.com/?a=b",    true,  true );
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/?a=b",    false, false);
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/?a=b",    false, true );
    
    doURLsMatchTest ("http://www.example.com/?a=b#anchor", "http://www.example.com/#anchor", false, true );
    doURLsMatchTest ("http://www.example.com/?a=b#anchor", "http://www.example.com/#anchor", true,  true );
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/#anchor", false, false);
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/#anchor", true,  false);
    
    doURLsMatchTest ("http://www.example.com/?a=b#anchor", "http://www.example.com/",        true,  true );
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/",        true,  false);
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/",        false, true );
    doURLsDifferTest("http://www.example.com/?a=b#anchor", "http://www.example.com/",        false, false);
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
        "http://www.example.com/dir1?a=b",
        "http://www.example.com/dir1#anchor",
        "http://www.example.com/dir1?a=b#anchor",
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
        "xample.com",
        "e.com",
        ".om",
        ".www.example.com",
    ];
    
    var suffixesArray =
    [
        ".example.com",
        "example.com",
        ".com",
        "com",
    ];
    
    for (var i = 0; i < siteTestURLArray.length; i++)
    {
        doURLSiteSameTest(siteTestURLArray[i], "www.example.com");
        
        for (var j = 0; j < invalidArray.length; j++)
        {
            doURLSiteDiffTest (siteTestURLArray[i], invalidArray[j]);
            doURLNotSuffixTest(siteTestURLArray[i], invalidArray[j])
        }
        
        for (var j = 0; j < suffixesArray.length; j++)
        {
            doURLSiteDiffTest(siteTestURLArray[i], suffixesArray[j]);
            doURLSuffixTest  (siteTestURLArray[i], suffixesArray[j])
        }
    }
};

var testAll = function()
{
    for (var i = 0; i < urlsArray.length; i++)
    {
        var pageURL = urlsArray[i];
        doDoesAppearTest("", storage.URL_MATCH_ALL, pageURL);
        for (var j = 0; j < urlsArray.length; j++)
        {
            var ignoredNoteURL = urlsArray[j];
            doDoesAppearTest(ignoredNoteURL, storage.URL_MATCH_ALL, pageURL);
        }
    }
};

var doURLsMatchPrefixTest = function(url, prefix)
{
    doDoesAppearTest(prefix, storage.URL_MATCH_PREFIX, url);
};

var doURLsDifferPrefixTest = function(url, prefix)
{
    doDoesntAppearTest(prefix, storage.URL_MATCH_PREFIX, url);
};

var doURLSiteSameTest = function(url, site)
{
    doDoesAppearTest(site, storage.URL_MATCH_SITE, url);
};

var doURLSuffixTest = function(url, site)
{
    doDoesAppearTest(site, storage.URL_MATCH_SUFFIX, url);
};

var doURLNotSuffixTest = function(url, site)
{
    doDoesntAppearTest(site, storage.URL_MATCH_SUFFIX, url);
};

var doURLSiteDiffTest = function(url, site)
{
    doDoesntAppearTest(site, storage.URL_MATCH_SITE, url);
};

var doURLExactTest = function(url)
{
    doDoesAppearTest(url, storage.URL_MATCH_URL, url, false, false);
    doDoesAppearTest(url, storage.URL_MATCH_URL, url, true,  false);
    doDoesAppearTest(url, storage.URL_MATCH_URL, url, false, true );
    doDoesAppearTest(url, storage.URL_MATCH_URL, url, true,  true );
    
    doDoesAppearTest(url, storage.URL_MATCH_PREFIX, url);
};

var doURLsMatchTest = function(url1, url2, ignoreAnchor, ignoreParams)
{
    doDoesAppearTest(url1, storage.URL_MATCH_URL, url2, ignoreAnchor, ignoreParams);
    doDoesAppearTest(url2, storage.URL_MATCH_URL, url1, ignoreAnchor, ignoreParams);
};

var doURLsDifferTest = function(url1, url2, ignoreAnchor, ignoreParams)
{
    doDoesntAppearTest(url1, storage.URL_MATCH_URL, url2, ignoreAnchor, ignoreParams);
    doDoesntAppearTest(url2, storage.URL_MATCH_URL, url1, ignoreAnchor, ignoreParams);
};

var doDoesAppearTest = function(noteURL, noteMatchType, pageURL, ignoreAnchor, ignoreParams)
{
    var note = new storage.InternoteNote();
    note.url       = noteURL;
    note.matchType = noteMatchType;
    note.ignoreAnchor = (ignoreAnchor == null) ? false : ignoreAnchor;
    note.ignoreParams = (ignoreParams == null) ? false : ignoreParams;
    controller.assert(function() { return storage.matchesURL(note, pageURL); });
};

var doDoesntAppearTest = function(noteURL, noteMatchType, pageURL, ignoreAnchor, ignoreParams)
{
    var note = new storage.InternoteNote();
    note.url       = noteURL;
    note.matchType = noteMatchType;
    note.ignoreAnchor = (ignoreAnchor == null) ? false : ignoreAnchor;
    note.ignoreParams = (ignoreParams == null) ? false : ignoreParams;
    controller.assert(function() { return !storage.matchesURL(note, pageURL); });
};
