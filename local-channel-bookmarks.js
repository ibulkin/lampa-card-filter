// Enable the existing local bookmark menu for channel cards in Lampa+.
(function () {
    'use strict';
    if (window.localChannelBookmarksInstalled) return;
    window.localChannelBookmarksInstalled = true;
    document.addEventListener('hover:long', function (event) {
        if (!window.Lampa || !Lampa.Activity) return;
        var page = Lampa.Activity.active();
        if (!page || page.component !== 'sisi_view_lampac' ||
            !/^(bongacams|runetki|chaturbate|cam4)$/i.test(String(page.title || '').trim())) return;
        var card = event.target.closest && event.target.closest('.card');
        var item = card && card.card_data;
        if (!item || !item.video) return;
        var stored = Lampa.Storage.get('sisi_bookmarks_local', '{}');
        try {
            if (typeof stored === 'string') stored = JSON.parse(stored);
        } catch (error) { return; }
        item.bookmark = (stored && stored[item.video]) || {};
    }, true);
}());
