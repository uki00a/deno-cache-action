// @ts-check
import { getExecOutput } from '@actions/exec'
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
  console.info(info)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
