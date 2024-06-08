import { useEffect, useState, useSyncExternalStore } from "react";

/** @returns The language requested by the browser's built-in translation UI */
export const useLanguage = () =>
  useSyncExternalStore(subscribeLanguage, getLanguageSnapshot);

/** @returns Text translated by the browser's built-in translation feature */
export const useTranslation = (text: string) => {
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    // Don't use <span>. Because Google Translate remove it with <font>.
    // https://gyazo.com/4f62aaae58146265e4b9d114cf526dcc
    // By using <div>, it's not removed. And <font> is created in it.
    // https://gyazo.com/8996c9ecbed91c8d39743eb88708e335
    const hiddenElement = document.createElement("div");
    hiddenElement.innerText = text;
    containerElement.append(hiddenElement);

    const handleTranslation = () => {
      translationObserver.disconnect();
      try {
        setTranslatedText(hiddenElement.innerText);
      } finally {
        translationObserver.observe(hiddenElement, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      }
    };
    const translationObserver = new MutationObserver(handleTranslation);
    handleTranslation();

    return () => {
      translationObserver.disconnect();
      hiddenElement.remove();
    };
  }, [text]);

  return translatedText;
};

const subscribeLanguage = (callback: () => void) => {
  const languageObserver = new MutationObserver(callback);
  languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });

  return () => {
    languageObserver.disconnect();
  };
};
const getLanguageSnapshot = () => document.documentElement.lang;

const containerElement = document.createElement("div");
containerElement.classList.add("react-controlled-translation");
containerElement.style.display = "none";
document.body.append(containerElement);
