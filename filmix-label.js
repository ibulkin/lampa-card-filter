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
}());
