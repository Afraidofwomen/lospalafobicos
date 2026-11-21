import { serve } from "@hono/node-server";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), "../.env") });

const config = loadConfig();
const app = createApp({ config });

serve({ fetch: app.fetch, hostname: "0.0.0.0", port: config.port }, (info) => {
  console.log(`api http://127.0.0.1:${info.port}`);
});
