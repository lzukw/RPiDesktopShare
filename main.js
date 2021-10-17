const path = require("path");
const {readFile} = require("fs").promises;
const express = require('express');
const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Add static routing of files in directory 'puclic'.
app.use( express.static(path.join(__dirname, 'public')))

// Used by the local webpage to get the current WLAN-SSID this
// server is connected to.
app.get("/local_streaming_sink/ssid", async (req, res) => { 
  try {
    let ssid = await readFile("current_ssid.txt", "utf8");
    res.json( {"ssid": ssid.trim() } );
  }
  catch {
    res.json({"ssid": "???"});
  }
});

// Used by the local webpage to get up to four current URLs the 
// remote client can use to connect to.
app.get("/local_streaming_sink/urls", async(req, res)=> {
  try {
    let fileContent = await readFile("current_urls.txt", "utf8");
    let addrs = fileContent.split("\n");
    let urls = []
    let portSuffix = PORT==80 ? "" : ":"+PORT;
    for (let i=0; i< addrs.length; i++ ) {
      let addr = addrs[i].trim()
      if ( addr ) urls.push( `http://${addr}${portSuffix}` );
    }
    res.json( { "urls": urls } );
  }
  catch {
    res.json( { "urls": [ "???", "????" ] } );
  }
});

// Used by local webpage to get (current) advanded info about WLAN
app.get("/local_streaming_sink/wlan_info", async (req, res) => {
  try {
    let fileContent = await readFile("current_wlan_info.txt", "utf8");
    res.send(fileContent.trim());
  }
  catch (error) {
    res.send(`Error getting wlan_info: ${error}`);
  }
});

app.listen(PORT, () => {
  console.log(`RPiDesktopShare listening on all interfaces on port ${PORT}`);
});