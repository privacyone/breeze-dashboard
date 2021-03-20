const lightbeam = {
  websites: {},
  dataGatheredSince: null,
  numFirstParties: 0,
  numThirdParties: 0,
  valueSlider: 10,
  sessionTime: null,
  sessionOnly: null,

  async init() {
    this.sessionOnly = document.getElementById('toggle-button');
    this.redTriangleToggle = document.getElementById('red-triangle-toggle');
    this.redTriangleToggle.onclick = this.setTriangleToggleValue;
    this.websites = await store.getAll();
    await this.setSessionTime();
    await this.getTriangleToggleValue();
    this.renderGraph();
    this.addListeners();
    this.updateVars();
  },

  setSessionTime() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({what: "get_date"}, response => {
            if(response.date) {
                this.sessionTime = new Date(response.date);
                resolve();
            } else {
                reject();
            }
        });
    });
  },

  getTriangleToggleValue() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["triangle_toggle"], function(result){
          lightbeam.redTriangleToggle.checked = result["triangle_toggle"] == null ? false : result["triangle_toggle"];
          viz.redTriangleToggle = lightbeam.redTriangleToggle.checked;
          resolve();
        })
    });
  },

  setTriangleToggleValue() {
    var toggle = document.getElementById('red-triangle-toggle');
    return new Promise((resolve, reject) => {
        //console.log(this.redTriangleToggle);
        chrome.storage.local.set({"triangle_toggle":toggle.checked})
        resolve();
    });
  },

  renderGraph() {
    const transformedData = this.transformData();
    viz.init(transformedData.nodes, transformedData.links);
  },

  refreshGraph() {
    const transformedData = this.transformData();
    viz.draw(transformedData.nodes, transformedData.links);
  },

  addListeners() {
    this.resetData();
    storeChild.onUpdate((data) => {
      this.redraw(data);
    });
    this.sessionOnly.addEventListener('click', function(){
      lightbeam.refreshGraph();
      viz.resize();
    });
    this.redTriangleToggle.addEventListener('click', function(){
      viz.redTriangleToggle = this.checked;
      lightbeam.refreshGraph();
    });
  },

  // Called from init() (isFirstParty = undefined)
  // and redraw() (isFirstParty = true or false).
  async updateVars(isFirstParty) {

    // initialize dynamic vars from storage
    if (!this.dataGatheredSince) {
      const { dateStr, fullDateTime } = await this.getDataGatheredSince();
      if (!dateStr) {
        return;
      }
      this.dataGatheredSince = dateStr;
      const dataGatheredSinceElement
        = document.getElementById('data-gathered-since');
      dataGatheredSinceElement.textContent = this.dataGatheredSince || '';
      dataGatheredSinceElement.setAttribute('datetime', fullDateTime || '');
    }
    if (isFirstParty === undefined) {
      this.numFirstParties = await this.getNumFirstParties();
      this.setPartyVar('firstParty');
      this.numThirdParties = await this.getNumThirdParties();
      this.setPartyVar('thirdParty');
      return;
    }

    // update on redraw
    if (isFirstParty) {
      this.numFirstParties++;
      this.setPartyVar('firstParty');
    } else {
      this.numThirdParties++;
      this.setPartyVar('thirdParty');
    }
  },

  // Updates dynamic variable values in the page
  setPartyVar(party) {
    const numFirstPartiesElement = document.getElementById('num-first-parties');
    const numThirdPartiesElement = document.getElementById('num-third-parties');
    if (party === 'firstParty') {
      if (this.numFirstParties === 0) {
        numFirstPartiesElement.textContent = '';
      } else {
        numFirstPartiesElement.textContent = `${this.numFirstParties} Sites`;
      }
    } else if (this.numThirdParties === 0) {
      numThirdPartiesElement.textContent = '';
    } else {
      const str = `${this.numThirdParties} Third Party Sites`;
      numThirdPartiesElement.textContent = str;
    }
  },

  async getDataGatheredSince() {
    const firstRequestUnixTime = await storeChild.getFirstRequestTime();
    if (!firstRequestUnixTime) {
      return {};
    }
    // reformat unix time
    let fullDateTime = new Date(firstRequestUnixTime);
    let dateStr = fullDateTime.toDateString();
    // remove day of the week
    const dateArr = dateStr.split(' ');
    dateArr.shift();
    dateStr = dateArr.join(' ');
    // ISO string used for datetime attribute on <time>
    fullDateTime = fullDateTime.toISOString();
    return {
      dateStr,
      fullDateTime
    };
  },

  async getNumFirstParties() {
    return await storeChild.getNumFirstParties();
  },

  async getNumThirdParties() {
    return await storeChild.getNumThirdParties();
  },

  transformData() {
    const nodes = [];  

    this.valueSlider = document.getElementById("myRange").value;
    localStorage.setItem("sld",  this.valueSlider);  

    let siteList = Object.entries(this.websites);
    siteList.sort(function(a, b) {
        let x = new Date(a[1].LastRequestTime);
        let y = new Date(b[1].LastRequestTime);
        if(isNaN(x)) {x = new Date(a[1].FirstRequestTime);}
        if(isNaN(y)) {y = new Date(b[1].FirstRequestTime);}
        if (x > y) {return -1;}
        if (x < y) {return 1;}
        return 0;
      });  

    let objectWebsites = Object.fromEntries(siteList);
    const nodesHTTPS = [];
    const allSites = [];
    let i = 0;
    let links = [];
    for (const website in objectWebsites) {
      const site = objectWebsites[website];
      if (site.thirdParties.length != 0 || site.firstParty) {
        if((this.valueSlider != 16) && (i >= this.valueSlider)) {
          break;
        }
        if (this.sessionOnly.checked && (new Date(site.LastRequestTime && site.LastRequestTime != "Invalid Date" ? site.LastRequestTime : site.FirstRequestTime) < this.sessionTime)) {
          continue;
        }
        nodes.push(objectWebsites[website]);
        nodesHTTPS.push(objectWebsites[website].hostname);
        allSites.push(objectWebsites[website].hostname);
        i++;
      }
    }

    for (const website in objectWebsites) {
      const site = objectWebsites[website];
      if (this.sessionOnly.checked && (new Date(site.LastRequestTime && site.LastRequestTime != "Invalid Date" ? site.LastRequestTime : site.FirstRequestTime) < this.sessionTime)) {
        continue;
      }
      if (!(site.thirdParties.length != 0 || site.firstParty)) {
        for(const i in site.firstPartyHostnames) {
          let firstPartyHostname = site.firstPartyHostnames[i].firstPartyHostname;
          if(nodesHTTPS.includes(firstPartyHostname)) {
              nodes.some(firstParty => {
                  if (firstParty.hostname == firstPartyHostname)
                    if (!firstParty.thirdParties.some(thirdParty => thirdParty.thirdPartyHostname == site.hostname)) {
                      firstParty.thirdParties.push({privacyStatus: site.privacyStatus,
                                                    thirdPartyHostname: site.hostname});
                    }
              });
            objectWebsites[website].dangerous = totalDomainsBlockedArray.some(domain => domain.url == site.hostname);
            nodes.push(objectWebsites[website]);
            allSites.push(objectWebsites[website].hostname);
            break;
          }
        }
      }
    }

    for( let node in nodes) {
      let firstPartyNode = nodes[node];
      let thirdPartyLinks = [];
      for(let i in firstPartyNode.thirdParties) {
        let thirdParty = this.websites[firstPartyNode.thirdParties[i].thirdPartyHostname];
        if( thirdParty == null || thirdParty.firstParty) {
          continue;
        }
        if(allSites.includes(thirdParty.hostname)) {
          thirdPartyLinks.push({source: firstPartyNode.hostname,
                                target: thirdParty.hostname,
                                privacyStatus: thirdParty.firstPartyHostnames.find(a => a.firstPartyHostname == firstPartyNode.hostname).privacyStatus,
                                dangerous: thirdParty.dangerous && !firstPartyNode.thirdParties[i].privacyStatus
                              })
        }
      }
      links = links.concat(thirdPartyLinks);
    }
    return {
      nodes,
      links
    };
  },
  
  resetData() {
    const resetAll = document.getElementById('reset-all-button');
    const resetSession = document.getElementById('reset-session-button');

    resetAll.addEventListener('click', async () => {
      const data = await store.getAll();
      chrome.runtime.sendMessage({what: "reset_all_data"});
      await storeChild.reset();
      window.location.reload();
    });
    resetSession.addEventListener('click', async () => {
      chrome.runtime.sendMessage({what: "reset_session_data"});
      chrome.runtime.sendMessage({what: "reset_date"}, response => {
        window.location.reload();
      });
    });
  },

