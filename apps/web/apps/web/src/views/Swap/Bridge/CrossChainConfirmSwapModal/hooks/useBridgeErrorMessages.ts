import { useTranslation } from '@pancakeswap/localization'
import { useMemo } from 'react'

export enum CrossChainAPIErrorCode {
  // 4000 - 4010
  NOT_FOUND = 'CCA-4000',
  INVALID_INPUT = 'CCA-4001',
  MISSING_MANDATORY_FIELDS = 'CCA-4004',
  INVALID_COMMAND = 'CCA-4005',
  INVALID_TOKEN_INFO = 'CCA-4006',
  RECORD_NOT_FOUND = 'CCA-4008',
  TRANSACTION_NOT_FOUND_OR_REVERTED = 'CCA-4009',
  INVALID_CHAIN_NAME = 'CCA-4010',

  // 5000 - 5013
  SERVER_ERROR = 'CCA-5000',
  CHAIN_NOT_FOUND = 'CCA-5005',
  EMPTY_CACHE = 'CCA-5010',
  DOWNSTREAM_SERVER_ERROR = 'CCA-5011',
  POST_BRIDGE_COMMAND_FAILED = 'CCA-5012',
  PERMIT2_NOT_FOUND = 'CCA-5013',
}

export const useBridgeErrorMessages = () => {
  const { t } = useTranslation()

  return useMemo(
    () => ({
      [CrossChainAPIErrorCode.INVALID_INPUT]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.NOT_FOUND]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.SERVER_ERROR]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.RECORD_NOT_FOUND]: t('Requested transaction details not found.'),
      [CrossChainAPIErrorCode.TRANSACTION_NOT_FOUND_OR_REVERTED]: t('Requested transaction details not found.'),
      [CrossChainAPIErrorCode.INVALID_CHAIN_NAME]: t('Unsupported chain. Try selecting another network.'),

      [CrossChainAPIErrorCode.CHAIN_NOT_FOUND]: t('Unsupported chain. Try selecting another network.'),
      [CrossChainAPIErrorCode.MISSING_MANDATORY_FIELDS]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.INVALID_COMMAND]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.INVALID_TOKEN_INFO]: t("Couldn't retrieve token info. Please try again!"),
      [CrossChainAPIErrorCode.EMPTY_CACHE]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.DOWNSTREAM_SERVER_ERROR]: t('Unexpected error. Please try again!'),
      [CrossChainAPIErrorCode.POST_BRIDGE_COMMAND_FAILED]: t(
        'Transaction failed on destination chain. Please check your transaction status for more details',
      ),
      [CrossChainAPIErrorCode.PERMIT2_NOT_FOUND]: t('Unexpected error. Please try again!'),
    }),
    [t],
  )
}
