/* Green key toggles a black screen in Lampa's built-in player and catalogue. */
(function () {
    'use strict';
    if (window.lampaBlackPause) return;
    var layer = document.createElement('div');
    layer.setAttribute('aria-label', 'Чёрный экран');
    layer.style.cssText = 'position:fixed!important;inset:0!important;top:0!important;left:0!important;width:100%!important;height:100%!important;background:#000!important;z-index:2147483647!important;cursor:none!important;';
    var saved, playingGuard;
    function current() {
        var app = window.Lampa;
        if (!app || !app.Player.opened()) return null;
        return app.PlayerVideo.video();
    }
    function source(v) { return v.currentSrc || v.src || ''; }
    function clear(resume) {
        var state = saved;
        saved = null;
        if (state && state.video && playingGuard) state.video.removeEventListener('play', playingGuard);
        playingGuard = null;
        layer.remove();
        if (resume && state && state.resume && current() === state.video &&
            source(state.video) === state.source && state.video.paused && !state.video.ended)
            Lampa.PlayerVideo.play();
    }
    function toggle() {
        if (layer.parentNode) { clear(true); return; }
        var video = current();
        saved = {video:video, source:video ? source(video) : '', resume:!!video && video.paused === false && !video.ended};
        if (video && video.addEventListener) {
            playingGuard = function () { if (saved && current() === video) Lampa.PlayerVideo.pause(); };
            video.addEventListener('play', playingGuard);
        }
        if (saved.resume) Lampa.PlayerVideo.pause();
        var full = document.fullscreenElement || document.webkitFullscreenElement;
        (full && full.tagName !== 'VIDEO' ? full : document.body).appendChild(layer);
    }
    function handle(e) {
        var green = e.keyCode === 404 || e.key === 'ColorF1Green' || e.code === 'ColorF1Green';
        if (!green && !layer.parentNode) return;
        // Allow system audio controls while the picture is black.
        if (!green && ([173,174,175,447,448,449].indexOf(e.keyCode) >= 0 || /^AudioVolume/.test(e.key))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (green && e.type === 'keyup' && !e.repeat) toggle();
    }
    ['keydown','keypress','keyup'].forEach(function (name) { window.addEventListener(name,handle,true); });
    ['click','mousedown','mouseup','wheel','touchstart','touchend','pointerdown','pointerup'].forEach(function (name) {
        layer.addEventListener(name,function (e) { e.preventDefault(); e.stopPropagation(); },{passive:false});
    });
    document.addEventListener('visibilitychange',function () { if (document.hidden) clear(false); });
    window.addEventListener('pagehide',function () { clear(false); });
    window.lampaBlackPause = true;
}());
