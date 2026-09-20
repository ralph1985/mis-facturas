import { afterEach, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = resolve(process.cwd(), "scripts/install-backup-cron.sh");
const temporaryRoots: string[] = [];

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "mis-facturas-cron-"));
  temporaryRoots.push(root);
  const binDir = join(root, "bin");
  const logDir = join(root, "logs");
  const crontabFile = join(root, "crontab");
  const crontabPath = join(binDir, "crontab");
  const nodePath = join(binDir, "node");
  const pgDumpPath = join(binDir, "pg_dump");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });
  writeFileSync(crontabFile, "MAILTO=backup@example.test\n");
  writeFileSync(
    crontabPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "-l" ]]; then
  cat "\${FAKE_CRONTAB_FILE}"
else
  cat > "\${FAKE_CRONTAB_FILE}"
fi
`,
  );
  writeFileSync(nodePath, "#!/usr/bin/env bash\nexit 0\n");
  writeFileSync(pgDumpPath, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(crontabPath, 0o700);
  chmodSync(nodePath, 0o700);
  chmodSync(pgDumpPath, 0o700);
  return {
    root,
    binDir,
    logDir,
    crontabFile,
    crontabPath,
    nodePath,
    pgDumpPath,
  };
}

function runInstaller(fixture: ReturnType<typeof createFixture>) {
  return spawnSync(scriptPath, [], {
    encoding: "utf8",
    env: {
      ...process.env,
      CRONTAB_BIN: fixture.crontabPath,
      FAKE_CRONTAB_FILE: fixture.crontabFile,
      MIS_FACTURAS_LOG_DIR: fixture.logDir,
      PATH: `${fixture.binDir}:${process.env.PATH ?? ""}`,
    },
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("install-backup-cron.sh", () => {
  it("keeps the existing crontab and installs one idempotent local backup block", () => {
    const fixture = createFixture();

    const first = runInstaller(fixture);
    const second = runInstaller(fixture);
    const crontab = readFileSync(fixture.crontabFile, "utf8");

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(crontab).toContain("MAILTO=backup@example.test");
    expect(crontab.match(/# BEGIN MIS-FACTURAS BACKUP/g) ?? []).toHaveLength(1);
    expect(crontab.match(/# END MIS-FACTURAS BACKUP/g) ?? []).toHaveLength(1);
    expect(crontab).toContain("CRON_TZ=Europe/Madrid");
    expect(crontab).toContain("30 1 * * *");
    expect(crontab).toContain("flock");
    expect(crontab).toContain("postgres-backup.cron.log");
    expect(crontab).toContain(`NODE_BIN=${fixture.nodePath}`);
    expect(crontab).toContain(`PG_DUMP_BIN=${fixture.pgDumpPath}`);
  });
});
