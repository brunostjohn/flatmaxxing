import { expect, test } from "bun:test";
import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isSkillInstalledInProject } from "./detectSkillInstalled";
import { SKILL_NAME } from "./constants";

const detect = (cwd: string) =>
  isSkillInstalledInProject(cwd).pipe(
    Effect.provide(BunServices.layer),
    Effect.runPromise,
  );

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-skills-"));

test("reports not installed when no skill directory exists", async () => {
  expect(await detect(tempProject())).toBe(false);
});

test("detects a skill installed under .claude/skills", async () => {
  const root = tempProject();
  mkdirSync(join(root, ".claude/skills", SKILL_NAME), { recursive: true });

  expect(await detect(root)).toBe(true);
});

test("detects a skill installed under .agents/skills", async () => {
  const root = tempProject();
  mkdirSync(join(root, ".agents/skills", SKILL_NAME), { recursive: true });

  expect(await detect(root)).toBe(true);
});
