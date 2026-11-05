// Google Tag Manager / Analytics Helper
let analyticsSite = "Fc-Construct",
    analyticsGtmId = "",
    logAnalytics = false;

function setupGraphAnalytics() {
    if (!analyticsGtmId) return;
    const gtmScriptContent = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','"+ analyticsGtmId +"');";
    const pageHead = document.querySelector("head"),
          gtmScript = document.createElement("script");
    gtmScript.textContent = gtmScriptContent;
    pageHead.prepend(gtmScript);
}
setupGraphAnalytics();

window.dataLayer = window.dataLayer || [];

function pushEventTag(eventName, targetWindow, otherData) {
    if (!analyticsGtmId) return;
    window.dataLayer.push({
        "event": eventName,
        "site": analyticsSite,
        "other": otherData
    });
}

function pushPhoneTag(eventName, phone, trigger) {
    if (!analyticsGtmId) return;
    let phoneBrand = phone.brand ? phone.brand : "",
        phoneModel = phone.model ? phone.model : "",
        phoneVariant = phone.variant ? phone.variant : "";
    window.dataLayer.push({
        "event": eventName,
        "trigger": trigger,
        "site": analyticsSite,
        "brand": phoneBrand,
        "phone": phoneBrand + " " + phoneModel,
        "variant": phoneVariant
    });
}