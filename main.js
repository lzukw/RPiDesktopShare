const path = require("path");
const express = require('express');
const app = express();

const port = 3000;

// Add static routing of files in directory 'puclic'.
app.use( express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
  console.log(`RPiDesktopShare listening on all interfaces on port ${port}`);
});