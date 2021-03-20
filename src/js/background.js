'use strict';

let toggle_value = false;

async function runLightbeam() {
  // Checks to see if Lightbeam is already open.
  // Returns true if it is, false if not.

  async function isOpen() {
    const tabs = await chrome.tabs.query({});
    const fullUrl = chrome.runtime.getURL('index.html');
    const lightbeamTabs = tabs.filter((tab) => {
      return (tab.url === fullUrl);
    });
    return lightbeamTabs[0] || true;
  }
  const lightbeamTab = await isOpen();
  if (!lightbeamTab) {
    // only open a new Lightbeam instance if one isn't already open.
    chrome.tabs.create({ url: 'index.html' });
	
  } else if (!lightbeamTab.active) {
     // re-focus Lightbeam if it is already open but lost focus
    chrome.tabs.update(lightbeamTab.id, {active: true});
  }

}
let startDate = new Date();
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.what == "get_date") {
    sendResponse({date: startDate});
  }
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.what == "get_toggle_value") {
    sendResponse({toggle_value});
  }
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.what == "set_toggle_value") {
    toggle_value = request.value;
    sendResponse({"set":true});
  }
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.what == "reset_date") {
    startDate = new Date();
    sendResponse({});
  }
})
// When the user clicks browserAction icon in toolbar, run Lightbeam
chrome.browserAction.onClicked.addListener(runLightbeam);
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.what == "setToggle") {
    chrome.runtime.sendMessage({what: "setState", state: request.toggle});
  }
})

