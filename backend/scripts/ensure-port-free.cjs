#!/usr/bin/env node
const { execSync } = require('node:child_process');

const targetPort = process.env.PORT ?? '3000';

const collectPids = () => {
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${targetPort}`, {
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      })
        .toString()
        .trim();

      if (!output) {
        return [];
      }

      const pids = new Set();
      for (const line of output.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid) {
          pids.add(pid);
        }
      }
      return Array.from(pids);
    } catch (error) {
      return [];
    }
  }

  try {
    const output = execSync(`lsof -ti:${targetPort}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    if (!output) {
      return [];
    }

    return output.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    return [];
  }
};

const killProcesses = (pids) => {
  let terminated = 0;
  for (const pid of pids) {
    const numericPid = Number.parseInt(pid, 10);
    if (Number.isNaN(numericPid)) {
      continue;
    }
    try {
      process.kill(numericPid, 'SIGTERM');
      terminated += 1;
    } catch (error) {
      // process may already have exited or we lack permissions; ignore
    }
  }
  return terminated;
};

const pids = collectPids();

if (pids.length > 0) {
  const terminated = killProcesses(pids);
  if (terminated > 0) {
    console.log(`Freed port ${targetPort} by terminating ${terminated} process(es).`);
  }
}

process.exit(0);
