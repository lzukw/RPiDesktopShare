//////////// Globals //////////////////

// HTML-Elements modified by this code
let log_elt = null;
let btn_connect_elt = null;
let btn_disconnect_elt = null;
let video_local_elt = null;

// Global-Variables needed for streaming

// This object of type MediaStream holds the local media-Stream (Screen-Capture)
let mediaStream = null;

// This objects of type RTCPeerConnection is used to establish a connection to
// the remote peer.
let peerConnection = null;

// The iceCandiatades
let sourceIceCandidates = null;

// This object is used for signalling (For example to exchange data to the remote 
// peer before an RTCPeerConnection is established)
let connectionState = null;

////////// Functions for streaming ///////

// Get Display-media-stream (User must consent), and display it in 
// local video-Element. The media-stream is stored in the global
// object mediaStream (of type MediaStream).
async function getMediaStream() {
  try {
    const constraints = 
      {
        video:  { cursor: 'always' , displaySurface: 'monitor'},
      };
    mediaStream = await navigator.mediaDevices.getDisplayMedia( constraints );
    video_local_elt.srcObject = mediaStream;

    // When the user removes the consent to screen-sharing, do the same as if
    // the user would have clicked the "Disconnect"-Button
    mediaStream.getTracks().forEach(track => track.onended = on_btn_disconnect_click);
  }
  catch (error) {
    log_elt.innerHTML += `Error getting and displaying Display-Mediastream: ${error}\n`;
    throw (error);
  }

  log_elt.innerHTML += "Got Display-Mediastream after User-consent.\n";
}

// Iniitialize the peerConnection (an object of type RTCpeerConnection)
function initPeerConnection() {
    
  // Initialize peerConnection-Object
  // In a local network no STUN- or TURN-servers are needed
  const rtcConfiguration = {'iceServers': []};
  peerConnection = new RTCPeerConnection(rtcConfiguration);

  peerConnection.addEventListener('connectionstatechange', event => {
    log_elt.innerHTML += `peerConnection changed state: ${peerConnection.connectionState}\n`;
  });

  // If new iceCandidates are available, add them to a local 
  // list (sourceIceCandidates). This list is sent later via the
  // server to the remote peer (signaling).
  peerConnection.onicecandidate =  event => {
    sourceIceCandidates.push(event.candidate);
  };

  // Add tracks from mediaStream to the peerConnection.
  mediaStream.getTracks().forEach( (track) =>
      peerConnection.addTrack(track, mediaStream));

      log_elt.innerHTML += "Beginning to establish the RTCPeerConnection\n";
}

// First step of establishing the PeerConnection: Send an offer to the remote peer
// via the signaling: Fill data (the offer and other things) in the 
// `connectionState`-Object and put it to the server. The peer has to poll the 
// server for this object, and notices that `connectionState.state` has changed 
// to "sentOffer".
async function sendOffer() {
  
  // create an offer, store it in the local-description and 
  // send it to streaming sink
  // The connecitonID is not used for now.
  connectionState.connectionID = Math.ceil( Math.random()*10000000 );
  connectionState.state = "sentOffer";
  connectionState.offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(connectionState.offer);

  // Put `connectionState` to the server.
  await putToServer(connectionState);

  log_elt.innerHTML += "Sent OFFER to remote peer\n";
}

// Second part of creating peer-Connection: Poll server, until the 
// streaming sink has sent an answer to our offer and process this answer
async function pollForAnswer() {

  let remoteConnectionState = null;

  // TODO: Limit to 10 tries, or so. If not successfull, log and/or throw an error
  do {
    await delay_ms(200);
    remoteConnectionState = await getRemoteConnectionStateFromServer();

  } while ( ! remoteConnectionState || ! remoteConnectionState.state ||
    remoteConnectionState.state !=  "sentAnswer");
  
  // We got an answer form the streaming sink
  // update our connectionState
  connectionState = remoteConnectionState;
  // store the answer in the remote-description 
  const remoteDesc = new RTCSessionDescription(remoteConnectionState.answer);
  await peerConnection.setRemoteDescription(remoteDesc);
  
  log_elt.innerHTML += "Received ANSWER from remote peer\n";
}

