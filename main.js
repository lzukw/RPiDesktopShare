const path = require("path");
const express = require('express');

// Environment-Variable PORT
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// global storage for connection status
let connectionSatus = {};

// Express
const app = express();

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

app.listen(PORT, () => {
  console.log(`RPiDesktopShare listening on all interfaces on port ${PORT}`);
});