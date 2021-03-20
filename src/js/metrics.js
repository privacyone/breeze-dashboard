///INITS FOR SESSION AND TOTAL DATA ///
let sessionBlocked = 0;
let totalBlocked;

let sessionAllowed = 0;
let totalAllowed;

let sessionUrlCount = 0;
let totalUrlCount;

let sessionDomainsBlockedArray = [];
let totalDomainsBlockedArray;

loadSavedTotalCounts();
loadTotalDomainArray();
// setTestData();

setInterval(function(){
	saveTotalCounts();
	saveTotalDomainArray();
}, 5000);
//////////////////////////////////////////////


window.onbeforeunload = closingCode;
function closingCode(){
   saveTotalCounts();
   saveTotalDomainArray();
   return null;
}

///INTERNAL UPDATING FOR TOTAL BLOCKED COUNT///
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse){
    if(request.what == "total_counts_from_master"){
    	sessionBlocked += request.blockCount;
    	totalBlocked += request.blockCount;
        sessionAllowed += request.allowedCount;
        totalAllowed += request.allowedCount;
        sessionUrlCount += request.urlCount;
        totalUrlCount += request.urlCount;
	}
});
//////////////////////////////////////////////

///INTERNAL UPDATING FOR BLOCKED DOMAINS///
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse){
    if(request.what != "ublock_domain_block") { return ;}
    //session
    let url = makePrettyUrl(request.url);
    if(!(sessionDomainsBlockedArray.some(domain => { 
    	if(domain.url == url){
    		domain.count++;
    		return true;
    	}
    }))) {
    	let newDomain = {url : url , count : 1};
    	sessionDomainsBlockedArray.push(newDomain);
    }
    if(!(totalDomainsBlockedArray.some(domain => { 
    	if(domain.url == url){
    		domain.count++;
    		return true;
    	}
    }))) {
    	let newDomain = {url : url , count : 1};
    	totalDomainsBlockedArray.push(newDomain);
    }
});

chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse){
    if(request.what != "badger_domain_block") { return ;}
    let url = request.url;
    if(!(sessionDomainsBlockedArray.some(domain => { 
    	if(domain.url == url){
    		domain.count++;
    		return true;
    	}
    }))) {
    	let newDomain = {url : url , count : 1};
    	sessionDomainsBlockedArray.push(newDomain);
    }
    if(!(totalDomainsBlockedArray.some(domain => { 
        if(domain.url == url){
            domain.count++;
            return true;
        }
    }))) {
        let newDomain = {url : url , count : 1};
        totalDomainsBlockedArray.push(newDomain);
    }
});
//////////////////////////////////////////////

///LISTENERS FOR HTML///
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if(request.what == "get_pie_chart_metrics"){
		sendResponse({sessionBlocked,sessionAllowed,totalBlocked,totalAllowed});
	}
    else if(request.what == "get_bar_chart_metrics"){
        sendResponse({sessionDomainsBlockedArray,totalDomainsBlockedArray});
    }
    else if(request.what == "get_0.66_metrics"){
        sendResponse({totalBlocked,sessionBlocked,totalUrlCount,sessionUrlCount});
    }
    else if(request.what == "reset_all_data") {
        resetAllData();
    }
    else if(request.what == "reset_session_data") {
        resetSessionData();
    }
})
//////////////////////////////////////////////


function loadSavedTotalCounts(){
	chrome.storage.local.get(["total_counts"], function(result){
        let counts = !result["total_counts"] ? {total_blocked : 0, total_allowed : 0, total_url_count: 0} : result["total_counts"];
		totalBlocked = counts.total_blocked;
        totalAllowed = counts.total_allowed;
        totalUrlCount = counts.total_url_count == undefined ? 0 : counts.total_url_count;
	})
}

function saveTotalCounts(){
	chrome.storage.local.set({"total_counts" : {total_blocked : totalBlocked, total_allowed : totalAllowed, total_url_count : totalUrlCount}});
}

function loadTotalDomainArray(){
	chrome.storage.local.get(["total_domain_array"], function(result){
		totalDomainsBlockedArray = !result["total_domain_array"] ? [] : result["total_domain_array"];
	});
}

function saveTotalDomainArray(){
	chrome.storage.local.set({"total_domain_array" : totalDomainsBlockedArray});
}

function makePrettyUrl(uglyUrl){
    let prettyUrl;
    if(uglyUrl.includes("https://")) {
        prettyUrl = uglyUrl.substr(8);
    }
    else {
        prettyUrl = uglyUrl.substr(7);
    }
    let pos = prettyUrl.indexOf("/");
    prettyUrl = prettyUrl.substr(0,pos);
    return prettyUrl;
}

function resetAllData() {
  resetSessionData();
  totalBlocked = 0;
  totalAllowed = 0;
  totalUrlCount = 0;
  totalDomainsBlockedArray.forEach(domain => domain.count = 0);
  saveTotalDomainArray();
  saveTotalCounts();
}

function resetSessionData() {
  sessionBlocked = 0;
  sessionAllowed = 0;
  sessionUrlCount = 0;
  sessionDomainsBlockedArray = [];
}

function saveData(data, fileName){
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var json = JSON.stringify(data, null, "\t"),
        blob = new Blob([json], {type: "octet/stream"}),
        url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

function downloadBlockedDomainsList(){
    totalDomainsBlockedArray.sort((a,b)=>{return b.count - a.count;});
    saveData(totalDomainsBlockedArray, "blocked_domains.json");
}
//////////////////////////////////////////