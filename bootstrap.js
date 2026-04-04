var chromeHandle;

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await Zotero.initializationPromise;
  Zotero.debug("HighlightDescriptions: startup called, rootURI=" + rootURI);

  try {
    var aomStartup = Components.classes[
      "@mozilla.org/addons/addon-manager-startup;1"
    ].getService(Components.interfaces.amIAddonManagerStartup);
    var manifestURI = Services.io.newURI(rootURI + "manifest.json");
    chromeHandle = aomStartup.registerChrome(manifestURI, [
      ["content", "highlightdescriptions", rootURI + "chrome/content/"],
    ]);
    Zotero.debug("HighlightDescriptions: chrome registered");
  } catch (e) {
    Zotero.logError(e);
  }

  try {
    Zotero.PreferencePanes.register({
      pluginID: "highlightdescriptions@paulmrg2",
      src: rootURI + "chrome/content/preferences.xhtml",
      label: "Highlight Descriptions",
    });
    Zotero.debug("HighlightDescriptions: preferences pane registered");
  } catch (e) {
    Zotero.logError(e);
  }

  try {
    Services.scriptloader.loadSubScript(rootURI + "chrome/content/index.js");
    HighlightDescriptions.start();
    Zotero.debug("HighlightDescriptions: started");
  } catch (e) {
    Zotero.logError(e);
  }
}

function shutdown(data, reason) {
  if (typeof HighlightDescriptions !== "undefined") {
    HighlightDescriptions.stop();
  }
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

function uninstall(data, reason) {
  const prefBranch = "extensions.highlightdescriptions.";
  try {
    Services.prefs.getBranch(prefBranch).deleteBranch("");
  } catch (e) {}
}
