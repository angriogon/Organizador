'use strict';

/* OPI Platform · v6.0 RC1
   Centralized capability detection for iOS web/PWA and Windows PWA. */
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1); }
function isMobile() { return matchMedia('(max-width: 760px)').matches; }
function isStandaloneApp(){ return matchMedia('(display-mode: standalone)').matches || navigator.standalone===true; }
function isWindowsPWA(){ return isStandaloneApp() && !isIOS() && /Windows/i.test(navigator.userAgent||''); }
function reduceMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function platformSnapshot(){
  return Object.freeze({
    ios: isIOS(),
    mobile: isMobile(),
    standalone: isStandaloneApp(),
    windowsPwa: isWindowsPWA(),
    reducedMotion: reduceMotion(),
    online: navigator.onLine
  });
}
