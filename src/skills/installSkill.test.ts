import { expect, test } from "bun:test";
import { buildSkillInstallArgs } from "./installSkill";
import { SKILL_SOURCE } from "./constants";

test("project install args target both agent dirs and copy files", () => {
  const args = buildSkillInstallArgs({ global: false });

  expect(args).toEqual([
    "-y",
    "skills",
    "add",
    SKILL_SOURCE,
    "-a",
    "claude-code",
    "universal",
    "-y",
    "--copy",
  ]);
  expect(args).not.toContain("-g");
});

test("global install args append -g", () => {
  expect(buildSkillInstallArgs({ global: true })).toContain("-g");
});
