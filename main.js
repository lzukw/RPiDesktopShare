const fs = require("fs");
const path = require("path");
const express = require('express');
const https = require('https');

// Environment-Variable PORT
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Read private key and certificate for https
const key = fs.readFileSync(path.join(__dirname,'webserver.key'), "utf-8");
const cert = fs.readFileSync(path.join(__dirname,'webserver.crt'), "utf-8");

// global storage for connection status
let connectionSatus = {};

// Express with https
const app = express();
const server = https.createServer({key: key, cert: cert }, app);

// Add static routing of files in directory 'puclic'.
app.use( express.static(path.join(__dirname, 'public')));
// Add middleware for json-Requests
app.use( express.json() );

app.put("/connection_satus", async (req, res)=> {
  connectionSatus = req.body;
  res.end();
});

app.get("/connection_satus", (req, res)=>{
  res.set('Content-Type', 'application/json');
  res.json(connectionSatus);
});

server.listen(PORT, () => {
  console.log(`RPiDesktopShare listening on all interfaces on port ${PORT}`);
});