async function waitForAndSendIceCanditates() {

  let nowKnownCandidates = 0;
  let lastKnownCandiates = 0;
  do {
    await delay_ms(1000);
    lastKnownCandiates = nowKnownCandidates
    // sourceIceCandidates is filled by the asynchronous callback  
    // peerConnection.onicecandidate defined in initPeerConnection()
    nowKnownCandidates = sourceIceCandidates.length;

    // we need to wait until there is at least one ice-canditate and 
    // until the number of known ice-canditades is stable (did not change during
    // the last second).
  } while(nowKnownCandidates == 0 && nowKnownCandidates == lastKnownCandiates);

  // now send the ice-candidates
  connectionState.sourceIceCandidates = sourceIceCandidates;
  connectionState.state="sentIceCandidates";
  await putToServer(connectionState);

  log_elt.innerHTML += "Sent ICE-candidates to remote peer\n";
}

async function waitForConnectedState() {
  
  // poll the peer (vis the server) until its connectionState.state is "connected"
  let remoteConnectionState = null;

  // TODO: Limit to 10 tries, or so. If not successfull, log and/or throw an error
  do {
    await delay_ms(200);
    remoteConnectionState = await getRemoteConnectionStateFromServer();

  } while ( ! remoteConnectionState || ! remoteConnectionState.state ||
    remoteConnectionState.state !=  "connected");

  // The remote connectionState.state changed to connected, also store this in
  // our local connectionState
  connectionState = remoteConnectionState;

  // Also ensure that the local peerConnection got the state "connected"
  while (peerConnection.connectionState != "connected") {
    await delay_ms(200);
  }

  log_elt.innerHTML += "RTCPeerConnection established.\n";
}

async function hangup() {
  // Close local RTCPeerConnection
  if (peerConnection) {
    peerConnection.close();

    // Inform remote peer by pushing connectionState with state="closing" to 
    // the server.
    connectionState.state="closing";
    await putToServer(connectionState);
  }

  //also "give back" the mediaStream
  if (mediaStream) {
    mediaStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  log_elt.innerHTML += "RTCPeerConnection closed";
}


///////// Helper functions /////////////////

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

// Clicking the Connect-Button initializes the streaming
async function on_btn_connect_click() {

  btn_connect_elt.disabled=true;

  try {
    // The following sequence establishes the peerConnection
    await getMediaStream();
    initPeerConnection();
    await sendOffer();  
    await pollForAnswer();
    await waitForAndSendIceCanditates();
    await waitForConnectedState();
    
    // The remote streams have already been added to the peerConnection 
    // during `initPeerConnection()`, so no need to add them now.

  }
  catch (error) {
    log_elt.innerHTML += `Error initialting connection: ${error}`;
    restart(); // start again
  }

  btn_disconnect_elt.disabled=false;
}

async function on_btn_disconnect_click() {
  await hangup();
  //start this webpage again
  restart();
}

// establishes (or re-establishes) an initial state of DOM-Elements
// and global variables
function restart() {

  // Initialize contents and visibility of HTML-Elements
  log_elt.innerHTML = "";
  btn_connect_elt.disabled = false;
  btn_disconnect_elt.disabled = true;

  // Initialize global variables
  mediaStream = null;
  peerConnection = null;
  connectionState = { state : "disconnected" };
  sourceIceCandidates = [];
}

window.addEventListener("load", ()=>{
  // The HTML-Elements
  log_elt = document.querySelector("pre#logoutput");
  btn_connect_elt = document.querySelector("button#connect");
  btn_disconnect_elt = document.querySelector("button#disconnect");
  video_local_elt = document.querySelector("video#localstream");

  restart();

  // A Click on the "Connect"-Button starts everything
  btn_connect_elt.addEventListener("click", on_btn_connect_click);

  // A Click on the "Disconnect"-Button stops everything, also a window-closing
  // Note that also the user disallowing screen-sharing causes on_btn_disconnect_click
  // to be called, but this callback is added in getMediastream()
  btn_disconnect_elt.addEventListener("click", on_btn_disconnect_click);
  window.addEventListener("beforeunload", async ()=>{ 
    await hangup(); 
  });

});