import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export async function initI18n(customResources: any, activeLang: string) {
  const resources: any = {}
  
  if (customResources) {
    Object.keys(customResources).forEach(lang => {
      resources[lang] = {
        translation: customResources[lang]
      }
    })
  }

  // Ensure fallback safety
  if (!resources['de']) resources['de'] = { translation: {} }
  if (!resources['en']) resources['en'] = { translation: {} }

  await i18n.use(initReactI18next).init({
    resources,
    lng: activeLang,
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false
    }
  })
}

export default i18n
