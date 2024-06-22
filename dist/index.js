import leven from "leven";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { languages, multilingualHellos } from "./multilingual-hellos";
/** @returns The language requested by the browser's built-in translation UI */
export const useLanguage = () => useSyncExternalStore(subscribeLanguage, getLanguageSnapshot);
/** @returns Text translated by the browser's built-in translation feature */
export const useTranslation = (text, lang) => {
    const id = useId();
    const [translatedText, setTranslatedText] = useState(text);
    useEffect(() => {
        const hiddenElement = document.createElement("span");
        hiddenElement.id = id;
        hiddenElement.lang = lang ?? "";
        hiddenElement.textContent = text;
        escapeMutate(() => {
            containerElement.append(hiddenElement);
        });
        const handleMutate = () => {
            const hiddenElement = document.getElementById(id);
            setTranslatedText(hiddenElement?.textContent ?? "");
        };
        eventTarget.addEventListener("mutate", handleMutate);
        return () => {
            eventTarget.removeEventListener("mutate", handleMutate);
            escapeMutate(() => {
                const hiddenElement = document.getElementById(id);
                hiddenElement?.remove();
            });
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
containerElement.style.top = "100%";
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
const escapeMutate = (mutate) => {
    containerObserver.disconnect();
    try {
        mutate();
    }
    finally {
        containerObserver.observe(containerElement, {
            subtree: true,
            childList: true,
            characterData: true,
        });
    }
};
escapeMutate(() => { });
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
