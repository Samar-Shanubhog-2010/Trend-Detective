import http from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8000);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(root, ".env"));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  if (relativePath === ".env" || relativePath.startsWith(".git/")) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  let filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function serveChat(request, response) {
  let body = "";
  for await (const chunk of request) body += chunk;

  let parsedBody = {};
  try {
    parsedBody = body ? JSON.parse(body) : {};
  } catch {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Invalid JSON." }));
    return;
  }

  const requestAdapter = { method: request.method, body: parsedBody };
  const responseAdapter = {
    statusCode: 200,
    setHeader(name, value) {
      response.setHeader(name, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      response.statusCode = this.statusCode;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(payload));
    }
  };

  const { default: handler } = await import(pathToFileURL(path.join(root, "api", "chat.js")));
  await handler(requestAdapter, responseAdapter);
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/chat")) {
      await serveChat(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    console.error(error);
    response.writeHead(500);
    response.end("Internal server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Trend Detective running at http://localhost:${port}`);
});
