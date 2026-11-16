// Search the active channel listing using the installed SISI provider.
(function () {
    'use strict';
    if (window.localChannelSearchInstalled) return;
    window.localChannelSearchInstalled = true;
    var component = 'sisi_view_lampac';
    var sections = /^(bongacams|runetki|chaturbate|cam4)$/i;
    var limit = 30;

    function decorate(Original) {
        function Searchable(page) {
            var view = new Original(page);
            if (!sections.test(String(page.title || '').trim())) return view;

            function promptSearch() {
                Lampa.Input.edit({title: 'Найти канал · ' + page.title, value: page.channelQuery || '', free: true, nosave: true}, function (value) {
                    Lampa.Controller.toggle('content');
                    var query = String(value || '').trim();
                    if (query) Lampa.Activity.push({
                        component: component, title: page.title, url: page.url,
                        page: 1, channelQuery: query
                    });
                });
            }

            var originalFilter = view.filter;
            view.filter = view.onRight = function () {
                var items = [{title: 'Найти канал'}];
                if (!page.channelQuery) items.push({title: 'Фильтры рубрики', filters: true});
                Lampa.Select.show({
                    title: page.title, items: items,
                    onBack: function () { Lampa.Controller.toggle('content'); },
                    onSelect: function (item) {
                        Lampa.Controller.toggle('content');
                        if (item.filters) originalFilter.call(view);
                        else promptSearch();
                    }
                });
            };

            var button = $('<button type="button" class="simple-button"></button>').text('⌕ Найти канал').on('click', promptSearch);
            view.render().prepend(button);
            if (!page.channelQuery) return view;

            var cancelled = false;
            var destroy = view.destroy;
            view.destroy = function () {
                cancelled = true;
                return destroy.apply(view, arguments);
            };
            view.create = function () {
                var query = page.channelQuery.toLowerCase();
                var results = [];
                var seen = Object.create(null);
                var status = $('<div></div>').css('padding', '0.4em 1em').insertAfter(button);
                function finish(message) {
                    status.text(message + ' · Найдено: ' + results.length);
                    view.build({results: results, collection: true, total_pages: 1});
                    view.render().find('.category-full').addClass('mapping--grid cols--3');
                }
                function read(number) {
                    if (cancelled) return;
                    status.text('Поиск: ' + page.channelQuery + ' · Страница ' + number);
                    view.nextPageReuest({url: page.url, page: number}, function (data) {
                        if (cancelled) return;
                        data.results.forEach(function (item) {
                            if (String(item.name || '').toLowerCase().indexOf(query) < 0) return;
                            var id = item.video || item.name;
                            if (!seen[id]) {
                                seen[id] = true;
                                results.push(item);
                            }
                        });
                        if (!data.results.length || number >= data.total_pages) finish('Поиск завершён');
                        else if (number >= limit) finish('Проверены первые ' + limit + ' страниц');
                        else setTimeout(function () { read(number + 1); }, 0);
                    }, function () {
                        if (!cancelled) finish('Не удалось загрузить страницу ' + number);
                    });
                }
                view.activity.loader(false);
                read(1);
            };
            return view;
        }
        return Searchable;
    }

    function install() {
        if (!window.Lampa || !Lampa.Component) return setTimeout(install, 250);
        var api = Lampa.Component;
        var add = api.add;
        var current = api.get(component);
        if (current) add.call(api, component, decorate(current));
        api.add = function (name, factory) {
            return add.call(this, name, name === component ? decorate(factory) : factory);
        };
    }
    install();
}());
