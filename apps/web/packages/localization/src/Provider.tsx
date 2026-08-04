import { I18nextProvider } from 'react-i18next'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import i18n from './i18n'
import translations from './config/translations.json'
import { EN, languages } from './config/languages'
import { LS_KEY, fetchLocale, getLanguageCodeFromLS } from './helpers'
import { ContextApi, Language, ProviderState, TranslateFunction } from './types'

const initialState: ProviderState = {
  isFetching: true,
  currentLanguage: EN,
}

export const languageMap = new Map<Language['locale'], Record<string, string>>()
languageMap.set(EN.locale, translations as Record<string, string>)

export const LanguageContext = createContext<ContextApi | undefined>(undefined)

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<ProviderState>(() => {
    const codeFromStorage = getLanguageCodeFromLS()
    return {
      ...initialState,
      currentLanguage: languages[codeFromStorage] || EN,
    }
  })

  useEffect(() => {
    const fetchInitialLocales = async () => {
      const codeFromStorage = getLanguageCodeFromLS()
      const lang = languages[codeFromStorage] || EN
      if (codeFromStorage !== EN.locale) {
        const currentLocale = await fetchLocale(codeFromStorage)
        if (currentLocale) {
          languageMap.set(codeFromStorage, currentLocale)
          i18n.addResourceBundle(codeFromStorage, 'translation', currentLocale, true, true)
        }
      }
      await i18n.changeLanguage(lang.locale)
      setState((prev) => ({ ...prev, isFetching: false, currentLanguage: lang }))
    }

    fetchInitialLocales()
  }, [])

  const setLanguage = useCallback(async (language: Language) => {
    if (!languageMap.has(language.locale)) {
      setState((prev) => ({ ...prev, isFetching: true }))
      const locale = await fetchLocale(language.locale)
      if (locale) {
        languageMap.set(language.locale, locale)
        i18n.addResourceBundle(language.locale, 'translation', locale, true, true)
      }
    }
    localStorage?.setItem(LS_KEY, language.locale)
    await i18n.changeLanguage(language.locale)
    setState((prev) => ({ ...prev, isFetching: false, currentLanguage: language }))
  }, [])

  const translate: TranslateFunction = useCallback((key, data) => {
    return i18n.t(key as string, data)
  }, [])

  const providerValue = useMemo(() => {
    return { ...state, setLanguage, t: translate }
  }, [state, setLanguage, translate])

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={providerValue}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  )
}
