import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wranglerEntry = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

const child = spawn(
  process.execPath,
  [
    wranglerEntry,
    "dev",
    "--config",
    "wrangler.preview.json",
    "--local",
    "--persist-to",
    resolve(process.cwd(), ".wrangler", "state"),
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: "false",
      WRANGLER_SEND_METRICS: "false",
      XDG_CONFIG_HOME: `${process.cwd()}/.wrangler/xdg`,
    },
  },
);

child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
