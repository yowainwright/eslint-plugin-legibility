import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const fileCount = 100;
const workloadRoot = join(process.cwd(), "workload");
const source = [
  "export function calculateTotal(first, second) {",
  "  return first + second;",
  "}",
].join("\n");

function createWorkloadFile(index: number): void {
  const directoryName = `case-${String(index).padStart(3, "0")}`;
  const directory = join(workloadRoot, directoryName);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "index.ts"), `${source}\n`);
}

Array.from({ length: fileCount }, (_, index) => index).forEach(createWorkloadFile);
