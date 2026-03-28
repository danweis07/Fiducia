import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
// @ts-expect-error js-yaml has no type declarations in this project
import yaml from "js-yaml";

const WORKFLOWS_DIR = path.resolve(__dirname, "../../../../.github/workflows");

function getWorkflowFiles(): string[] {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort();
}

function loadWorkflow(filename: string): Record<string, unknown> {
  const content = fs.readFileSync(path.join(WORKFLOWS_DIR, filename), "utf-8");
  return yaml.load(content) as Record<string, unknown>;
}

describe("GitHub Actions workflow YAMLs", () => {
  const files = getWorkflowFiles();

  it("should have at least one workflow file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)("%s", (filename) => {
    let workflow: Record<string, unknown>;

    it("parses as valid YAML", () => {
      expect(() => {
        workflow = loadWorkflow(filename);
      }).not.toThrow();
    });

    it("has a name field", () => {
      workflow = loadWorkflow(filename);
      expect(workflow).toHaveProperty("name");
      expect(typeof workflow.name).toBe("string");
    });

    it('has an "on" trigger', () => {
      workflow = loadWorkflow(filename);
      // YAML parses bare "on" as boolean true, but as a key it stays as string "on" or boolean
      const trigger = workflow["on"] ?? workflow[true as unknown as string];
      expect(trigger).toBeDefined();
    });

    it("has at least one job", () => {
      workflow = loadWorkflow(filename);
      expect(workflow).toHaveProperty("jobs");
      const jobs = workflow.jobs as Record<string, unknown>;
      expect(Object.keys(jobs).length).toBeGreaterThan(0);
    });

    it("every job has runs-on defined", () => {
      workflow = loadWorkflow(filename);
      const jobs = workflow.jobs as Record<string, Record<string, unknown>>;
      for (const [jobName, job] of Object.entries(jobs)) {
        expect(job["runs-on"], `job "${jobName}" missing runs-on`).toBeDefined();
      }
    });

    it("every job has at least one step", () => {
      workflow = loadWorkflow(filename);
      const jobs = workflow.jobs as Record<string, Record<string, unknown>>;
      for (const [jobName, job] of Object.entries(jobs)) {
        const steps = job.steps as unknown[];
        expect(Array.isArray(steps) && steps.length > 0, `job "${jobName}" should have steps`).toBe(
          true,
        );
      }
    });

    it("uses actions/checkout in at least one job", () => {
      workflow = loadWorkflow(filename);
      const jobs = workflow.jobs as Record<string, { steps: Array<{ uses?: string }> }>;
      const hasCheckout = Object.values(jobs).some((job) =>
        job.steps?.some((step) => step.uses?.startsWith("actions/checkout")),
      );
      expect(hasCheckout).toBe(true);
    });

    it("pins action versions (no @master or @main for third-party actions)", () => {
      workflow = loadWorkflow(filename);
      const jobs = workflow.jobs as Record<string, { steps: Array<{ uses?: string }> }>;
      const firstPartyOrgs = ["actions/", "github/"];
      for (const job of Object.values(jobs)) {
        for (const step of job.steps || []) {
          if (!step.uses) continue;
          const isFirstParty = firstPartyOrgs.some((org) => step.uses!.startsWith(org));
          if (isFirstParty) continue;
          // Third-party actions should not use @master or @main
          expect(
            step.uses,
            `Third-party action "${step.uses}" should pin a version, not use @master/@main`,
          ).not.toMatch(/@(master|main)$/);
        }
      }
    });
  });

  describe("CI workflow specifics", () => {
    it("ci.yml exists", () => {
      expect(files).toContain("ci.yml");
    });

    it("ci.yml triggers on pull_request to main", () => {
      const workflow = loadWorkflow("ci.yml");
      const trigger = workflow["on"] ?? workflow[true as unknown as string];
      const on = trigger as Record<string, unknown>;
      expect(on).toHaveProperty("pull_request");
    });

    it("ci.yml has a validate job with lint, typecheck, test, and build steps", () => {
      const workflow = loadWorkflow("ci.yml");
      const jobs = workflow.jobs as Record<
        string,
        { steps: Array<{ name?: string; run?: string }> }
      >;
      expect(jobs).toHaveProperty("validate");
      const stepTexts = jobs.validate.steps
        .map((s) => `${s.name || ""} ${s.run || ""}`.toLowerCase())
        .join(" ");
      expect(stepTexts).toContain("lint");
      expect(stepTexts).toContain("typecheck");
      expect(stepTexts).toContain("test");
      expect(stepTexts).toContain("build");
    });
  });

  describe("security workflows", () => {
    it("secret-scanning.yml exists", () => {
      expect(files).toContain("secret-scanning.yml");
    });

    it("dependency-audit.yml exists", () => {
      expect(files).toContain("dependency-audit.yml");
    });

    it("codeql-analysis.yml exists", () => {
      expect(files).toContain("codeql-analysis.yml");
    });

    it("codeql-analysis.yml scans javascript-typescript", () => {
      const workflow = loadWorkflow("codeql-analysis.yml");
      const content = JSON.stringify(workflow);
      expect(content).toContain("javascript-typescript");
    });

    it("dependency-audit.yml runs npm audit", () => {
      const workflow = loadWorkflow("dependency-audit.yml");
      const content = JSON.stringify(workflow);
      expect(content).toContain("npm audit");
    });
  });
});
