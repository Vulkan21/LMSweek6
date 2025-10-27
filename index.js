const express = require("express");
const { createReadStream } = require("fs");
const bodyParser = require("body-parser");
const { createApp } = require("./app.js");

const app = createApp(express, bodyParser, createReadStream, __filename);

// Render автоматически задаёт PORT — важно слушать его
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
