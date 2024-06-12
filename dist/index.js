import leven from "leven";
import { useEffect, useState, useSyncExternalStore } from "react";
import { languages, multilingualHellos } from "./multilingual-hellos";
/** @returns The language requested by the browser's built-in translation UI */
export const useLanguage = () => useSyncExternalStore(subscribeLanguage, getLanguageSnapshot);
/** @returns Text translated by the browser's built-in translation feature */
export const useTranslation = (text, lang) => {
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
        const handleMutate = () => {
            setTranslatedText(hiddenElement.textContent ?? "");
        };
        eventTarget.addEventListener("mutate", handleMutate);
        return () => {
            eventTarget.removeEventListener("mutate", handleMutate);
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
const helloElements = multilingualHellos.map((hellos) => {
    const helloElement = document.createElement("div");
    helloElement.lang = "en";
    helloElement.textContent = hellos.en;
    containerElement.append(helloElement);
    return helloElement;
});
const eventTarget = new EventTarget();
const languageObserver = new MutationObserver(() => {
    eventTarget.dispatchEvent(new CustomEvent("languagechange"));
});
languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
});
const containerObserver = new MutationObserver(() => {
    eventTarget.dispatchEvent(new CustomEvent("mutate"));
});
containerObserver.observe(containerElement, {
    subtree: true,
    childList: true,
    characterData: true,
});
let languageChanged = false;
let mutated = false;
const subscribeLanguage = (callback) => {
    const handleLanguageChange = () => {
        languageChanged = true;
        callback();
    };
    eventTarget.addEventListener("languagechange", handleLanguageChange);
    const handleMutate = () => {
        mutated = true;
        callback();
    };
    eventTarget.addEventListener("mutate", handleMutate);
    return () => {
        eventTarget.removeEventListener("languagechange", handleLanguageChange);
        eventTarget.removeEventListener("mutate", handleMutate);
    };
};
const getLanguageSnapshot = () => {
    if (languageChanged) {
        return document.documentElement.lang;
    }
    if (mutated) {
        const distances = languages
            .map((language) => [
            language,
            multilingualHellos.reduce((distance, hellos, helloIndex) => distance +
                leven(helloElements[helloIndex].textContent ?? "", hellos[language]), 0),
        ])
            .toSorted(([, aDistance], [, bDistance]) => aDistance - bDistance);
        const [nearestLanguage] = distances[0];
        return nearestLanguage;
    }
    return document.documentElement.lang;
};
