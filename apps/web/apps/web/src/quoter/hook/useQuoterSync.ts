import { useDebounce } from '@orbs-network/twap-ui/dist/hooks'
import { TradeType } from '@pancakeswap/swap-sdk-core'
import tryParseAmount from '@pancakeswap/utils/tryParseAmount'
import { useCurrency } from 'hooks/Tokens'
import { useInputBasedAutoSlippageWithFallback } from 'hooks/useAutoSlippageWithFallback'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { activeQuoteHashAtom } from 'quoter/atom/abortControlAtoms'
import { bestCrossChainQuoteAtom } from 'quoter/atom/bestCrossChainAtom'
import { baseAllTypeBestTradeAtom, pauseAtom, userTypingAtom } from 'quoter/atom/bestTradeUISyncAtom'
import { updatePlaceholderAtom } from 'quoter/atom/placeholderAtom'
import { QUOTE_REVALIDATE_TIME } from 'quoter/consts'
import { useEffect } from 'react'
import { useCurrentBlock } from 'state/block/hooks'
import { Field } from 'state/swap/actions'
import { useSwapState } from 'state/swap/hooks'
import { useAccount } from 'wagmi'
import { quoteNonceAtom } from '../atom/revalidateAtom'
import { createQuoteQuery } from '../utils/createQuoteQuery'
import { useQuoteContext } from './QuoteContext'
import { multicallGasLimitAtom } from './useMulticallGasLimit'

export const useQuoterSync = () => {
  const swapState = useSwapState()
  const debouncedSwapState = useDebounce(swapState, 300)
  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId, chainId: inputCurrencyChainId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId, chainId: outputCurrencyChainId },
  } = debouncedSwapState
  const { address } = useAccount()
  const inputCurrency = useCurrency(inputCurrencyId, inputCurrencyChainId)
  const outputCurrency = useCurrency(outputCurrencyId, outputCurrencyChainId)
  const isExactIn = independentField === Field.INPUT
  const independentCurrency = isExactIn ? inputCurrency : outputCurrency
  const dependentCurrency = isExactIn ? outputCurrency : inputCurrency
  const tradeType = isExactIn ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT
  const amount = tryParseAmount(typedValue, independentCurrency ?? undefined)
  const {
    singleHopOnly,
    split,
    v2Swap,
    v3Swap,
    infinitySwap,
    stableSwap,
    maxHops,
    chainId,
    speedQuoteEnabled,
    xEnabled,
  } = useQuoteContext()
  const setTrade = useSetAtom(baseAllTypeBestTradeAtom)
  const setTyping = useSetAtom(userTypingAtom)
  const [paused, pauseQuote] = useAtom(pauseAtom)

  const { slippageTolerance: slippage } = useInputBasedAutoSlippageWithFallback(amount)
  const blockNumber = useCurrentBlock()
  const destinationBlockNumber = useCurrentBlock(outputCurrencyChainId)
  const setActiveQuoteHash = useSetAtom(activeQuoteHashAtom)
  const [nonce, setNonce] = useAtom(quoteNonceAtom)
  const gasLimit = useAtomValue(multicallGasLimitAtom(chainId))
  const gasLimitDestinationChain = useAtomValue(multicallGasLimitAtom(outputCurrencyChainId))

  const quoteQueryInit = {
    amount,
    currency: dependentCurrency,
    baseCurrency: independentCurrency,
    tradeType,
    maxHops: singleHopOnly ? 1 : maxHops,
    maxSplits: split ? undefined : 0,
    v2Swap,
    v3Swap,
    infinitySwap: Boolean(infinitySwap), // chain support is check inner
    stableSwap,
    speedQuoteEnabled,
    xEnabled,
    slippage,
    address,
    blockNumber,
    destinationBlockNumber,
    gasLimitDestinationChain,
    nonce,
    for: 'main',
    gasLimit,
  }
  const isCrossChain = inputCurrencyChainId !== outputCurrencyChainId

  const quoteQuery = createQuoteQuery(quoteQueryInit)
  const setPlaceholder = useSetAtom(updatePlaceholderAtom)

  useEffect(() => {
    setActiveQuoteHash(quoteQuery.hash)
  }, [quoteQuery.hash])

  useEffect(() => {
    setTyping(true)
  }, [typedValue, setTyping])

  const quoteResult = useAtomValue(bestCrossChainQuoteAtom(quoteQuery))

  useEffect(() => {
    let t = 0
    const revalidateTime = isCrossChain ? QUOTE_REVALIDATE_TIME * 2 : QUOTE_REVALIDATE_TIME
    const interval = setInterval(() => {
      const outdated = Date.now() - quoteQuery.createTime! > revalidateTime
      if (paused || (!outdated && quoteResult.loading)) {
        return
      }
      if (t > 0) {
        if (t % revalidateTime === 0) {
          setNonce((v) => v + 1)
        }
      }
      t++
    }, 1000)

    return () => {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteQuery.hash, paused, quoteResult.loading, isCrossChain])

  useEffect(() => {
    if (quoteResult.isJust() && !quoteResult.hasFlag('placeholder')) {
      const placeholderHash = quoteResult.getExtra('placeholderHash') as string
      setPlaceholder(placeholderHash, quoteResult.unwrap())
    }

    if (paused) {
      return
    }

    const order = quoteResult.unwrapOr(undefined)

    setTrade({
      bestOrder: order,
      tradeLoaded: !quoteResult.isPending(),
      tradeError: quoteResult.error,
      refreshDisabled: false,
      refreshOrder: () => {
        setNonce((v) => v + 1)
      },
      refreshTrade: () => {
        setNonce((v) => v + 1)
      },
      pauseQuoting: () => {
        pauseQuote(true)
      },
      resumeQuoting: () => {
        pauseQuote(false)
      },
    })
    setTyping(false)
  }, [quoteResult.value, quoteResult.loading, quoteResult.error, pauseQuote, setTrade, setTyping, setNonce, paused])
}
