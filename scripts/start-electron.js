const { spawn } = require("child_process");

const electronPath = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ["."], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code == null ? 1 : code);
});

child.on("error", (err) => {
  console.error("[start-electron] Failed to launch Electron:", err);
  process.exit(1);
});
