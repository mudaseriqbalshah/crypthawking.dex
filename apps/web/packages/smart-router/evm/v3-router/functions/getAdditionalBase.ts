import { ChainId } from '@pancakeswap/chains'
import { Token } from '@pancakeswap/swap-sdk-core'
import memoize from '@pancakeswap/utils/memoize'
import { Address, checksumAddress } from 'viem'
import { ADDITIONAL_BASES, ADDITIONAL_BASES_TABLE } from '../../constants'

const fetchConfig = memoize(
  async () => {
    // CryptoHawking: no CMS. Upstream fetched this from proofs.pancakeswap.com;
    // with NEXT_PUBLIC_PROOF_API unset we fall straight back to the static table.
    const proofApi = process.env.NEXT_PUBLIC_PROOF_API
    if (!proofApi) return ADDITIONAL_BASES
    const url = `${proofApi}/cms-config/routing-base-config.json`
    try {
      const response = await fetch(url)
      const data: {
        [chainId: string]: {
          [tokenAddress: Address]: {
            address: Address
            symbol: string
            decimals: number
          }[]
        }
      } = await response.json()

      const table: ADDITIONAL_BASES_TABLE = {}
      Object.keys(data).forEach((key) => {
        const chainId = Number(key) as ChainId
        table[chainId] = {}
        for (const [address, list] of Object.entries(data[key])) {
          const src = checksumAddress(address as Address)
          const to = list.map((item) => {
            return new Token(chainId, checksumAddress(item.address), item.decimals, item.symbol, '')
          })
          table[chainId][src] = to
        }
      })
      return table
    } catch {
      return ADDITIONAL_BASES
    }
  },
  () => {
    // Memoize for 1 minute
    return Math.floor(Date.now() / 60_1000)
  },
)

type TokenBases = {
  [tokenAddress: Address]: Token[]
}

export async function getAdditionalBases(chainId?: ChainId): Promise<TokenBases> {
  if (!chainId) {
    return {}
  }
  const table = await fetchConfig()
  return table[chainId] ?? {}
}
