import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const node = process.execPath;
const processes = [
  spawn(node, [resolve(root, "node_modules/tsx/dist/cli.mjs"), resolve(root, "server/src/index.ts")], { stdio: "inherit" }),
  spawn(node, [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5173"], { stdio: "inherit" }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) child.kill("SIGTERM");
  process.exitCode = exitCode;
}

process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
for (const child of processes) child.once("exit", (code) => stop(code ?? 1));
