// Spawns an isolated Next dev server with its own SQLite file, so the integration tests never
// touch the demo database and always start from a clean, un-bootstrapped state.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const TEST_PORT = Number(process.env.SEVADEEP_TEST_PORT ?? 3177);
export const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
export const TEST_DB_PATH = path.join(projectRoot, "data", "test-integration.db");

export function removeTestDatabase() {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true });
    } catch {
      /* nothing to remove */
    }
  }
}

let child = null;
const logLines = [];

/**
 * Builds the app once, for `mode: "production"` servers.
 *
 * The browser suite needs a production server rather than `next dev`: the Chromium vendored in
 * scraper/node_modules cannot complete Next 16's dev HMR WebSocket handshake, and Next's dev
 * client responds to the failed connection by reloading the page in a loop — which resets forms
 * mid-test. A production build has no HMR socket, and it also means the browser suite exercises
 * the same output `npm run build` produces.
 */
export async function buildOnce() {
  await new Promise((resolve, reject) => {
    const build = spawn("npx", ["next", "build"], {
      cwd: projectRoot,
      env: { ...process.env, SEVADEEP_DB_PATH: TEST_DB_PATH },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output = [];
    build.stdout.on("data", (chunk) => output.push(String(chunk)));
    build.stderr.on("data", (chunk) => output.push(String(chunk)));
    build.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build failed (${code}):\n${output.join("")}`));
    });
  });
}

export async function startServer({ fresh = false, mode = "dev" } = {}) {
  if (fresh) removeTestDatabase();

  const args =
    mode === "production"
      ? ["next", "start", "--port", String(TEST_PORT)]
      : ["next", "dev", "--port", String(TEST_PORT)];

  child = spawn("npx", args, {
    cwd: projectRoot,
    env: { ...process.env, SEVADEEP_DB_PATH: TEST_DB_PATH },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => logLines.push(String(chunk)));
  child.stderr.on("data", (chunk) => logLines.push(String(chunk)));

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    // Next 16 allows only one `next dev` per project directory. Fail fast with an actionable
    // message instead of waiting out the whole timeout.
    if (logLines.join("").includes("Another next dev server is already running")) {
      throw new Error(
        "Another `next dev` is already running for this project. Stop it first " +
          "(the message above prints its PID) and re-run the tests — the harness needs to own " +
          "the dev server so it can restart it to prove the data survives."
      );
    }
    try {
      const response = await fetch(`${BASE_URL}/api/opportunities`);
      if (response.ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Test server did not start within 90s.\n${logLines.join("")}`);
}

export async function stopServer() {
  if (!child) return;
  const dying = child;
  child = null;
  // SIGINT lets Next release its dev lock; SIGKILL is the backstop so a wedged child can
  // never hang the suite.
  dying.kill("SIGINT");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        dying.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      resolve();
    }, 8000);
    dying.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  // Give the OS a moment to free the port before the next start.
  await new Promise((resolve) => setTimeout(resolve, 700));
}

export function serverLog() {
  return logLines.join("");
}

// ---------------------------------------------------------------------------
// Tiny cookie jar, so the tests exercise the real httpOnly session cookie
// ---------------------------------------------------------------------------

export function createClient() {
  const jar = new Map();

  const applySetCookie = (response) => {
    const headers =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);

    for (const header of headers) {
      const [pair] = header.split(";");
      const index = pair.indexOf("=");
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === "") jar.delete(name);
      else jar.set(name, value);
    }
  };

  const request = async (pathname, init = {}) => {
    const headers = { ...(init.headers ?? {}) };
    if (jar.size > 0) {
      headers.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    if (init.json !== undefined) headers["content-type"] = "application/json";

    const response = await fetch(`${BASE_URL}${pathname}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      redirect: init.redirect ?? "manual",
    });

    applySetCookie(response);

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text();

    return { status: response.status, headers: response.headers, body };
  };

  return {
    request,
    get: (pathname, init) => request(pathname, { ...init, method: "GET" }),
    post: (pathname, json, init) => request(pathname, { ...init, method: "POST", json }),
    patch: (pathname, json, init) => request(pathname, { ...init, method: "PATCH", json }),
    cookies: jar,
  };
}
