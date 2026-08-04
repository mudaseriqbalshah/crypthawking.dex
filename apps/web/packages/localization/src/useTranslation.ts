import { useCallback, useContext } from 'react'
import { useTranslation as useI18nTranslation } from 'react-i18next'
import { LanguageContext, languageMap } from './Provider'
import { ContextData, TranslateFunction } from './types'
import full from './config/translations.json'

const cache = new Map<string, string>()

const useTranslation = () => {
  const languageContext = useContext(LanguageContext)
  const { i18n } = useI18nTranslation()

  if (languageContext === undefined) {
    throw new Error('Language context is undefined')
  }
  const translate: TranslateFunction = useCallback(
    (key, data) => {
      const lang = languageContext?.currentLanguage.locale
      const cacheKey = `${lang}:${key}-${JSON.stringify(data)}`
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey) || ''
      }
      function getTranslationValue() {
        const value = (full as Record<string, string>)[key] || ''
        if (!lang) {
          return value
        }
        const data = languageMap.get(lang)
        if (!data) {
          return value
        }
        return data[key] || value
      }

      const value = getTranslationValue()

      const interpolated = value.replace(/%([a-zA-Z0-9-_]+)%/g, (match, p1) => {
        const replacement = data?.[p1] || ''
        return (replacement === undefined ? match : replacement) as string
      })
      cache.set(cacheKey, interpolated)
      return interpolated
    },
    [languageContext.currentLanguage.locale, i18n],
  )

  return { ...languageContext, t: translate }
}

export default useTranslation
