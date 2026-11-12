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
        if (!el) return '';
        var title = el.querySelector('.card__title, .card__name, .card-parser__title, .card-watched__title, .card-episode__title, [class$="__title"]');
        var data = el.card_data || {};
        var img = el.querySelector('img[alt]');
        return ((title && title.textContent.trim()) || data.title || data.name || data.Title ||
            el.getAttribute('aria-label') || (img && img.alt) || el.getAttribute('title') || '').trim();
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

    // webOS remote: yellow copies the focused card; blue pastes in the active editor.
    function cardAt(node) {
        while (node && node.nodeType === 1) {
            if (node.card_data || node.matches('.card, .card-parser, .card-watched, .card-episode, .card-person')) return node;
            node = node.parentElement;
        }
    }

    function editorAt(node) {
        if (!visible(node) || node.disabled || node.readOnly) return null;
        if (node.isContentEditable || node.tagName === 'TEXTAREA' ||
            (node.tagName === 'INPUT' && /^(text|url|search|email|tel|password)$/i.test(node.type))) return node;
        return null;
    }

    function currentEditor() {
        var direct = editorAt(document.activeElement) || editorAt(document.querySelector('.selector.focus'));
        if (direct) return direct;
        var keys = Object.values(window.SimpleKeyboardInstances || {}).filter(function (kbd) {
            return visible(kbd.keyboardDOM) && typeof kbd.getInput === 'function' && typeof kbd.options.onChange === 'function';
        });
        if (keys.length === 1) return keys[0];
        var inputs = Array.prototype.filter.call(document.querySelectorAll('.simple-keyboard input, .simple-keyboard textarea'), editorAt);
        return inputs.length === 1 ? inputs[0] : null;
    }

    function insert(target, text) {
        // Some Lampa editors render their value as HTML.
        if (text.indexOf('<') >= 0 && (target.keyboardDOM || target.id === 'orsay-keyboard')) {
            L.Noty.show('Клавиатура Lampa не поддерживает текст со знаком <'.replace('<','&lt;')); return;
        }
        if (target.keyboardDOM) {
            var old = target.getInput();
            var from = target.getCaretPosition(), to = target.getCaretPositionEnd();
            if (typeof from !== 'number') from = old.length;
            if (typeof to !== 'number') to = from;
            var value = old.slice(0,from) + text + old.slice(to);
            target.setInput(value);
            target.setCaretPosition(from + text.length, from + text.length);
            target.options.onChange(value);
        } else {
            target.focus();
            if (target.isContentEditable) {
                if (!document.execCommand('insertText', false, text)) L.Noty.show('Это поле отклонило вставку');
                return;
            }
            var start = target.selectionStart, end = target.selectionEnd;
            if (start === null) { start = end = target.value.length; }
            if (target.maxLength >= 0) text = text.slice(0, Math.max(0, target.maxLength - target.value.length + end - start));
            if (typeof target.setRangeText === 'function' && target.selectionStart !== null)
                target.setRangeText(text, start, end, 'end');
            else target.value = target.value.slice(0,start) + text + target.value.slice(end);
            target.dispatchEvent(new Event('input',{bubbles:true}));
        }
    }

    function remoteShortcut(event) {
        var code = event.keyCode;
        if (code !== 405 && code !== 406) return;
        var editor = currentEditor();
        var action;
        if (code === 406 && editor) {
            action = function () {
                access(false, '', function (text) {
                    if (currentEditor() !== editor) return;
                    if (text) insert(editor, text);
                    else L.Noty.show('Буфер пуст');
                });
            };
        } else if (code === 405 && !editor) {
            var card = cardAt(document.querySelector('.selector.focus, .card.focus')) || cardAt(document.activeElement);
            var title = visible(card) && titleOfCard(card);
            if (title) action = function () { access(true, title, function () { L.Noty.show('Название скопировано'); }); };
        }
        if (!action) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) action();
    }

    function start() {
        window.addEventListener('keydown', remoteShortcut, true);
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
