let swapSound: HTMLAudioElement

// CryptoHawking: upstream streamed this from cdn.pancakeswap.com. Spec §6.9 forbids
// requests to *.pancakeswap.* hosts and we ship no swap sound of our own, so the URL is
// configuration-driven and empty by default (getSwapSound() then returns undefined).
const swapSoundURL = process.env.NEXT_PUBLIC_SWAP_SOUND_URL || ''

export const getSwapSound = () => {
  if (!swapSoundURL) return undefined
  if (!swapSound) {
    swapSound = new Audio(swapSoundURL)
  }
  return swapSound
}
