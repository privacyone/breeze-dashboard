/*
* Listens for HTTP request responses, sending first- and
* third-party requests to storage.
*/
var table = [];
const capture = {
  privacyStatus: true,

  async init() {
    this.addListeners();
    await this.getPrivacyStatus();
  },

  addListeners() {
    // listen for each HTTP response
    this.queue = [];
    chrome.webRequest.onResponseStarted.addListener((response) => {
      const eventDetails = {
        type: 'sendThirdParty',
        data: response
      };
      this.queue.push(eventDetails);
      this.processNextEvent();
    },
      {urls: ['<all_urls>']});
    // listen for tab updates
	
	
    chrome.tabs.onUpdated.addListener(
      (tabId, changeInfo, tab) => {
        const eventDetails = {
          type: 'sendFirstParty',
          data: {
            tabId,
            changeInfo,
            tab
          }
        };
        chrome.tabs.get(tabId, function(tab) {table[tabId] = tab;
         ;});
        this.queue.push(eventDetails);
        this.processNextEvent();
      });
  },

  getPrivacyStatus() {
    return new Promise((resolve, reject) => {
      var that = this;
      chrome.storage.local.get(["privacy_status"], function(result) {
        that.privacyStatus = result["privacy_status"] == null ? true : result["privacy_status"]; 
        resolve();
      });
    });
  },
  // Process each HTTP request or tab page load in order,
  // so that async reads/writes to IndexedDB
  // (via sendFirstParty and sendThirdParty) won't miss data
  // The 'ignore' boolean ensures processNextEvent is only
  // executed when the previous call to processNextEvent
  // has completed.
  async processNextEvent(ignore = false) {
    if (this.processingQueue && !ignore) {
      return;
    }
    if (this.queue.length >= 1) {
      try {
        const nextEvent = this.queue.shift();
        this.processingQueue = true;
        switch (nextEvent.type) {
          case 'sendFirstParty':
            await this.sendFirstParty(
              nextEvent.data.tabId,
              nextEvent.data.changeInfo,
              nextEvent.data.tab
            );
            break;
          case 'sendThirdParty':
            await this.sendThirdParty(nextEvent.data);
            break;
          default:
            throw new Error(
              'An event must be of type sendFirstParty or sendThirdParty.'
            );
        }
      } catch (e) {
      }
      this.processNextEvent(true);
    } else {
      this.processingQueue = false;
    }
  },

  isVisibleTab(tabId) {
    return tabId !== chrome.tabs.TAB_ID_NONE;
  },

  async getTab(tabId) {
    let tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch (e) {
      // Lets ignore tabs we can't get hold of (likely have closed)
      return;
    }
    return tab;
  },

  // capture third party requests
  async sendThirdParty(response) {
    if (!response.tabId) {
      // originUrl is undefined for the first request from the chrome to the
      // first party site
      return;
    }
    // @todo figure out why Web Extensions sometimes gives
    // undefined for response.originUrl
    //const originUrl = response.originUrl ? new URL(response.originUrl) : '';
    //const targetUrl = new URL(response.url);

    const originUrl = table[response.tabId].url ? new URL(table[response.tabId].url) : '';
    if(originUrl.href.includes('http://') || originUrl.href.includes('https://')){
      const targetUrl = new URL(response.url);
      let firstPartyUrl;
      if (this.isVisibleTab(response.tabId)) {
        //const tab = await this.getTab(response.tabId);
        const tab = table[response.tabId];
        if (!tab) {
          return;
        }
        firstPartyUrl = new URL(tab.url);
      } else {
        //firstPartyUrl = new URL(response.originUrl);
        firstPartyUrl = new URL(table[response.tabId].url);
      }

      if (firstPartyUrl.hostname
        && targetUrl.hostname !== firstPartyUrl.hostname) {
        const data = {
          target: targetUrl.hostname,
          origin: originUrl.hostname,
          requestTime: response.timeStamp,
          firstParty: false,
          privacyStatus: this.privacyStatus
        };
        await store.setThirdParty(
          firstPartyUrl.hostname,
          targetUrl.hostname,
          data
        );
      }
    }
  },

  // capture first party requests
  async sendFirstParty(tabId, changeInfo, tab) {
    const documentUrl = new URL(tab.url);
    let kita = documentUrl.href;
    if((kita).includes('https://') || (kita).includes('http://')){
      if (documentUrl.hostname
          && (tab.status === 'complete' || tab.status === 'loading')) {
        const data = {
          favIconUrl: tab.favIconUrl,
          firstParty: true,
          requestTime: Date.now(),
          privacyStatus: this.privacyStatus
        };
        await store.setFirstParty(documentUrl.hostname, data);
      }
    }
  }
  
};

capture.init();

chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
  if (request.what == "privacy_status") {
    capture.privacyStatus = request.status;
    chrome.storage.local.set({"privacy_status": request.status});
  }
})
