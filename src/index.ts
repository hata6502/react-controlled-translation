import { useEffect, useState, useSyncExternalStore } from "react";

/** @returns The language requested by the browser's built-in translation UI */
export const useLanguage = () =>
  useSyncExternalStore(subscribeLanguage, getLanguageSnapshot);

/** @returns Text translated by the browser's built-in translation feature */
export const useTranslation = (text: string) => {
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    const hiddenElement = document.createElement("span");
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
