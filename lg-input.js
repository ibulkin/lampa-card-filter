/* Lampa+ / LG webOS: register the current app as an input and show the TV response. */
(function () {
    'use strict';
    var app = window.Lampa;
    if (!app || !app.SettingsApi || window.lampaLgInputTools) return;
    window.lampaLgInputTools = true;
    var target = 'mybylampa.tv';
    function run(remove) {
        var os = window.webOS;
        var panel = $('<div></div>');
        var closed = false;
        var sent = false;
        var settled = false;
        var timer;
        function line(message) { if (!closed) panel.append($('<div></div>').text(message)); }
        app.Modal.open({
            title: 'Вход LG · Lampa+', html: panel, size: 'medium',
            onBack: function () {
                closed = true;
                clearTimeout(timer);
                app.Modal.close();
                app.Controller.toggle('settings_component');
            }
        });
        try {
            if (!os || !os.service || typeof os.service.request !== 'function') {
                line('Интерфейс webOS недоступен в этом окне Lampa+.'); return;
            }
            var id = typeof os.fetchAppId === 'function' ? os.fetchAppId() : '';
            line('ID, который видит Lampa: ' + (id || 'пусто'));
            function request(info) {
                if (closed || sent) return;
                sent = true;
                clearTimeout(timer);
                var manifestId = info && info.id;
                line('ID в пакете: ' + (manifestId || 'нет данных'));
                line('Поддержка входа (supportGIP): ' + (manifestId ?
                    (info.supportGIP === true ? 'включена' : 'не заявлена') : 'нет данных'));
                if ((id && id !== target) || (manifestId && manifestId !== target)) {
                    line('Открыто другое приложение. Откройте Lampa+ и повторите.'); return;
                }
                if (!id && !manifestId) {
                    line('Телевизор не сообщил ID приложения. Запрос не отправлен.'); return;
                }
                var params = { appId: target, showPopup: true };
                if (!remove) {
                    params.type = 'MVPD_IP';
                    params.label = 'Lampa+';
                    params.pigImage = '';
                    params.mvpdIcon = '';
                }
                function finish(message) {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    line(message);
                }
                timer = setTimeout(function () { finish('За 10 секунд ответ от LG не поступил.'); }, 10000);
                try {
                    os.service.request('luna://com.webos.service.eim', {
                        method: remove ? 'deleteDevice' : 'addDevice', parameters: params,
                        onSuccess: function () { finish(remove ? 'LG подтвердил удаление входа.' : 'LG принял запрос. Проверьте список ТВ/Входы.'); },
                        onFailure: function (r) {
                            r = r || {};
                            finish('Ответ LG: ' + (r.errorCode === undefined ? '' : r.errorCode + ' ') +
                                (r.errorText || 'ошибка без описания'));
                        }
                    });
                } catch (e) { finish('Ошибка обращения к LG: ' + e.message); }
            }
            timer = setTimeout(function () { request(null); }, 2500);
            if (typeof os.fetchAppInfo === 'function') {
                try { os.fetchAppInfo(request); } catch (e) { request(null); }
            } else request(null);
        } catch (e) { line('Ошибка проверки: ' + e.message); }
    }
    function button(key, title, remove) {
        app.SettingsApi.addParam({
            component: 'webos_launcher', param: { name: key, type: 'button' },
            field: { name: title }, onChange: function () { run(remove); }
        });
    }
    button('lg_input_register', 'Добавить Lampa+ и показать ответ LG', false);
    button('lg_input_unregister', 'Удалить вход Lampa+ и показать ответ LG', true);
}());
