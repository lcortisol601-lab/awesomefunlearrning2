import { hostname } from "node:os";
import { createServer } from "node:http";
import express from "express";
import wisp from "wisp-server-node";

import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const app = express();

// Serve custom frontend first (takes priority)
app.use(express.static("./public"));

// Serve Ultraviolet library files
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

// 404 fallback
app.use((req, res) => {
	res.status(404);
	res.sendFile("404.html", { root: "./public" });
});

const server = createServer();

server.on("request", (req, res) => {
	// Required headers for SharedArrayBuffer (needed by BareMux/Epoxy)
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
	app(req, res);
});

server.on("upgrade", (req, socket, head) => {
	if (req.url.endsWith("/wisp/")) {
		wisp.routeRequest(req, socket, head);
		return;
	}
	socket.end();
});

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

server.on("listening", () => {
	const address = server.address();
	console.log("🚀 Nozis Proxy is running!");
	console.log(`   Local:   http://localhost:${address.port}`);
	console.log(`   Network: http://${hostname()}:${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("\n🛑 Shutting down...");
	server.close();
	process.exit(0);
}

server.listen({ port });
