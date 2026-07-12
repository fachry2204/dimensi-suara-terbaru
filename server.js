import { createServer } from "http";
import next from "next";

const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";

const app = next({
  dev: false,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`Next.js server ready on http://${hostname}:${port}`);
  });
});
