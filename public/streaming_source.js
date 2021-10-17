//////////// Globals //////////////////

// HTML-Elements modified by this code
let log_elt = null;
let btn_connect_elt = null;
let btn_disconnect_elt = null;

// The websocket to the server
let ws = null;
// true, after echo-request to sink has been responded by an echo-response from sink
let connectionToSinkEstablished = false;


/////////////// Websocket //////////////////////

// private function to initialize websocket
async function _prv_open_websocket() {

  ws = new WebSocket("ws://" + location.host + "/from_streaming_source_to_sink");  

  ws.onerror = (error) => {
    log_elt.innerHTML += `Websocket to Server has an Error. Network-Connection lost? '${error}'\n`;
    setTimeout(restore_initial_state, 5000);
  };

  ws.onclose = ()=> {
    log_elt.innerHTML += "Websocket to Server has been Closed.\n";
  }

  ws.onmessage = on_message_from_websocket;

  // Wait for Websocket to change state from CONNECTING to OPEN
  // and test connection to streaming-sink by sending echo-request
  ws.onopen = () => {
    log_elt.innerHTML += "Websocket to Server is now open.\n"
    
  };

  // Wait for Echo-response before resolving the returned Promise
  return new Promise( (resolve) => {
  
    // This function is called every 2000ms, until a received echo-response
    // has set connectionToSinkEstablished to true.
    function waitForEchoResponse() {
      // Echo-Response received? If yes, finish this setTimeout-Loop
      if ( connectionToSinkEstablished ) {
        log_elt.innerHTML += "Websocket: Connection established to streaming sink.\n"
        resolve();
        return;
      }

      // Send echo-Request
      log_elt.innerHTML += "Sending echo-request to streaming-sink. Waiting for echo-response\n";
      ws.send(JSON.stringify( 
        {
          "type" : "echo-request"
        }
      ));

      // Still no echo-response recieved --> call this function again in 2000ms
      setTimeout(waitForEchoResponse, 2000);
    }
    // start calling function waitForEchoResponse after 100ms
    setTimeout(waitForEchoResponse, 100);
  });
}

// open (or reopen) the websocket
async function open_websocket() {
    // If the websocket is already open, close it first
    if (ws) { 
      ws.onclosed = async ()=>{ 
        await _prv_open_websocket();
      };
      ws.close();
    }
    else {
      await _prv_open_websocket();
    }
}

function on_message_from_websocket(event) {
  let receivedObject = JSON.parse( event.data );
  log_elt.innerHTML += `Websocket: Received ${event.data}\n`;
  
  switch (receivedObject.type) {
    case "echo-response":
      if (! receivedObject.error ) {
        log_elt.innerHTML += "Websocket: Received echo-response from streaming sink.\n"
        connectionToSinkEstablished = true;
      }
      break;
  
    default:
      break;
  }
}

///////////// Peer to Peer Connection //////////////////


///////// Starting code ///////////////////

async function restore_initial_state() {

  log_elt = document.getElementById("pre_logoutput");
  btn_connect_elt = document.getElementById("btn_connect");
  btn_disconnect_elt = document.getElementById("btn_disconnect");

  // Initialize HTML-Elements
  log_elt.innerHTML = "";
  btn_connect_elt.disabled = true;
  btn_disconnect_elt.disabled = true;

  // Open websocket
  await open_websocket();
  // Now we can enable the connect-button
  btn_connect_elt.disabled = false;
}

window.addEventListener("load", restore_initial_state );