(function () {
    'use strict';
    var byId = function (id) { return document.getElementById(id); };
    var notice = function (text) { byId('notice').textContent = text; };
    var devices, storage = 'lampa-phone-devices-v1';
    try { devices = JSON.parse(localStorage.getItem(storage) || '[]'); } catch (_) { devices = []; }
    var pending = location.hash.slice(1);
    function refresh(active) {
        var selector = byId('devices');
        selector.textContent = '';
        devices.forEach(function (device) { selector.add(new Option(device.name, device.key)); });
        if (active) selector.value = active;
        byId('search').hidden = !devices.length;
        if (!devices.length) notice('Откройте значок телефона в Lampa+ и отсканируйте QR-код.');
    }
    refresh();
    if (/^[0-9a-f]{64}$/.test(pending)) {
        byId('pair').hidden = false;
        byId('search').hidden = true;
        var existing = devices.find(function (d) { return d.key === pending; });
        byId('room').value = existing ? existing.name : (devices.length ? 'Спальня' : 'Гостиная');
        notice('');
    }
    byId('pair').onsubmit = function (e) {
        e.preventDefault();
        var name = byId('room').value.trim();
        if (!name) return;
        devices = devices.filter(function (d) { return d.key !== pending; });
        devices.push({key:pending, name:name});
        try { localStorage.setItem(storage, JSON.stringify(devices)); }
        catch (_) { notice('Chrome не смог сохранить телевизор. Откройте обычную вкладку.'); return; }
        history.replaceState(null, '', location.pathname);
        byId('pair').hidden = true;
        refresh(pending); notice('Телевизор сохранён.');
    };
    byId('search').onsubmit = function (e) {
        e.preventDefault();
        var q = byId('query').value.trim();
        if (!q || q.length > 300 || /[<>\x00-\x1f]/.test(q)) { notice('Введите название без угловых скобок.'); return; }
        var ch = phoneChannel(byId('devices').value, nacl), id = ch.random(), sent = false, finished = false;
        var stream = ch.listen('-reply', function (reply) {
            if (reply.id === id) finish(reply.ok ? 'Поиск открыт на телевизоре.' : 'Откройте главную страницу Lampa+ и повторите.');
        });
        function finish(msg) {
            if (finished) return;
            finished = true; clearTimeout(timer); stream.close(); byId('send').disabled = false; notice(msg);
        }
        var timer = setTimeout(function () { finish('Телевизор не подтвердил поиск. Проверьте интернет и откройте Lampa+.'); }, 18000);
        byId('send').disabled = true;
        notice('Жду ответа телевизора…');
        stream.onopen = function () {
            if (sent || finished) return;
            sent = true;
            ch.send('-query', {id:id, text:q, at:Date.now()}).catch(function () { finish('Не удалось отправить запрос. Проверьте интернет.'); });
        };
    };
}());
