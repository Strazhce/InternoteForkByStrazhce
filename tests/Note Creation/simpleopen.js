Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var setupModule = function(module) {  
  module.controller = mozmill.getBrowserController();
}

var setupTest = function(test) {
  controller.click(new elementslib.Elem(controller.menus.File['menu_newNavigatorTab']));
  storage = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.storage;
  controller.assertJS("subject != null", storage);
}

var teardownTest = function(test) {  
  controller.click(new elementslib.Elem(controller.menus.File['menu_close']));
}

var getStorageXML = function() {
  // Should use a public method.
  var serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].createInstance(Components.interfaces.nsIDOMSerializer);
  return serializer.serializeToString(storage.doc);
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

var testCreateOnAboutBlank = function () {
  makeEmpty();

  controller.open('about:blank');
  controller.waitForPageLoad();
  
  xmlBefore = getStorageXML();
  makeNote();
  xmlAfter = getStorageXML();
  
  controller.assert(function() {
    return xmlBefore == xmlAfter;
  });
  controller.assertNode(new elementslib.ID(controller.window.document, 'internote-balloon-popup'));
}

var testCreateOnGoogle = function() {
  makeEmpty();

  controller.open('www.google.com');
  controller.waitForPageLoad();
  
  makeNote();
  
  controller.assertJS("subject == 1", getNoteCount());
  
  var note = getFirstNote();
  var currTime = new Date().getTime();
  
  controller.assertJS("subject.text == ''", note);
  controller.assertJS("!subject.isMinimized", note);
  controller.assertJS("!subject.isHTML", note);
  
  controller.assert(function() {
    return currTime - 500 < note.createTime && note.createTime < currTime;
  });
  
  controller.assert(function() {
    return note.createTime == note.modfnTime;
  });
  
  // possibly should check size and colors against prefs
}
    