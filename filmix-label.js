/* Label the pinned Filmix source without changing the original button or its priority hash. */
(function () {
    'use strict';
    if (document.getElementById('filmix-priority-label')) return;
    var button = '.full-start-new__buttons .button--priority[data-subtitle="Filmix v1.0.7"]';
    var style = document.createElement('style');
    style.id = 'filmix-priority-label';
    style.textContent = button + '{width:auto!important;max-width:none!important;}' +
        button + ' > span{display:none!important;}' +
        button + '::after{content:"Filmix";display:inline-block;margin-left:.35em;color:inherit;font-weight:600;white-space:nowrap;}';
    document.head.appendChild(style);
    if (!/iPhone|iPod/.test(navigator.userAgent) &&
        !(navigator.maxTouchPoints > 1 && /Mac|iPad/.test(navigator.platform))) return;

    var version = 'Filmix v1.0.7';
    function sourceIn(card) {
        var choices = card.querySelectorAll('.buttons--container .full-start__button:not(.hide)');
        for (var i = 0; i < choices.length; i++) {
            var subtitle = choices[i].getAttribute('data-subtitle') || window.jQuery(choices[i]).data('subtitle');
            if (String(subtitle || '').trim() === version) return choices[i];
        }
    }
    function update(row) {
        var card = row.closest('.full-start-new');
        if (!card) return;
        var custom = row.querySelector('.filmix-iphone-shortcut');
        var source = sourceIn(card);
        if (!source || row.querySelector('.button--priority[data-subtitle="Filmix v1.0.7"]')) {
            if (custom) custom.remove();
            return;
        }
        if (custom) return;
        var btn = document.createElement('div');
        btn.className = 'full-start__button selector filmix-iphone-shortcut';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', version);
        btn.style.cssText = 'width:auto!important;max-width:none!important;';
        btn.textContent = 'Filmix';
        var last = 0;
        window.jQuery(btn).on('click hover:enter', function (event) {
            event.preventDefault();
            event.stopPropagation();
            var current = sourceIn(card);
            if (!current || Date.now() - last < 600) return;
            last = Date.now();
            window.jQuery(current).trigger('hover:enter');
        });
        row.insertBefore(btn, row.firstChild);
    }
    function scan() {
        document.querySelectorAll('.full-start-new__buttons').forEach(update);
    }
    var selector = '.full-start-new__buttons, .full-start-new, .buttons--container, .full-start__button';
    new MutationObserver(function (changes) {
        var relevant = changes.some(function (change) {
            if (change.target.closest && change.target.closest('.buttons--container, .full-start-new__buttons')) return true;
            return Array.prototype.some.call(change.addedNodes, function (node) {
                return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
            });
        });
        if (relevant) scan();
    }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['data-subtitle','class']});
    scan();
}());