redraw(data) {
    if (this.websites[data.hostname]) {
        var that = this;
        Object.keys(data).forEach(function(key) {
            that.websites[data.hostname][key] = data[key];
        });
        //this.websites[data.hostname] = data;
    } else {
        this.websites[data.hostname] = data;
    }
    if (!(data.hostname in this.websites)) {
        this.updateVars(data.firstParty);
    }
    if (data.firstPartyHostnames) {
        // if we have the first parties make the link if they don't exist
        data.firstPartyHostnames.forEach((i) => {
          firstPartyHostname = i.firstPartyHostname;
            if (this.websites[firstPartyHostname]) {
                const firstPartyWebsite = this.websites[firstPartyHostname];
                if (!('thirdParties' in firstPartyWebsite)) {
                    firstPartyWebsite.thirdParties = [];
                    firstPartyWebsite.firstParty = true;
                }
                if (!(firstPartyWebsite.thirdParties.some(thirdParty => {
                        if (thirdParty.thirdPartyHostname == data.hostname) {
                            thirdParty.privacyStatus = i.privacyStatus;
                            return true;
                        } else {
                            return false
                        }
                    }))) {
                  firstPartyWebsite.thirdParties.push({
                      thirdPartyHostname: data.hostname,
                      privacyStatus: data.privacyStatus
                  });
                }
            }
        });
    }
    const transformedData = this.transformData(this.websites);
    viz.draw(transformedData.nodes, transformedData.links);
},
};
window.onload = () => {
    loadTotalDomainArray();
    viz.redTriangleToggle = false; //potreban je toggle na stranici za ovo (true - ima crvenih trouglova)
    lightbeam.init();
    barChart.init();
    let slider = document.getElementById("myRange");
    if(localStorage.getItem("sld") !== null && localStorage.getItem("sld") < 16) {
      slider.value = localStorage.getItem("sld");
    }
    else {
      slider.value = 10;
    }
    document.getElementById("slider-value").innerHTML = (slider.value < 16) ? slider.value : "All";
    slider.oninput = function() {
      document.getElementById("slider-value").innerHTML = (slider.value < 16) ? slider.value : "All";
      lightbeam.refreshGraph();
    }
  };

function loadTotalDomainArray(){
  chrome.storage.local.get(["total_domain_array"], function(result){
    totalDomainsBlockedArray = !result["total_domain_array"] ? [] : result["total_domain_array"];
  });
}