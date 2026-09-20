import { afterEach, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = resolve(process.cwd(), "scripts/backup-postgres.sh");
const databaseUrl = "postgresql://user:pass@example.test:5432/db";
const temporaryRoots: string[] = [];

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "mis-facturas-backup-"));
  temporaryRoots.push(root);
  const binDir = join(root, "bin");
  const backupDir = join(root, "backups");
  const logDir = join(root, "logs");
  const pgDumpPath = join(binDir, "pg_dump");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });
  writeFileSync(
    pgDumpPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${FAKE_PG_DUMP_FAIL:-0}" == "1" ]]; then
  exit 1
fi
output=""
while (($# > 0)); do
  case "$1" in
    --file=*) output="\${1#--file=}" ;;
    --file) shift; output="$1" ;;
  esac
  shift
done
[[ -n "$output" ]]
printf '%s\\n' 'fake postgres custom archive' > "$output"
`,
  );
  chmodSync(pgDumpPath, 0o700);
  return { root, binDir, backupDir, logDir, pgDumpPath };
}

function runBackup(
  fixture: ReturnType<typeof createFixture>,
  extraEnv: Record<string, string> = {},
) {
  return spawnSync(scriptPath, [], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      MIS_FACTURAS_BACKUP_DIR: fixture.backupDir,
      MIS_FACTURAS_LOG_DIR: fixture.logDir,
      PG_DUMP_BIN: fixture.pgDumpPath,
      PATH: `${fixture.binDir}:${process.env.PATH ?? ""}`,
      ...extraEnv,
    },
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("backup-postgres.sh", () => {
  it("creates one protected dump, logs the success contract, and removes credentials", () => {
    const fixture = createFixture();

    const result = runBackup(fixture);

    expect(result.status).toBe(0);
    const files = readdirSync(fixture.backupDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^mis-facturas-\d{8}T\d{6}Z\.dump$/);
    expect(statSync(join(fixture.backupDir, files[0])).mode & 0o777).toBe(
      0o600,
    );
    expect(
      files.some(
        (file) => file.startsWith(".backup.") || file.startsWith(".pgpass."),
      ),
    ).toBe(false);

    const log = readFileSync(
      join(fixture.logDir, "postgres-backup.log"),
      "utf8",
    );
    expect(log).toContain("OK: backup SQL creado");
    expect(result.stdout).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T[^\]]+\] OK: backup SQL creado/m,
    );
    expect(`${result.stdout}${result.stderr}${log}`).not.toContain(databaseUrl);
  });

  it("does not publish a dump after pg_dump fails and logs a redacted error", () => {
    const fixture = createFixture();

    const result = runBackup(fixture, { FAKE_PG_DUMP_FAIL: "1" });

    expect(result.status).not.toBe(0);
    expect(readdirSync(fixture.backupDir)).toEqual([]);
    expect(readdirSync(fixture.logDir)).toContain("postgres-backup.log");
    expect(
      readdirSync(fixture.backupDir).some(
        (file) => file.startsWith(".backup.") || file.startsWith(".pgpass."),
      ),
    ).toBe(false);
    const log = readFileSync(
      join(fixture.logDir, "postgres-backup.log"),
      "utf8",
    );
    expect(log).toContain("ERROR:");
    expect(`${result.stdout}${result.stderr}${log}`).not.toContain(databaseUrl);
  });

  it("removes only old matching dumps when retention is zero", () => {
    const fixture = createFixture();
    const oldDump = join(fixture.backupDir, "mis-facturas-old.dump");
    writeFileSync(oldDump, "old backup");
    const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    utimesSync(oldDump, oldDate, oldDate);

    const result = runBackup(fixture, {
      MIS_FACTURAS_BACKUP_RETENTION_DAYS: "0",
    });

    expect(result.status).toBe(0);
    const files = readdirSync(fixture.backupDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^mis-facturas-\d{8}T\d{6}Z\.dump$/);
  });
});
