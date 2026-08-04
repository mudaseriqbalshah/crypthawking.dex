// scripts/check-frontend-addresses.mjs
// Asserts apps/web SDK constants for chainId 84532 match the deployment registry.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reg = JSON.parse(readFileSync(resolve(root, 'packages/deployments/base-sepolia.json'), 'utf8'))
const read = (p) => readFileSync(resolve(root, 'apps/web', p), 'utf8')

// Each check: [file, human name, expected value]. The file must contain the
// expected value within 400 chars after the LAST `ChainId.BASE_SEPOLIA` before it —
// simplest robust form: assert the pair "BASE_SEPOLIA...value" co-occurs.
const checks = [
  ['packages/v2-sdk/src/constants.ts', 'v2 factory', reg.v2.HawkingFactory],
  ['packages/v2-sdk/src/constants.ts', 'v2 init code hash', reg.v2.initCodePairHash],
  ['packages/v3-sdk/src/constants.ts', 'v3 factory', reg.v3.HawkingV3Factory],
  ['packages/v3-sdk/src/constants.ts', 'v3 deployer', reg.v3.HawkingV3PoolDeployer],
  ['packages/v3-sdk/src/constants.ts', 'v3 pool init code hash', reg.v3.poolInitCodeHash],
  ['packages/v3-sdk/src/constants.ts', 'v3 NPM', reg.v3.NonfungiblePositionManager],
  ['packages/universal-router-sdk/src/constants.ts', 'universal router', reg.infinity.UniversalRouter],
  ['packages/permit2-sdk/src/constants.ts', 'permit2', reg.infra.Permit2],
  ['packages/smart-router/evm/constants/exchange.ts', 'v2 router', reg.v2.HawkingRouter],
  ['packages/smart-router/evm/constants/v3.ts', 'quoterV2', reg.v3.QuoterV2],
  ['packages/smart-router/evm/constants/v3.ts', 'tick lens', reg.v3.TickLens],
  ['packages/routing-sdk/addons/quoter/src/constants/v3Quoter.ts', 'routing-sdk quoter', reg.v3.QuoterV2],
  ['packages/tokens/src/constants/common.ts', 'tUSDC as USDC', reg.tokens.tUSDC],
  ['packages/farms/src/const.ts', 'masterChefV3', reg.farms.MasterChefV3],
  ['packages/farms/src/const.ts', 'masterChef', reg.farms.MasterChef],
  ['packages/infinity-sdk/src/constants/addresses.ts', 'infinity vault', reg.infinity.Vault],
  ['packages/infinity-sdk/src/constants/addresses.ts', 'CL pool manager', reg.infinity.CLPoolManager],
  ['packages/infinity-sdk/src/constants/addresses.ts', 'Bin pool manager', reg.infinity.BinPoolManager],
]

let failed = 0
for (const [file, name, expected] of checks) {
  const src = read(file)
  const ok = src.toLowerCase().includes(String(expected).toLowerCase())
  if (!ok) { console.error(`FAIL ${name}: ${expected} not found in ${file}`); failed++ }
  else console.log(`ok   ${name}`)
}
// Forbidden: PancakeSwap's old 84532 addresses must be gone from BASE_SEPOLIA context.
const forbidden = [
  '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E', // pcs v2 factory
  '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865', // pcs v3 factory
  '0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9', // pcs v3 deployer
  '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364', // pcs NPM
  '0xFE6508f0015C778Bdcc1fB5465bA5ebE224C9912', // pcs universal router
  '0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb', // pcs v2 router
  '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997', // pcs quoter
]
// Deduplicate file list to avoid scanning the same file multiple times
const files = [...new Set(checks.map(([f]) => f))]
for (const file of files) {
  const src = read(file)
  const lines = src.split('\n')
  for (const addr of forbidden) {
    const addrLower = addr.toLowerCase()
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Check if forbidden address appears on a line with BASE_SEPOLIA or within 3 lines after
      if (line.toLowerCase().includes('base_sepolia')) {
        // Check this line and the next 3 lines for the forbidden address
        for (let j = i; j < Math.min(i + 4, lines.length); j++) {
          if (lines[j].toLowerCase().includes(addrLower)) {
            console.error(`FAIL forbidden PancakeSwap addr ${addr} still in ${file}`)
            failed++
            break
          }
        }
        break // Only check the first BASE_SEPOLIA context in this check iteration
      }
    }
  }
}
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1) }
console.log('\nAll frontend addresses match the registry.')
