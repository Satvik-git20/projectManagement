import { createServer } from "node:http";
import next from "next";
import { attachRealtime } from "./src/server/realtime.mjs";

const dev =
  !process.argv.includes("--prod") && process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "localhost";

let handle;
const server = createServer((req, res) => handle(req, res));

const app = next({ dev, hostname, port, httpServer: server });
handle = app.getRequestHandler();

await app.prepare();

attachRealtime(server);

server.listen(port, () => {
  const mode = dev ? "development" : "production";
  console.log(`\n  TaskFlow ready on http://${hostname}:${port} (${mode})`);
  console.log(`  Socket.IO listening on the same origin at /socket.io\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
