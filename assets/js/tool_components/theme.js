// Theme switcher (default / dark / contrast)
// Persists choice in localStorage as `theme-pref`.
function themeChooser(command) {
    let docBody = document.querySelector("body"),
        themeButton = document.querySelector("button#theme");

    if (!themeButton) return;
    let themeCurrent = themeButton.getAttribute("current-theme") || "theme-default";

    // If a change event, cycle through states
    if (command === "change") {
        if (themeCurrent === "theme-dark") {
            localStorage.setItem("theme-pref", "theme-contrast");
        } else if (themeCurrent === "theme-contrast") {
            localStorage.setItem("theme-pref", "theme-default");
        } else {
            localStorage.setItem("theme-pref", "theme-dark");
        }
    }

    let themePref = localStorage.getItem("theme-pref") || "theme-default";

    // Apply state
    if (themePref === "theme-dark") {
        docBody.classList.remove("theme-default", "theme-contrast");
        docBody.classList.add("theme-dark");
        themeButton.textContent = "contrast mode";
    } else if (themePref === "theme-contrast") {
        docBody.classList.remove("theme-default", "theme-dark");
        docBody.classList.add("theme-contrast");
        themeButton.textContent = "default mode";
    } else {
        docBody.classList.remove("theme-dark", "theme-contrast");
        docBody.classList.add("theme-default");
        themeButton.textContent = "dark mode";
    }

    themeButton.setAttribute("current-theme", themePref);
}

if (typeof themingEnabled !== "undefined" && themingEnabled) {
    let themeButton = document.createElement("button"),
        miscTools = document.querySelector("div.miscTools");

    themeButton.setAttribute("id", "theme");
    themeButton.textContent = "dark mode";
    themeButton.setAttribute("current-theme", "theme-default");
    themeButton.addEventListener("click", function () {
        themeChooser("change");
    });

    if (miscTools) {
        miscTools.append(themeButton);
    }
    themeChooser();
}
