window.onload = () => {let toggle = document.getElementById("kliknime");

toggle.onclick = function(){
    chrome.runtime.sendMessage({what: 'setToggle', toggle: toggle.checked})
}
}