const $ = (q, node) => (node || document).querySelector(q);
const $$ = (q, node) => (node || document).querySelectorAll(q);

const Utils = {
    isString: o => typeof o === 'string',
    capitalize: s => `${s[0].toUpperCase()}${s.substring(1)}`,
    padLeft: i => i.toString().padStart(2, 0),
    isEven: i => i % 2 === 0,
    divMod: (a, b) => [Math.floor(a / b), a % b],
    randomInt: max => Math.floor(Math.random() * Math.floor(max)),
    randomIndex: array => array[Utils.randomInt(array.length)],
    timeDelta: function(then, now) {
        now = now || new Date();
        let seconds = Math.floor((then - now) / 1000);
        let [hours, minutes] = Utils.divMod(seconds, 3600);
        [minutes, seconds] = Utils.divMod(minutes, 60);
        return {hours, minutes, seconds};
    },
    formatTimeDelta: function(then, now) {
        const td = Utils.timeDelta(then, now);
        let bits = [];
        td.hours && bits.push(Utils.pluralize(td.hours, 'hour', 'hours'));
        td.minutes && bits.push(Utils.pluralize(td.minutes, 'minute', 'minutes'));
        td.seconds && bits.push(Utils.pluralize(td.seconds, 'second', 'seconds'));
        return bits.join(', ');
    },
    radians: ang => ang * Math.PI / 180,
    deepCopy: o => JSON.parse(JSON.stringify(o)),
    range: n => Array.from({length: n}, (x, i) => i),
    dispatch: function(type, details) {
        let evt = new CustomEvent(type, {detail: JSON.stringify(details)});
        document.dispatchEvent(evt);
    },
    uniqueId: (function() {
        let i = 0;
        return (() => ++i);
    })(),
    showAlert: function(msg) {
        alert(msg);
    },
    shuffle: function(array) {
        // See https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#Fisher_and_Yates'_original_method
        for(let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i);
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    },
    pluralize: function(n, single, plural) {
        return n === 1 ? `${n} ${single}` : `${n} ${plural}`;
    },
    hide: function(q) {
        (this.isString(q) ? $(q) : q).classList.add('hidden');
    },
    hideAll: function(q) {
        if(this.isString(q)) {
            q = $$(q)
        }
        for(let el of q) {
            this.hide(el);
        }
    },
    show: function(q) {
        (this.isString(q) ? $(q) : q).classList.remove('hidden');
    },
    showAll: function(q) {
        if(this.isString(q)) {
            q = $$(q);
        }
        for(let el of q) {
            this.show(el);
        }
    },
    removeAllChildren: function(el) {
        while(el.firstChild) {
            el.firstChild.remove();
        }
    },
    pointInPolygon: function (p, polygon) {
        let isInside = false;
        let minX = polygon[0].x, maxX = polygon[0].x;
        let minY = polygon[0].y, maxY = polygon[0].y;
        for(const n = 1; n < polygon.length; n++) {
            const q = polygon[n];
            minX = Math.min(q.x, minX);
            maxX = Math.max(q.x, maxX);
            minY = Math.min(q.y, minY);
            maxY = Math.max(q.y, maxY);
        }

        if(p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
            return false;
        }

        let i = 0, j = polygon.length - 1;
        for (; i < polygon.length; j = i++) {
            if(
                (polygon[i].y > p.y) != (polygon[j].y > p.y) &&
                p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x
            ) {
                isInside = !isInside;
            }
        }
        return isInside;
    }
};

const getCSRFTokenCookie = function() {
    let cookieValue = null;
    if(document.cookie && document.cookie !== '') {
        const name = 'csrftoken';
        let cookies = document.cookie.split(';');
        for(let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export { Utils, $, $$, getCSRFTokenCookie };
