/* Lampa card filter 1.0.0. Local display only. ES5 for LG webOS. */
(function () {
    'use strict';
    var app = window.Lampa;
    if (!app || !app.Listener || window.lampaCardFilterInstalled) return;
    window.lampaCardFilterInstalled = true;

    function excluded(item) {
        if (!item || typeof item !== 'object') return false;
        var card = item.card || item;
        if (card.media_type === 'person' || typeof card.gender !== 'undefined') return false;
        function animation(genre) {
            var id = genre && typeof genre === 'object' ? genre.id : genre;
            return id === 16 || id === '16';
        }
        if ([card.genre_ids, card.genres].some(function (genres) {
            return Array.isArray(genres) && genres.some(animation);
        })) return true;
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'film') return false;
        var series = type === 'tv' || type === 'series' || type === 'serial' ||
            'first_air_date' in card || !!card.original_name ||
            typeof card.number_of_seasons === 'number';
        if (!series) return false;
        return [card.origin_country, card.production_countries].some(function (values) {
            return (Array.isArray(values) ? values : [values]).some(function (value) {
                var code = value && (value.iso_3166_1 || value);
                return typeof code === 'string' && /^(TR|KR|JP|CN)$/i.test(code.trim());
            });
        });
    }

    function filterRow(row) {
        if (!row || !Array.isArray(row.results)) return row;
        var kept = row.results.filter(function (item) { return !excluded(item); });
        if (kept.length === row.results.length) return row;
        var copy = {};
        Object.keys(row).forEach(function (key) { copy[key] = row[key]; });
        copy.results = kept;
        if (row.results.length >= 20 && row.url) copy.more = true;
        return copy;
    }

    function isSearch(page) {
        return /search/i.test(page.component || '') ||
            /(^|\/)search([/?#]|$)/i.test(page.url || '') ||
            !!(page.query && page.component !== 'full');
    }

    function decorate(page, component) {
        var rows = /^(main|category|bookmarks)$/.test(page.component);
        var grid = /^(favorite|category_full)$/.test(page.component);
        if (!component || component.lcfDecorated || !(rows || grid)) return;
        component.lcfDecorated = true;
        // In 2.3.0 main.append receives one row; category.append receives one page.
        if (typeof component.append === 'function') {
            var append = component.append;
            component.append = function (data) {
                arguments[0] = filterRow(data);
                return append.apply(this, arguments);
            };
        }
        // Modular Lampa creates each row/card through this instance's event dispatcher.
        if (typeof component.emit === 'function') {
            var emit = component.emit;
            component.emit = function (event, item) {
                if (event === 'createAndAppend') {
                    if (grid && excluded(item)) return;
                    if (rows) arguments[1] = filterRow(item);
                }
                return emit.apply(this, arguments);
            };
        }
        // A whole first page can match (e.g. the animation genre). Keep a way forward.
        if (grid && typeof component.build === 'function' && app.Empty) {
            var build = component.build;
            component.build = function (data) {
                if (!data || !Array.isArray(data.results) || !data.results.length ||
                    !data.results.every(excluded)) return build.apply(this, arguments);
                var empty = new app.Empty({ title: 'Все карточки на этой странице скрыты',
                    descr: 'Эти названия можно найти через поиск.' });
                var current = Number(page.page) || 1;
                if (current < Number(data.total_pages)) {
                    var button = document.createElement('div');
                    button.className = 'simple-button selector';
                    button.textContent = 'Следующая страница';
                    button.addEventListener('hover:enter', function () {
                        app.Activity.replace({ page: current + 1 });
                    });
                    empty.append(button);
                }
                this.render(true).appendChild(empty.render(true));
                this.start = function () { empty.start(); };
                this.activity.loader(false);
                this.activity.toggle();
            };
        }
    }

    var selector = '.card, .card-episode';
    function mark(card) {
        if (!card.card_data) return;
        var parent = card.parentElement;
        while (parent && !parent.classList.contains('lcf-scope')) {
            if (parent.classList.contains('main-search') || parent.classList.contains('search__results')) {
                card.classList.remove('lcf-excluded');
                return;
            }
            parent = parent.parentElement;
        }
        card.classList.toggle('lcf-excluded', excluded(card.card_data));
    }
    function scan(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.classList.contains('card') || node.classList.contains('card-episode')) mark(node);
        var cards = node.querySelectorAll(selector);
        for (var i = 0; i < cards.length; i++) mark(cards[i]);
    }

    function attach(page) {
        if (!page || !page.activity || typeof page.activity.render !== 'function') return;
        var activity = page.activity;
        var root = activity.render(true);
        if (!root || !root.classList || isSearch(page)) return;
        var component = typeof activity.component === 'function' ? activity.component() : activity.component;
        decorate(page, component);
        // Search overlay is outside the activity. Expanded search has its own activity.
        if (root.lcfObserver || !window.MutationObserver) return;
        root.classList.add('lcf-scope');
        root.lcfObserver = new window.MutationObserver(function (changes) {
            changes.forEach(function (change) {
                for (var i = 0; i < change.addedNodes.length; i++) scan(change.addedNodes[i]);
            });
        });
        root.lcfObserver.observe(root, { childList: true, subtree: true });
        scan(root);
    }

    var style = document.createElement('style');
    style.textContent = '.lcf-scope .lcf-excluded{display:none!important}';
    document.head.appendChild(style);
    app.Listener.follow('activity', function (event) {
        var page = event.object;
        if (event.type === 'init' || event.type === 'start') attach(page);
        if (event.type === 'destroy' && page && page.activity) {
            var root = page.activity.render(true);
            if (root && root.lcfObserver) root.lcfObserver.disconnect();
        }
    });
    if (app.Activity && app.Activity.active) attach(app.Activity.active());
}());
