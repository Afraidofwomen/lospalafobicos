import { serve } from "@hono/node-server";
import "dotenv/config";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const app = createApp({ config });

serve({ fetch: app.fetch, hostname: "0.0.0.0", port: config.port }, (info) => {
  console.log(`api http://127.0.0.1:${info.port}`);
});
