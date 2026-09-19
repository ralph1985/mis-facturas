#!/usr/bin/env tsx

import { createAccessCodeHash } from "../src/lib/auth";

function readPipedInput(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      resolve(
        input
          .split(/\r?\n/)
          .filter(
            (line, index, lines) => index < lines.length - 1 || line.length > 0,
          ),
      );
    });
    process.stdin.on("error", reject);
  });
}

function readHidden(prompt: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("interactive input is unavailable"));
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      stdin.setRawMode?.(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) {
          finish(new Error("cancelled"));
          return;
        }
        if (byte === 13 || byte === 10) {
          finish();
          return;
        }
        if (byte === 127 || byte === 8) {
          value = value.slice(0, -1);
        } else if (byte >= 32) {
          value += String.fromCharCode(byte);
        }
      }
    };

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  if (process.argv.slice(2).length > 0) {
    throw new Error("Do not pass the access code as a command-line argument.");
  }

  let values: string[];
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const first = await readHidden("Access code: ");
    const second = await readHidden("Repeat access code: ");
    values = [first, second];
  } else {
    values = await readPipedInput();
  }

  if (values.length < 2 || values[0] !== values[1] || values[0].length === 0) {
    throw new Error("Provide the same non-empty access code twice.");
  }

  const hash = await createAccessCodeHash(values[0]);
  process.stdout.write(`${hash}\n`);
}

void main().catch(() => {
  process.stderr.write(
    "Could not generate the access-code hash. No access code was printed.\n",
  );
  process.exitCode = 1;
});
