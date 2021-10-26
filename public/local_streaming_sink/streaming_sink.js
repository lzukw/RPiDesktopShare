"use strict";

//////////// Globals //////////////////

// HTML-Elements modified by this code
//let log_elt = null; already declared in fill_placeholders.js
let video_div_elt = null;
let video_elt = null;
let instruction_div_elt = null;

// Global-Variables needed for streaming
let mediaStream = null;
let peerConnection = null;
let connectionState = null;

////////// Functions for streaming ///////

function initPeerConnection() {
  // Initialize peerConnection-Object
  // In a local network no STUN- or TURN-servers are needed
  const rtcConfiguration = {'iceServers': []};
  peerConnection = new RTCPeerConnection(rtcConfiguration);
  
  peerConnection.addEventListener('connectionstatechange', event => {
    log_elt.innerHTML += `peerConnection changed state: ${peerConnection.connectionState}\n`;
  });

  // This handler will be called later, when the peerConnection is established.
  peerConnection.addEventListener("track", (event)=> {
    // This is the mediastream received from the remote streaming source
    mediaStream = event.streams[0];

    // Setup-HTML-Elements
    video_div_elt.style.display="";
    instruction_div_elt.style.display="none";

    // Play mediaStream in <video>-Element
    video_elt.srcObject = mediaStream;
    // video_elt.play() only works after a user interaction or for muted video
    video_elt.muted = true;
    video_elt.play();
    //video_elt.requestFullscreen(); ...would only work with user consent on streaming-sink
    //              instead browser should be started in fullscreen

    log_elt.innerHTML += "Got the remote stream, displaying it now...\n";
  });

  log_elt.innerHTML += "Beginning to establish an RTCPeerConnection\n";
}

// First step of creating a peer connection: Wait for offer (sent
// by the streaming source), process it, create answer, process and send it.
async function waitForOffer() {

  log_elt.innerHTML += "Waiting for peer to connect...\n";
  
  let remoteConnectionState;
  do {
    try {
      await delay_ms(200);
      remoteConnectionState = await getRemoteConnectionStateFromServer();
    }
    catch (error) {
      log_elt.innerHTML += `GET-Request to /connection_satus failed: ${error}\n`;
    }

  } while(! remoteConnectionState || ! remoteConnectionState.state || 
    remoteConnectionState.state != "sentOffer");

  // We received an offer.
  // update local connectionState to the one sent by the peer (containing the offer)
  connectionState = remoteConnectionState;
  // Store offer as "remote-description" in the peerConnection-Object
  peerConnection.setRemoteDescription(new RTCSessionDescription(remoteConnectionState.offer));

  log_elt.innerHTML += "Received OFFER from remote peer.\n";
}

async function createAndSendAnswer() {

  // Create answer andstore it as "local-description" in the peerConnection-Object
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  // Also add the answer to the connectionState and send it to the streaming source
  // (via the server)
  connectionState.state = "sentAnswer";
  connectionState.answer = answer;
  await putToServer(connectionState);

  log_elt.innerHTML += "Sent ANSWER to remote peer.\n";
}

async function waitForIceCandidates() {
  
  let remoteConnectionState;
  do {
    try {
      await delay_ms(200);
      remoteConnectionState = await getRemoteConnectionStateFromServer();
    }
    catch (error) {
      log_elt.innerHTML += `GET-Request to /connection_satus failed: ${error}\n`;
    }

  } while(! remoteConnectionState || ! remoteConnectionState.state || 
    remoteConnectionState.state != "sentIceCandidates");
  
  // We got ICE-candidates from the peer, add them to the peerConnection
  connectionState = remoteConnectionState;
  connectionState.sourceIceCandidates.forEach( (candidate) => 
         peerConnection.addIceCandidate(candidate));
  
  log_elt.innerHTML += "Received ICE-candidates from remote peer.\n";
}

async function waitForAndSendConnectedState() {
  
  // wait until peerConnection.connectionState is "connected"
  do {
    await delay_ms(200);
  } while (peerConnection.connectionState != "connected")

  // Send new connectionState to remote peer via server
  connectionState.state = "connected";
  await putToServer(connectionState);

  log_elt.innerHTML += "RTCPeerConnection established.\n";
}

