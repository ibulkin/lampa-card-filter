function phoneChannel(secret, cryptoBox) {
    function hex(bytes) {
        return Array.prototype.map.call(bytes, function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    }
    function bytes(str) {
        if (!str || !/^(?:[a-f0-9]{2})+$/.test(str)) throw Error('bad data');
        return new Uint8Array(str.match(/../g).map(function (v) { return parseInt(v, 16); }));
    }
    var key = bytes(secret);
    var base = 'https://ntfy.sh/lampa-' + hex(cryptoBox.hash(key).slice(0, 20));
    function send(side, obj) {
        var nonce = cryptoBox.randomBytes(24);
        var data = new TextEncoder().encode(JSON.stringify(obj));
        return fetch(base + side, {method:'POST', credentials:'omit', body:hex(nonce) + hex(cryptoBox.secretbox(data, nonce, key))})
            .then(function (r) { if (!r.ok) throw Error('relay'); });
    }
    function listen(side, handle) {
        var stream = new EventSource(base + side + '/sse');
        stream.onmessage = function (event) {
            try {
                var data = JSON.parse(event.data).message;
                if (typeof data !== 'string' || data.length > 4000) return;
                var plain = cryptoBox.secretbox.open(bytes(data.slice(48)), bytes(data.slice(0,48)), key);
                if (plain) handle(JSON.parse(new TextDecoder().decode(plain)));
            } catch (_) {}
        };
        return stream;
    }
    return {send:send, listen:listen, random:function () { return hex(cryptoBox.randomBytes(16)); }};
}
