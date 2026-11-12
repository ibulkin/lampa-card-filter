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
    refresh(localStorage.getItem('lampa-phone-last'));
    byId('devices').onchange = function () { localStorage.setItem('lampa-phone-last', this.value); };
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
    byId('export').onclick = async function () {
        if (!devices.length) { notice('Сначала откройте эту страницу в Chrome, где уже сохранены телевизоры.'); return; }
        var data = JSON.stringify({lampa:2, rooms:devices});
        try { await navigator.clipboard.writeText(data); notice('Привязка скопирована. Вставьте её в ярлыке.'); }
        catch (_) { byId('transfer').value=data; byId('transfer').select(); notice('Скопируйте выделенную привязку.'); }
    };
    byId('import').onclick = function () {
        try {
            var data = JSON.parse(byId('transfer').value);
            if (data.lampa !== 2 || !Array.isArray(data.rooms) || !data.rooms.length || data.rooms.length > 20 ||
                !data.rooms.every(function (d) { return d && typeof d.name === 'string' && d.name.length <= 48 && /^[a-f0-9]{64}$/.test(d.key); })) throw Error();
            var next = devices.slice();
            data.rooms.forEach(function (d) { if (!next.some(function (old) { return old.key === d.key; })) next.push({name:d.name, key:d.key}); });
            localStorage.setItem(storage,JSON.stringify(next)); devices=next; byId('transfer').value=''; refresh(); notice('Телевизоры сохранены.');
        } catch (_) { notice('Не удалось прочитать привязку. Скопируйте её из Chrome целиком.'); }
    };
    byId('search').onsubmit = function (e) {
        e.preventDefault();
        var paste = !e.submitter || e.submitter.id !== 'send';
        var q = byId('query').value;
        if (!paste) q = q.trim();
        if (!q || (!paste && (q.length > 300 || /[<>\x00-\x1f]/.test(q)))) { notice('Введите название без угловых скобок.'); return; }
        var chunks = [], part = '', size = 0;
        // Bound the encrypted JSON packet in bytes, including escaped Unicode and controls.
        for (const letter of q) {
            var n = new TextEncoder().encode(JSON.stringify(letter)).length - 2;
            if (size + n > 1250 || part.length + letter.length > 450) { chunks.push(part); part = ''; size = 0; }
            part += letter; size += n;
        }
        chunks.push(part);
        if (chunks.length > 64) { notice('Текст слишком длинный. Вставьте его частями.'); return; }
        var ch = phoneChannel(byId('devices').value, nacl), id = ch.random(), sent = false, finished = false;
        var stream = ch.listen('-reply', function (reply) {
            if (reply.id === id) finish(reply.ok ? (paste ? 'Текст вставлен.' : 'Поиск открыт на телевизоре.') : reply.error || 'Откройте главную страницу Lampa+ и повторите.');
        });
        function finish(msg) {
            if (finished) return;
            finished = true; clearTimeout(timer); stream.close(); byId('paste').disabled = byId('send').disabled = false; notice(msg);
        }
        var timer = setTimeout(function () { finish('Нет подтверждения. Проверьте текст на ТВ и перезапустите Lampa+, чтобы загрузить обновлённый плагин.'); }, 45000);
        byId('paste').disabled = byId('send').disabled = true;
        notice('Жду ответа телевизора…');
        stream.onopen = function () {
            if (sent || finished) return;
            sent = true;
            var at = Date.now();
            var delivery = paste ? chunks.reduce(function (chain, text, index) {
                return chain.then(function () {
                    if (finished) throw Error('expired');
                    return ch.send('-paste',{id:id, at:at, part:index, total:chunks.length, text:text});
                });
            }, Promise.resolve()) : ch.send('-query', {id:id, text:q, at:at});
            delivery.catch(function () { finish('Не удалось отправить запрос. Проверьте интернет.'); });
        };
    };
}());
