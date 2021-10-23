"use strict";

// HTML-Elements  
let log_elt = null;
let wifi_ssid_elt = null;
let pre_wlan_info = null;

/**
 * Fetches the WLAN-SSID of the server via a GET-Request to
 * "/local_streaming_sink/ssid" and puts the result in the
 * HTML-Element with id="wifi_ssid"
 */
async function fillInSsid() {
  
  try {
    let response = await fetch("/local_streaming_sink/current_ssid.txt");
    if (response.status != 200) {
      throw new Error(`Response status: ${response.status}`);
    };
    let fetchedObject = await response.text();
    wifi_ssid_elt.innerHTML = fetchedObject;
  }
  catch (error) {
    log_elt.innerText += `fetching /local_streaming_sink/current_ssid.txt failed: ${error}\n`;
  }
}

/**
 * Fetches the four possilbe URLS from the server via a GET-Request to
 * "/local_streaming_sink/urls" and puts them into the HTML-Elements with
 * ids "url_1" ..."url_4"
 */
async function fillInUrls() {
  try {
    let response = await fetch("/local_streaming_sink/current_urls.txt")
    if (response.status != 200) {
      throw new Error(`Response status: ${response.status}`);
    };
    let fetchedUrls = await response.text();  
    
    let urls;
    try {
      urls = fetchedUrls.split("\n");
    }
    catch {
      urls=[];
    }

    for (let i=0; i<4; i++) {
      let elt = document.querySelector(`li#url_${i}`);
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
    log_elt.innerText += `fetch to '/local_streaming_sink/current_urls.txt' failed: ${error}\n`;
  }
}

async function fillInWlanInfo() {
  try {
    let response = await fetch("/local_streaming_sink/current_wlan_info.txt");

    if (response.status != 200) {
      throw new Error(`Response status: ${response.status}`);
    };
    let wlanInfo = await response.text();
    pre_wlan_info.innerHTML = wlanInfo;
  }
  catch (error) {
    log_elt.innerText += `fetch to '/local_streaming_sink/current_wlan_info.txt' failed: ${error}\n`;
  }
}

window.addEventListener("load", ()=>{
  
  log_elt = document.querySelector("pre#logoutput");
  wifi_ssid_elt = document.querySelector("span#wifi_ssid");
  pre_wlan_info = document.querySelector("pre#wlan_info");

  setInterval( ()=>{
    fillInSsid();
    fillInUrls();
    fillInWlanInfo();
  }, 5000);
  
});