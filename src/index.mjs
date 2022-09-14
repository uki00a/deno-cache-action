// @ts-check
import { restoreCache, saveCache } from '@actions/cache'
import { getInput, getMultilineInput } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { z } from 'zod'

const denoInfo = z.object({
  denoDir: z.string(),
  modulesCache: z.string(),
  typescriptCache: z.string(),
  registryCache: z.string(),
  originStorage: z.string()
})

async function main() {
  const denoExecutable = 'deno'
  const { stdout } = await getExecOutput(denoExecutable, ['info', '--json'], {
    silent: true,
    failOnStdErr: true
  })
  const info = denoInfo.parse(JSON.parse(stdout.trim()))
  const entrypoints = getMultilineInput('path', { trimWhitespace: true })
  const key = getInput('key', { trimWhitespace: true, required: true })
  const toCache = [
    [info.modulesCache, `${key}-modules-cache`]
  ]
  for (const [path, key] of toCache) {
    await restoreCache([path], key)
  }

  for (const entrypoint of entrypoints) {
    await exec(denoExecutable, ['cache', entrypoint], { failOnStdErr: true })
  }

  for (const [path, key] of toCache) {
    await saveCache([path], key)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
