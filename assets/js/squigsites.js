// Squiglink Sites & Sponsorship Framework
let mode = 'prod',
    cacheBuster = 'squig';

// Opted-out sites list
let optedOut = [
    '64audio',
    'cammyfi',
    'crinacle',
    'eliseaudio',
    'hbb',
    'joycesreview',
    'kr0mka',
    'graph',
    'vsg',
    'fc-construct'
];

currentSite = getCurrentSite();
currentSiteOptedOut = optedOut.includes(currentSite) ? true : false;

function getCurrentSite() {
    let host = window.location.host,
        path = window.location.pathname;

    if (host.split('.')[1] === 'squig') {
        return host.split('.')[0];
    } else if (host.split('.')[0] === 'squig' && path.indexOf('/lab/') > -1) {
        return window.location.pathname.split('/')[2];
    } else if (host.split('.')[0] === 'squig' && path.indexOf('/lab/') === -1) {
        return 'superreview';
    } else if (window.location.host.split('.')[1] === 'hangout') {
        return 'crinacle';
    } else {
        return 'fc-construct';
    }
}

// Squiglink intro / sponsorship modal loader
function loadSquiglinkIntro() {
    let body = document.querySelector('body'),
        introScript = document.createElement('script'),
        introScriptSrc = mode === 'dev' ? 'squiglink-intro.js' : 'https://squig.link/squiglink-intro.js?' + cacheBuster;
    introScript.setAttribute('type', 'text/javascript');
    introScript.setAttribute('src', introScriptSrc);
    body.append(introScript);
}

// Shoplinks loader (affiliate/store links)
function loadShoplinks() {
    let body = document.querySelector('body'),
        shoplinksScript = document.createElement('script'),
        shoplinksScriptSrc = mode === 'dev' ? 'shoplinks.js' : 'https://squig.link/shoplinks.js?' + cacheBuster;
    shoplinksScript.setAttribute('type', 'text/javascript');
    shoplinksScript.setAttribute('src', shoplinksScriptSrc);
    body.append(shoplinksScript);
}

// Custom / Local Sponsorship Framework (for future 1P sponsorships or announcements)
function initCustomSponsor(sponsorConfig) {
    if (!sponsorConfig || !sponsorConfig.enabled) return;
    console.log("Custom sponsor initialized:", sponsorConfig.title);
}

// Framework invocation: controlled by config options (disabled by default)
if (typeof sponsorshipsEnabled !== "undefined" && sponsorshipsEnabled && !currentSiteOptedOut) {
    loadSquiglinkIntro();
}

if (typeof shoplinksEnabled !== "undefined" && shoplinksEnabled && !currentSiteOptedOut) {
    loadShoplinks();
}