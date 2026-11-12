/* Lampa: toggle just the picture with the LG remote's green key. */
(function () {
    'use strict';
    if (window.lampaBlackScreen) return;
    var root = document.documentElement;
    var active = 'lampa-lg-black-screen';
    var style = document.createElement('style');
    style.textContent =
        'html.' + active + ',html.' + active + ' body{background:#000!important;cursor:none!important;}' +
        'html.' + active + ' body > :not(#lg-black-screen){opacity:0!important;}' +
        'html.' + active + ' video{opacity:0!important;}' +
        'html.' + active + ' :fullscreen,html.' + active + ' :-webkit-full-screen{background-color:#000!important;}' +
        '#lg-black-screen{position:fixed!important;top:0!important;left:0!important;width:100%!important;height:100%!important;background:#000!important;z-index:2147483647!important;pointer-events:none!important;}';
    document.head.appendChild(style);
    var layer = document.createElement('div');
    layer.id = 'lg-black-screen';
    layer.setAttribute('aria-hidden','true');
    function restore() {
        root.classList.remove(active);
        layer.remove();
    }
    function toggle() {
        if (root.classList.contains(active)) { restore(); return; }
        var full = document.fullscreenElement || document.webkitFullscreenElement;
        (full && full.tagName !== 'VIDEO' ? full : document.body).appendChild(layer);
        root.classList.add(active);
    }
    function greenKey(e) {
        if (e.keyCode !== 404 && e.key !== 'ColorF1Green' && e.code !== 'ColorF1Green') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === 'keyup' && !e.repeat) toggle();
    }
    ['keydown','keypress','keyup'].forEach(function (type) { window.addEventListener(type,greenKey,true); });
    document.addEventListener('visibilitychange',function () { if (document.hidden) restore(); });
    window.addEventListener('pagehide',restore);
    window.lampaBlackScreen = true;
}());
