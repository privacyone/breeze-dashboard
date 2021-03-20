var toggle = document.getElementById('toggle-button');

var metrics = document.getElementById('metric1').querySelector('span');
var url = document.getElementById('metric2').querySelector('span');
var metrics_total_count, metrics_session_count, url_total_count, url_session_count;
var triangleToggle = document.getElementById("red-triangle-toggle");
var triangleLegend1 = document.getElementById("legend-item3");
var triangleLegend2 = document.getElementById("legend-item4");

init();

document.addEventListener('change', event => {
    if (event.target.name === 'tabs') {
        changeTab(event.target.value);
    }
    else if (event.target.id === 'toggle-button') {

    }
});

function changeTab(tab){
    document.querySelector('main').setAttribute('tab', tab);
}

function updateMetrics(){
    chrome.runtime.sendMessage({"what":"get_0.66_metrics"},function(response){
        metrics_total_count = response.totalBlocked;
        metrics_session_count = response.sessionBlocked;
        url_total_count = response.totalUrlCount;
        url_session_count = response.sessionUrlCount;
        if(toggle.checked){
            metrics.textContent = metrics_session_count.toLocaleString('en', {useGrouping:true});
            url.textContent = url_session_count.toLocaleString('en', {useGrouping:true});
        }
        else{
            metrics.textContent = metrics_total_count.toLocaleString('en', {useGrouping:true});
            url.textContent = url_total_count.toLocaleString('en', {useGrouping:true});
        }
    })
}

toggle.addEventListener("click", function(){
    if(toggle.checked){
        metrics.textContent = metrics_session_count.toLocaleString('en', {useGrouping:true});
        url.textContent = url_session_count.toLocaleString('en', {useGrouping:true});
    }
    else{
        metrics.textContent = metrics_total_count.toLocaleString('en', {useGrouping:true});
        url.textContent = url_total_count.toLocaleString('en', {useGrouping:true});
    }
    set(toggle.checked);
})

triangleToggle.addEventListener('click', function(){
    if(triangleToggle.checked){
        triangleLegend1.classList.remove('hidden');
        triangleLegend2.classList.remove('hidden');
    }   
    else {
        triangleLegend1.classList.add('hidden');
        triangleLegend2.classList.add('hidden');
    } 
})

updateMetrics();
setInterval(function(){
    updateMetrics();
},3000);


async function init(){
    await getToggleValue();
    await drawTriangleLegend();
}

async function set(value){
    await setToggleValue(value);
}

function getToggleValue() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({what: "get_toggle_value"}, response => {
            if(response) {
                toggle.checked = response.toggle_value
                resolve();
            } else {
                reject();
            }
        });
    });
}

function setToggleValue(value) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({what: "set_toggle_value", value}, response => {
            if(response.set) {
                resolve();
            } else {
                reject();
            }
        });
    });
}


function drawTriangleLegend() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["triangle_toggle"], function(result){
            let triangleToggle = result["triangle_toggle"] == null ? false : result["triangle_toggle"];
            if (triangleToggle) {
                triangleLegend1.classList.remove('hidden');
                triangleLegend2.classList.remove('hidden');
            }
            else {
                triangleLegend1.classList.add('hidden');
                triangleLegend2.classList.add('hidden');
            }
            resolve();
        })
    });
}