// @ts-check
import { readFile } from "node:fs/promises";
import { restoreCache, saveCache } from "@actions/cache";
import { getInput, getMultilineInput } from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
import { z } from "zod";

const denoInfoSchema = z.object({
  denoDir: z.string(),
  modulesCache: z.string(),
  typescriptCache: z.string(),
  registryCache: z.string(),
  originStorage: z.string(),
});

const importMapSchema = z.object({
  imports: z.record(z.string()).optional(),
});

async function main() {
  const denoExecutable = "deno";
  const { stdout } = await getExecOutput(denoExecutable, ["info", "--json"], {
    silent: true,
    failOnStdErr: true,
  });
  const info = denoInfoSchema.parse(JSON.parse(stdout.trim()));
  const entrypoints = getMultilineInput("path", { trimWhitespace: true });
  const maybeImportMap = getInput("import-map", { trimWhitespace: true });
  const key = getInput("key", { trimWhitespace: true, required: true });
  const toCache = [
    [info.modulesCache, `${key}-modules-cache`],
  ];
  for (const [path, key] of toCache) {
    await restoreCache([path], key);
  }

  for (const entrypoint of entrypoints) {
    await denoCache({
      executable: denoExecutable,
      entrypoint,
      importMap: maybeImportMap,
    });
  }

  if (maybeImportMap) {
    const importMap = importMapSchema.parse(
      JSON.parse(
        (await readFile(maybeImportMap, { encoding: "utf-8" })).trim(),
      ),
    );
    const imports = importMap.imports ?? {};
    for (const specifier of Object.keys(imports)) {
      const isPartialSpecifier = specifier.endsWith("/");
      if (isPartialSpecifier) continue;
      await denoCache({
        executable: denoExecutable,
        entrypoint: imports[specifier],
      });
    }
  }

  for (const [path, key] of toCache) {
    await saveCache([path], key);
  }
}

/**
 * @param {{ executable: string, importMap?: string, entrypoint: string }} options
 */
async function denoCache(options) {
  const { executable: denoExecutable, importMap: maybeImportMap, entrypoint } =
    options;
  const args = ["cache", "--quiet"];
  if (maybeImportMap) {
    args.push("--import-map", maybeImportMap);
  }
  args.push(entrypoint);
  await exec(denoExecutable, args, {
    failOnStdErr: true,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
