//////////// Globals //////////////////

// HTML-Elements modified by this code
let log_elt = null;
let video_elt = null;

// Websocket to server
let ws = null;

/////////////// Websocket //////////////////////

// Open Websocket to server
function _prv_open_websocket() {
  ws = new WebSocket("ws://" + location.host + "/from_streaming_sink_to_source");  

  ws.onerror = (error) => {
    log_elt.innerHTML += "Websocket to Server has an Error. Restarting in 5 seconds... \n";
    setTimeout(restore_initial_state, 5000);
  };

  ws.onclose = ()=> {
    log_elt.innerHTML += "Websocket to Server has been closed. Restarting in 5 seconds...\n";
    setTimeout(restore_initial_state, 5000);
  };

  ws.onmessage = on_message_from_websocket;

  ws.onopen = (event) => {
    log_elt.innerHTML += "Websocket to Server is now open. Waiting for messages.\n";
    
  };
}

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
    case "echo-request":
      log_elt.innerHTML += "Websocket: Sending echo-response\n";
      ws.send(JSON.stringify(
        {
          "type" : "echo-response",
          "error" : null
        }
      ));
      break;
  
    default:
      break;
  }
}

///////////// Peer to Peer Connection //////////////////



///////// Starting code ///////////////////

async function restore_initial_state() {
  log_elt = document.getElementById("pre_logoutput");
  video_elt = document.getElementById("video_stream");

  log_elt.innerHTML = "";
  
  await open_websocket();

}

window.addEventListener("load", restore_initial_state ); 

