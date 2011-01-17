Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var callbackCounts = [];

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
}

var setupTest = function(test) {
  controller.click(new elementslib.Elem(controller.menus.File['menu_newNavigatorTab']));
  
  storage        = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.storage;
  StorageWatcher = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.StorageWatcher;
  utils          = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
  
  controller.assertJS("subject != null", storage);
  
  makeEmpty();
  resetCounts();
}

var teardownTest = function(test) {  
  controller.click(new elementslib.Elem(controller.menus.File['menu_close']));
}

var makeEmpty = function() {
  for (var i = 0; i < storage.allNotes.length ; i++) {
    if (storage.allNotes[i] != null) {
      storage.removeNote(storage.allNotes[i]);
    }
  }
}

var createCallback = function(id) {
  return function() {
    if (callbackCounts[id] == null)
    {
      callbackCounts[id] = 1;
    }
    else
    {
      callbackCounts[id]++;
    }
  };
}

var resetCounts = function() {
  callbackCounts = [];
}

var assertCounts = function(expectedAddCount, expectedRemoveCount, expectedEditCount)
{
  var actualAddCount    = (callbackCounts["added"  ] == null) ? 0 : callbackCounts["added"];
  var actualRemoveCount = (callbackCounts["removed"] == null) ? 0 : callbackCounts["removed"];
  var actualEditCount   = (callbackCounts["edited" ] == null) ? 0 : callbackCounts["edited"];
  
  controller.assert(function() { return actualAddCount    == expectedAddCount;    });
  controller.assert(function() { return actualRemoveCount == expectedRemoveCount; });
  controller.assert(function() { return actualEditCount   == expectedEditCount;   });
}

var testWatcherEmpty = function() {
  var filterFn = function(note) {
    return note.text.length < 3;
  };
  
  var watcher = new StorageWatcher(storage, filterFn, ["noteEdited", "noteMoved"], []);
  
  watcher.addEventListener("noteAdded",   createCallback("added"  ));
  watcher.addEventListener("noteRemoved", createCallback("removed"));
  watcher.addEventListener("noteEdited",  createCallback("edited" ));
  
  // Add to underlying set -> add to subset
  var note1 = storage.addSimpleNote("http://www.google.com/", "", [0, 0], [150, 150]);
  assertCounts(1, 0, 0);
  resetCounts();
  
  // Add to underlying set -> no effect
  var note2 = storage.addSimpleNote("http://www.google.com/", "Hello", [0, 0], [150, 150]);
  assertCounts(0, 0, 0);
  resetCounts();
  
  // Remove from underlying set -> remove from subset
  storage.removeNote(note1);
  assertCounts(0, 1, 0);
  resetCounts();
  
  // Edit while not in set -> no effect
  storage.setPosition(note2, [10, 10]);
  assertCounts(0, 0, 0);
  resetCounts();
  
  // Edit -> add to subset
  storage.setText(note2, "");
  assertCounts(1, 0, 0);
  resetCounts();
  
  // Edit while in set -> no effect
  storage.setPosition(note2, [20, 20]);
  assertCounts(0, 0, 0);
  resetCounts();
  
  // Edit while in set -> edit
  storage.setText(note2, "H");
  assertCounts(0, 0, 1);
  resetCounts();  
  
  // Edit -> remove from subset
  storage.setText(note2, "Text");
  assertCounts(0, 1, 0);
  resetCounts();
  
  // Remove from underlying set -> no effect
  storage.removeNote(note2);  
  assertCounts(0, 0, 0);
  resetCounts();
}
    