async function adjustVideoElementSize() {
  
  let localAspectRatio = window.innerWidth / window.innerHeight;
  
  // The aspect-ration of the remote-stream is not known immediately
  // so wait until it becomes available
  let remoteAspectRatio;
  do {
    remoteAspectRatio = mediaStream.getVideoTracks()[0].getSettings().aspectRatio;
    await delay_ms(1000);
  } while (! remoteAspectRatio);
  
  log_elt.innerHTML += `Remote Aspect-Ratio of stream is ${remoteAspectRatio}. Adjusting Video-Element.\n`;

  if (remoteAspectRatio > localAspectRatio) {
    video_elt.width = window.innerWidth;
    video_elt.height = video_elt.width / remoteAspectRatio;
  }
  else {
    video_elt.height = window.innerHeight;
    video_elt.width = video_elt.height * remoteAspectRatio;
  }
}

async function waitForPeerClosingConnection() {
  // wait until peerConnection.connectionState changes from "connected" to something 
  // different (normally to "closing").
  let remoteConnectionState;
  do {
    await delay_ms(1000);
    remoteConnectionState = await getRemoteConnectionStateFromServer();
  } while (remoteConnectionState.state == "connected")

  video_div_elt.style.display="none";
  instruction_div_elt.style.display="";
  log_elt.innerHTML += "RTCPeerConnection closed by remote peer\n";
}


///////// Helper functions ////////////////

// This is a 1:1 copy of the same section in streaming_source.js

// delay_ms(ms) can be awaited and just resolves after ms milliseconds
async function delay_ms(ms) { 
  return new Promise( (resolve)=> { setTimeout( resolve , ms) }  );
}

// Used for signaling:
// This function PUTs `connectionState` to the server. The 
// connectionState-Object is used for signalling. One peer (source or sink) 
// puts it onto the server, the other peer gets it from the server (polling 
// the server).
async function putToServer(connectionState){
  try {
    let response = await fetch("/connection_satus", 
      {
        method : "PUT",
        headers : { 'Content-type': 'application/json; charset=UTF-8' },
        body : JSON.stringify(connectionState)
      }
    );
    if (response.status != 200 ) throw new Error(`response-status=${response.status}`);
  }
  catch (error) {
    log_elt.innerHTML += `PUT-Request to /connection_satus failed: ${error}\n`;
    throw error;
  }
}

// Used for signaling:
// This function gets `connectionState` from the server (see also: 
// putConnectionStateToServer).
async function getRemoteConnectionStateFromServer() {
  try {
    let response = await fetch("/connection_satus",
      { 
        method : "GET",
        headers : { 'Accept': 'application/json' },
      }
    );
    let remoteConnectionState = await response.json();
    return remoteConnectionState;
  }
  catch (error) {
    log_elt.innerHTML += `GET-Request to /connection_satus failed: ${error}\n`;
    // throw error;
  }
}

///////// Starting code ///////////////////

async function restart() {

  // Initialize HTML-Elements
  log_elt.innerHTML = "";
  video_elt.srcObject = null;
  video_div_elt.style.display="none";
  instruction_div_elt.style.display="";
  
  // initialize global variables
  mediaStream = null;
  connectionState = 
    {
      state : "disconnected",
    };
  // The connectionState (dicsonnected) has to communicated to the peer via the sever
  await putToServer(connectionState);

  // The following sequence establishes the peerConnection
  initPeerConnection();
  await waitForOffer();
  await createAndSendAnswer();
  await waitForIceCandidates();  
  await waitForAndSendConnectedState();

  // We don't have to wait for a remote Track to come in on the peerConnection, 
  // because this is already handled by an event-handler, that has already been
  // set up in `initPeerConnection()`.

  // don't await this, it can run "in background"
  adjustVideoElementSize();

  // Wait until the peer closes the connection
  await waitForPeerClosingConnection();

  // finally start again 
  setTimeout( restart, 5000);
}

window.addEventListener("load", ()=>{

  video_elt = document.querySelector("video#remote_stream");
  video_div_elt = document.querySelector("div#video");
  instruction_div_elt = document.querySelector("div#instruction");
  log_elt = document.querySelector("pre#logoutput");

  restart() ; 
});

