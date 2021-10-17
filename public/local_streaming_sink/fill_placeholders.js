"use strict";

/**
 * Fetches the WLAN-SSID of the server via a GET-Request to
 * "/local_streaming_sink/ssid" and puts the result in the
 * HTML-Element with id="wifi_ssid"
 */
async function fillInSsid() {

  let log_elt = document.getElementById("pre_logoutput");
  let wifi_ssid_elt = document.getElementById("wifi_ssid");
  
  try {
    let response = await fetch("/local_streaming_sink/ssid");
    if (response.status != 200) {
      log_elt.innerText += `fill_placeholders.js: fetch to '/local_streaming_sink/ssid' returned with status ${response.status}`;
      return;
    };

    let fetchedObject = await response.json();

    wifi_ssid_elt.innerText = fetchedObject["ssid"];
  }

  catch (error) {
    log_elt.innerText += `fetch to '/local_streaming_sink/ssid' failed: ${reason}\n`;
  }
}

/**
 * Fetches the four possilbe URLS from the server via a GET-Request to
 * "/local_streaming_sink/urls" and puts them into the HTML-Elements with
 * ids "url_1" ..."url_4"
 */
async function fillInUrls() {
  
  let log_elt = document.getElementById("pre_logoutput");

  try {

    let response = await fetch("/local_streaming_sink/urls")
    
    if (response.status != 200) {
      log_elt.innerText += `fill_placeholders.js: fetch to '/local_streaming_sink/urls' returned with status ${response.status}\n`;
        return;
    };

    let fetchedObject = await response.json();  
    let urls = fetchedObject.urls;
    if (!urls) urls=[];

    for (let i=0; i<4; i++) {
      let elt = document.getElementById(`url_${i}`);
      if (i < urls.length) {
        elt.innerHTML=urls[i];
        elt.style.display="";
      }
      else {
        elt.innerHTML="";
        elt.style.display="none";
      }
    }  
  }

  catch (error) {
    log_elt.innerText += `fetch to '/local_streaming_sink/urls' failed: ${error}\n`;
  }
}

async function fillInWlanInfo() {

  let log_elt = document.getElementById("pre_logoutput");
  let pre_wlan_info = document.getElementById("pre_wlan_info");

  try {
    let response = await fetch("/local_streaming_sink/wlan_info");

    if (response.status != 200) {
      log_elt.innerText += `fill_placeholders.js: fetch to '/local_streaming_sink/wlan_info' returned with status ${response.status}\n`;
        return;
    };
    let text = await response.text();
    pre_wlan_info.innerHTML = text;
  }
  catch (error) {

  }
}

window.addEventListener("load", ()=>{
  setInterval(fillInSsid, 3000);
  setInterval(fillInUrls, 3000);
  setInterval(fillInWlanInfo, 3000);
});