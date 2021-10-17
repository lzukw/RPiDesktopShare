const path = require("path");
const {readFile} = require("fs").promises;
const express = require('express');
const app = express();
var expressWs = require('express-ws')(app);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Add static routing of files in directory 'puclic'.
app.use( express.static(path.join(__dirname, 'public')))

// Used by the local webpage to get the current WLAN-SSID this
// server is connected to.
app.get("/local_streaming_sink/ssid", async (req, res) => { 
  let ssid;
  try {
    let ssid = await readFile("current_ssid.txt", "utf8");
    ssid = ssid.trim();
    console.log(`Responding request to /local_streaming_sink/ssid. Sending: '${ssid}'`);
    res.json( {"ssid": ssid } );
  }
  catch {
    ssid = "???";
    console.log(`Responding request to /local_streaming_sink/ssid. Sending: '${ssid}'`);
    res.json( {"ssid": ssid } );
  }
});

// Used by the local webpage to get up to four current URLs the 
// remote client can use to connect to.
app.get("/local_streaming_sink/urls", async(req, res)=> {
  let urls;
  try {
    let fileContent = await readFile("current_urls.txt", "utf8");
    let addrs = fileContent.split("\n");
    let portSuffix = PORT==80 ? "" : ":"+PORT;
    urls=[];
    for (let i=0; i< addrs.length; i++ ) {
      let addr = addrs[i].trim()
      if ( addr ) urls.push( `http://${addr}${portSuffix}` );
    }
    console.log(`Responding request to /local_streaming_sink/urls. Sending: '${urls}'`);
    res.json( { "urls": urls } );
  }
  catch {
    urls = [ "???", "????" ];
    console.log(`Responding request to /local_streaming_sink/urls. Sending: '${urls}'`);
    res.json( { "urls": urls } );
  }
  
});

// Used by local webpage to get (current) advanded info about WLAN
app.get("/local_streaming_sink/wlan_info", async (req, res) => {
  let wlan_info;
  try {
    let fileContent = await readFile("current_wlan_info.txt", "utf8");
    wlan_info = fileContent.trim();
    console.log(`Responding request to /local_streaming_sink/wlan_info. Sending: '${wlan_info}'`);
    res.send(wlan_info);
  }
  catch (error) {
    wlan_info = `Error getting wlan_info: ${error}`;
    console.log(`Responding request to /local_streaming_sink/wlan_info. Sending: '${wlan_info}'`);
    res.send(wlan_info);
  }
  
});

//
// Websocket implementation
//

let ws_streaming_source = null;
let ws_streaming_sink = null;

// receive something from streaming-source and forward it to 
// streaming-sink. Also send a response back to the streaming-source
// indicating success or error.
app.ws("/from_streaming_source_to_sink", (ws, req)=> {
  
  if ( ! ws_streaming_source) ws_streaming_source = ws;

  ws_streaming_source.on("message", msg=>{
    if (ws_streaming_sink) {
      // forward msg to streaming-sink
      console.log(`Websockets: Forwarding from streaming-source to -sink: '${msg}'`);
      ws_streaming_sink.send(msg);
      // notify streaming-source (sender) about success
      console.log('--> Sending success-response to streaming-source');
      ws_streaming_source.send(JSON.stringify( 
        {
          "type" : "response", 
          "error" : null 
        }
      ));
    }
    else {
      // there is no websocket to streaming-sink, so notify
      // streaming-source (sender) by responding with an error-message
      console.log("Websockets: Forwarding from streaming-source to -sink not successfull (Websocket of sink not open).");
      console.log('--> Sending error-response to streaming-source');
      ws_streaming_source.send(JSON.stringify(
        {
          "type" : "response",
          "error" : "Sorry, this shouldn't happen, but there is no websocket-connection to the streaming sink."
        }
      ));
    }
  });
});

// The same in the opposite direction: Forward a message 
// from the streaming sink to the streaming source, and send a response
// back to the streaming sink (sender) indicating success or error.
app.ws("/from_streaming_sink_to_source", (ws, req)=> {

  if ( ! ws_streaming_sink ) ws_streaming_sink = ws;

  ws_streaming_sink.on("message", msg => {

    if (ws_streaming_source) {
      // forward msg to streaming-sourse
      console.log(`Websockets: Forwarding from streaming-sink to -source: '${msg}'`);
      ws_streaming_source.send(msg);
      // notify streaming-sink (sender) about success
      console.log('--> Sending success-response to streaming-sink');
      ws_streaming_sink.send(JSON.stringify( 
        {
          "type" : "response", 
          "error" : null 
        }
      ));
    }
    else {
      // there is no websocket to streaming-source, so notify
      // streaming-sink (sender) by responding with an error-message
      console.log("Websockets: Forwarding from streaming-sink to -source not successfull (Websocket of source not open).");
      console.log('--> Sending error-response to streaming-sink');
      ws_streaming_sink.send(JSON.stringify(
        {
          "type" : "response",
          "error" : "Sorry, this shouldn't happen, but there is no websocket-connection to the streaming source."
        }
      ));
    }
  });
});


app.listen(PORT, () => {
  console.log(`RPiDesktopShare listening on all interfaces on port ${PORT}`);
});