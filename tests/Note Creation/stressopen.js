Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
}

var setupTest = function(test) {
  controller.click(new elementslib.Elem(controller.menus.File['menu_newNavigatorTab']));
  storage = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.storage;
  utils =   internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
  controller.assertJS("subject != null", storage);
}

var teardownTest = function(test) {  
  controller.click(new elementslib.Elem(controller.menus.File['menu_close']));
}

var getNoteCount = function() {
  var count = 0;
  for (var i = 0; i < storage.allNotes.length; i++) {
    if (storage.allNotes[i] != null) {
      count++;
    }
  }
  return count;
}

var getFirstNote = function() {
  for (var i = 0; i < storage.allNotes.length; i++) {
    if (storage.allNotes[i] != null) {
      return storage.allNotes[i];
    }
  }
  return null;
}

var makeEmpty = function() {
  for (var i = 0; i < storage.allNotes.length ; i++) {
    if (storage.allNotes[i] != null) {
      storage.removeNote(storage.allNotes[i]);
    }
  }
  controller.assert(function() {
    return getNoteCount() == 0;
  });
}

var makeNote = function() {
  controller.keypress(new elementslib.ID(controller.window.document, "nav-bar"), 'I', {altKey: true});
}

var testStressCreateOnGoogle = function() {
  makeEmpty();

  controller.open('www.google.com');
  controller.waitForPageLoad();
  
  for (var i = 0; i < 3; i++)
  {
  
    makeNote();
    
    var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].
     getService(Components.interfaces.nsIConsoleService);

    aConsoleService.logStringMessage(utils.compactDumpString(this.storage.allNotes));

    controller.assertJS("subject == 1", getNoteCount());
    
    var note = getFirstNote();
    
    storage.removeNote(note);
    
    controller.assertJS("subject == 0", getNoteCount());
  }
}
    