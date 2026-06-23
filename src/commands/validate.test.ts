import { expect, test } from "bun:test";

const runHelp = async (...args: string[]) => {
  const proc = Bun.spawn(["bun", "src/index.ts", ...args], {
    cwd: process.cwd(),
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
};

test("validate subcommand help exposes project and validation flags", async () => {
  const { stdout, stderr, exitCode } = await runHelp("validate", "--help");

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("flatmaxx validate");
  expect(stdout).toContain("--path-to-kicad");
  expect(stdout).toContain("--config");
  expect(stdout).toContain("--fix");
});
