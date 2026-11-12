/* Local clipboard for Lampa. No network access or system clipboard permissions. */
(function () {
    'use strict';
    if (window.lampaLocalClipboard) return;
    window.lampaLocalClipboard = true;
    var L = window.Lampa;
    var database;
    function access(write, value, done) {
        function run() {
            var tx = database.transaction('texts', write ? 'readwrite' : 'readonly');
            var store = tx.objectStore('texts');
            var op = write ? store.put(value, 'clipboard') : store.get('clipboard');
            tx.oncomplete = function () { done(write ? value : op.result || ''); };
            tx.onabort = function () { L.Noty.show('Буфер обмена недоступен'); };
        }
        if (database) return run();
        var req = indexedDB.open('lampa-local-clipboard', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('texts'); };
        req.onerror = function () { L.Noty.show('Буфер обмена недоступен'); };
        req.onsuccess = function () { database = req.result; run(); };
    }
    var focusedCard, selectedText = '';

    function visible(el) {
        return el && el.getClientRects().length && el.offsetWidth && el.offsetHeight;
    }

    function selection() {
        var field = document.activeElement;
        if (field && /^(textarea|input)$/i.test(field.tagName) &&
            /^(text|search|textarea)$/i.test(field.type) && field.selectionEnd > field.selectionStart)
            return field.value.slice(field.selectionStart, field.selectionEnd);
        var range = window.getSelection();
        if (range && !range.isCollapsed) return range.toString();
        return '';
    }

    function titleOfCard(el) {
        var title = el && el.querySelector('.card__title, .card__name');
        return title ? title.textContent.trim() : '';
    }

    function findText(selector) {
        var nodes = document.querySelectorAll(selector);
        for (var i = nodes.length - 1; i >= 0; i--) {
            if (visible(nodes[i])) return nodes[i].textContent.trim();
        }
        return '';
    }

    function item(title, action) {
        return {title: title, onSelect: action};
    }

    function menu() {
        var previous = L.Controller.enabled().name || 'head';
        
        var picked = selection() || selectedText;
        selectedText = '';
        var title = findText('.full-start-new__title, .full-start__title') ||
            (visible(focusedCard) ? titleOfCard(focusedCard) : '');
        var description = findText('.full-descr__text, .full-start__description, .full-start-new__description');
        function back() { L.Controller.toggle(previous); }
        function save(text) {
            back();
            access(true, text, function () { L.Noty.show('Текст скопирован'); });
        }
        function show(label, choices) {
            L.Select.show({title:label, items:choices, onBack:back});
        }
        function chooseWords(text) {
            var words = text.match(/\S+/g) || [];
            function label(word) {
                return word.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            function choices(first) {
                return words.slice(first).map(function (word, offset) {
                    return item(String(first + offset + 1) + '. ' + label(word), function () {
                        save(words.slice(first, first + offset + 1).join(' '));
                    });
                });
            }
            show('Выберите первое слово', words.map(function (word, i) {
                return item(String(i + 1) + '. ' + label(word), function () {
                    show('Выберите последнее слово', choices(i));
                });
            }));
        }
        access(false, '', function (clip) {
            var actions = [];
            if (picked) actions.push(item('Скопировать выделенное', function () { save(picked); }));
            if (title) actions.push(item('Скопировать название', function () { save(title); }));
            if (description) actions.push(item('Скопировать описание', function () { save(description); }));
            if (title) actions.push(item('Выделить слова из названия', function () { chooseWords(title); }));
            if (description) actions.push(item('Выделить слова из описания', function () { chooseWords(description); }));
            if (clip) {
                actions.push(item('Вставить в поиск', function () {
                    // Lampa displays search text as HTML. Keep markup out of that renderer.
                    if (/[<&]/.test(clip) && /<|&#?\w+;/.test(clip)) {
                        L.Noty.show('Поиск Lampa не поддерживает этот текст с разметкой'); back(); return;
                    }
                    if (document.body.classList.contains('search--open')) L.Search.close();
                    L.Search.open({input:clip});
                }));
                actions.push(item('Очистить буфер', function () {
                    back(); access(true, '', function () { L.Noty.show('Буфер очищен'); });
                }));
            }
            if (actions.length) show('Буфер обмена', actions);
            else L.Noty.show('Откройте карточку фильма или выделите текст');
        });
    }

    function start() {
        var icon = '<svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="5" width="13" height="16" rx="2"/><rect x="9" y="2" width="7" height="5" rx="1"/></svg>';
        var button = L.Head.addIcon(icon, menu);
        button.attr('title','Буфер обмена').attr('aria-label','Буфер обмена');
        function rememberBeforeClick() { selectedText = selection(); }
        button.on('mousedown touchstart', rememberBeforeClick);
        // Remote navigation can collapse the selection before the header receives OK.
        document.addEventListener('selectionchange', function () {
            var text = selection();
            if (text) selectedText = text;
        });
        $(document).on('hover:focus.lampaLocalClipboard mouseover.lampaLocalClipboard', '.card', function () {
            focusedCard = this;
        });
    }
    if (window.appready) start();
    else L.Listener.follow('app', function (event) { if (event.type === 'ready') start(); });
}());
