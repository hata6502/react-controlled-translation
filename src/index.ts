import leven from "leven";
import { useEffect, useState, useSyncExternalStore } from "react";

import { multilingualHellos } from "./multilingual-hellos";

/** @returns The language requested by the browser's built-in translation UI */
export const useLanguage = () =>
  useSyncExternalStore(subscribeLanguage, getLanguageSnapshot);

/** @returns Text translated by the browser's built-in translation feature */
export const useTranslation = (text: string, lang?: string) => {
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    // Don't use <span>. Because Google Translate remove it with <font>.
    // https://gyazo.com/4f62aaae58146265e4b9d114cf526dcc
    // By using <div>, it's not removed. And <font> is created in it.
    // https://gyazo.com/8996c9ecbed91c8d39743eb88708e335
    const hiddenElement = document.createElement("div");
    hiddenElement.lang = lang ?? "";
    hiddenElement.textContent = text;
    containerElement.append(hiddenElement);

    const handleTranslation = () => {
      translationObserver.disconnect();
      try {
        setTranslatedText(hiddenElement.textContent ?? "");
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

const containerElement = document.createElement("div");
containerElement.classList.add("react-controlled-translation");
// Don't use `display: none`. Because Safari doesn't translate hidden elements.
// Don't use `overflow: hidden`. Because innerText is empty in Safari.
// Don't use `font-size: 0`. Because Edge marks it as `_msthidden="1"`.
containerElement.style.visibility = "hidden";
containerElement.style.position = "fixed";
containerElement.style.left = "-1e+09px";
document.body.append(containerElement);

const helloElement = document.createElement("div");
helloElement.lang = "en";
helloElement.textContent = "Hello";
containerElement.append(helloElement);

const languageEventTarget = new EventTarget();
const languageObserver = new MutationObserver(() => {
  languageEventTarget.dispatchEvent(new CustomEvent("mutation"));
});
languageObserver.observe(helloElement, {
  subtree: true,
  childList: true,
  characterData: true,
});

const subscribeLanguage = (callback: () => void) => {
  languageEventTarget.addEventListener("mutation", callback);
  return () => {
    languageEventTarget.removeEventListener("mutation", callback);
  };
};

const getLanguageSnapshot = () => {
  const translatedText = helloElement.textContent ?? "";
  const distances = Object.entries(multilingualHellos)
    .map(([lang, hello]) => [lang, leven(translatedText, hello)] as const)
    .toSorted(([, aDistance], [, bDistance]) => aDistance - bDistance);
  const [nearestLanguage] = distances[0];
  return nearestLanguage;
};
