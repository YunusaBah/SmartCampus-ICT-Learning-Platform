const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const npmCli = process.env.npm_execpath;
const services = ["backend", "frontend"];
const children = [];
let stopping = false;

if (!npmCli) {
    throw new Error("Start the development servers with `npm run dev` from the repository root");
}

const stopServices = (exitCode = 0) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = exitCode;
    for (const child of children) {
        if (!child.killed) child.kill();
    }
};

for (const service of services) {
    const child = spawn(process.execPath, [npmCli, "run", "dev"], {
        cwd: path.join(root, service),
        stdio: "inherit"
    });
    children.push(child);

    child.on("error", (error) => {
        console.error(`Could not start ${service}:`, error.message);
        stopServices(1);
    });
    child.on("exit", (code) => {
        if (!stopping) stopServices(code ?? 1);
    });
}

process.on("SIGINT", () => stopServices());
process.on("SIGTERM", () => stopServices());
