import {createServer} from "http";

const app = require("./app");

const port = process.env.PORT || 3030;

console.log(port);

const server = createServer(app);

// Init Server
server.listen(port);
