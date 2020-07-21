const $ = (q, node) => (node || document).querySelector(q);
const $$ = (q, node) => (node || document).querySelectorAll(q);
const point = (x, y) => ({x: x, y: y});

const pointIsInPolyfunction = function (p, polygon) {
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
};

const Const = {
    diceDistro: {2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1},
    diceDistroText: {
         2: '.',  3: '..',  4: '...', 5: '....', 6: '.....', 
        12: '.', 11: '..', 10: '...', 9: '....', 8: '.....'
    },
    edgeIndices: {
        'a': [0, 1], 'b': [1, 2], 'c': [2, 3],
        'd': [3, 4], 'e': [4, 5], 'f': [5, 0]
    },
    dice: {1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'},
    diceCombos: {
        4: [[1,3], [2,2]],
        5: [[1,4], [2,3]],
        6: [[1,5], [2,4], [3,3]],
        7: [[1,6], [2,5], [3,4], [5,2]],
        8: [[2,6], [3,5], [4,4]],
        9: [[3,6], [4,5]],
        10: [[4,6], [5,5]]
    },
    nodeIndex: {a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e', 5: 'f'},
    prevNode: {a: 5, b: 0, c: 1, d: 2, e: 3, f: 4, 0: 5, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4},
    nextNode: {a: 1, b: 2, c: 3, d: 4, e: 5, f: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 0},
    edgeNeighbor: {a: 'd', b: 'e', c: 'f', d: 'a', e: 'b', f: 'c'}
};

const Color = {
    white: '#f0f0f0',  // fff1b5
    red: '#b10000',
    blue: 'blue',
    orange: '#ff6600',
    green: 'green',
    brown: 'brown',

    bg: {
        white: '#000',  // fff1b5
        red: '#fff',
        blue: '#fff',
        orange: '#000',
        green: '#fff',
        brown: '#fff'
    }
}

const Utils = {
    isString: o => typeof o === 'string',
    capitalize: s => `${s[0].toUpperCase()}${s.substring(1)}`,
    padLeft: i => i.toString().padStart(2, 0),
    isEven: i => i % 2 === 0,
    divMod: (a, b) => [Math.floor(a / b), a % b],
    randomInt: max => Math.floor(Math.random() * Math.floor(max)),
    randomIndex: array => array[Utils.randomInt(array.length)],
    randomDice: roll => {
        if(roll >= 4 && roll <= 10) {
            return Utils.randomIndex(Const.diceCombos[roll]);
        }
        let half = roll / 2;
        return [Math.ceil(half), Math.floor(half)];
    },
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
    }
};


const Resource = (function() {
    const bgExtra = '#bede0d', fgExtra = '#000';
    let values = {
        3:  {emoji: '❓', type: 'hbr', bgColor: '#eee',    fgColor: '#000',  descr: '', name: '3:1'},

        B:  {emoji: '🧱', type: 'res', bgColor: '#ae6020', fgColor: '#fff',  descr: '', name: 'Brick'}, // cf7e65
        O:  {emoji: '🗿', type: 'res', bgColor: '#9dacb7', fgColor: '#fff',  descr: '', name: 'Ore'}, // 7a7a7a 6f6a61
        S:  {emoji: '🐑', type: 'res', bgColor: '#9fdd8c', fgColor: '#000',  descr: '', name: 'Sheep'}, // c3f4b3
        T:  {emoji: '🌲', type: 'res', bgColor: '#278a5b', fgColor: '#fff',  descr: '', name: 'Tree'}, // 6da24a
        G:  {emoji: '🌽', type: 'res', bgColor: '#fee5ac', fgColor: '#000',  descr: '', name: 'Grain'}, // fee5ac f0dc82 f5deb3

        D:  {type: 'res', bgColor: '#c5994b', fgColor: '#fff',  descr: '', name: 'Desert'}, // b7a458
        W:  {type: 'res', bgColor: '#02a4d3', fgColor: '#fff',  descr: '', name: 'Water'},

        KN: {type: 'dev', bgColor: '#9966cc', fgColor: '#fff',  name: 'Knight', descr: 'Move the robber. Steal 1 resource from the owner of a settlement or city adjacent to the robber\'s new hex'},
        MP: {type: 'dev', bgColor: bgExtra,   fgColor: fgExtra, name: 'Monopoly', descr: 'When you place this card, annouce 1 type of resource. All other players must give you all of the resourcesof that type'},
        RB: {type: 'dev', bgColor: bgExtra,   fgColor: fgExtra, name: 'Road Bldg', descr: 'Place 2 new roads as if you had just built them'},
        VP: {type: 'dev', bgColor: '#ffbf00', fgColor: '#000',  name: 'Victory Pt', descr: 'Reveal this card on your turn if, with it, you reach the number of points required for victory'},
        YP: {type: 'dev', bgColor: bgExtra,   fgColor: fgExtra, name: 'Year Plenty', descr: 'Take any 2 resources from the bank. Add them to your hand. They can be 2 of the same resource or 2 different resources'},

        LA: {type: 'awd', bgColor: '#880000', fgColor: '#fff',  descr: '', name: 'Largest Army'},
        LR: {type: 'awd', bgColor: '#008800', fgColor: '#fff',  descr: '', name: 'Longest Road'},

        L:  {type: 'res', bgColor: '#ffeedd', fgColor: '#000',  descr: '', name: 'Land'},
        X:  {type: null,  bgColor: '#ffffff', fgColor: '#000',  descr: '', name: 'Empty'},
    };
    values[null] = values[3];
    for(const [key, value] of Object.entries(values)) {
        value.abbr = key;
        values[value.name.split(' ').join('')] = value;
    }
    return values;
})();

const defaultConfig = {
    sideLength: 50,
    boardWidth: 7,
    boardHeight: 7,
    showEmpty: false,
    useWater: false,
    debug: false
};

const Layouts = {
    standard34: {
        name: "standard34",
        terrain: {D: 1, T: 4, O: 3, B: 3, G: 4, S: 4},
        constructs: {city: 4, settlement: 5, road: 15},
        resourceCards: {O: 19, G: 19, T: 19, S: 19, B: 19},
        developmentCards: {KN: 14, RB: 2, MP: 2, YP: 2, VP: 5},
        grid: [
            ["X", "X", "W", "W", "W", "W", "X"],
            ["X", "W", "L", "L", "L", "W", "X"],
            ["X", "W", "L", "L", "L", "L", "W"],
            ["W", "L", "L", "L", "L", "L", "W"],
            ["X", "W", "L", "L", "L", "L", "W"],
            ["X", "W", "L", "L", "L", "W", "X"],
            ["X", "X", "W", "W", "W", "W", "X"],
        ],
        chits: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
        harbors: [
            {"hex":  1, "edge": "f", "resource": "3", "id": 1},
            {"hex":  2, "edge": "a", "resource": "B", "id": 2},
            {"hex":  4, "edge": "e", "resource": "O", "id": 3},
            {"hex":  7, "edge": "a", "resource": "3", "id": 4},
            {"hex": 12, "edge": "b", "resource": "S", "id": 5},
            {"hex": 13, "edge": "e", "resource": "G", "id": 6},
            {"hex": 16, "edge": "c", "resource": "3", "id": 7},
            {"hex": 17, "edge": "d", "resource": "3", "id": 8},
            {"hex": 18, "edge": "c", "resource": "T", "id": 9}
        ]
    },
    standard56: {
        name: "standard56",
        terrain: {D: 2, T: 6, O: 5, B: 5, G: 6, S: 6},
        constructs: {city: 4, settlement: 5, road: 15},
        resourceCards: {O: 24, G: 24, T: 24, S: 24, B: 24},
        developmentCards: {KN: 20, RB: 3, MP: 3, YP: 3, VP: 5},
        chits: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
        grid: [
            ["X", "X", "W", "W", "W", "W", "X", "X", "X"],
            ["X", "W", "L", "L", "L", "W", "X", "X", "X"],
            ["X", "W", "L", "L", "L", "L", "W", "X", "X"],
            ["W", "L", "L", "L", "L", "L", "W", "X", "X"],
            ["W", "L", "L", "L", "L", "L", "L", "W", "X"],
            ["W", "L", "L", "L", "L", "L", "W", "X", "X"],
            ["X", "W", "L", "L", "L", "L", "W", "X", "X"],
            ["X", "W", "L", "L", "L", "W", "X", "X", "X"],
            ["X", "X", "W", "W", "W", "W", "X", "X", "X"],
        ],
        harbors: [
            {"hex":  1, "edge": "f", "resource": "3", "id":  1},
            {"hex":  2, "edge": "a", "resource": "B", "id":  2},
            {"hex":  7, "edge": "a", "resource": "O", "id":  3},
            {"hex":  8, "edge": "e", "resource": "3", "id":  4},
            {"hex": 13, "edge": "d", "resource": "S", "id":  5},
            {"hex": 18, "edge": "b", "resource": "G", "id":  6},
            {"hex": 23, "edge": "c", "resource": "3", "id":  7},
            {"hex": 24, "edge": "e", "resource": "3", "id":  8},
            {"hex": 28, "edge": "d", "resource": "T", "id":  9},
            {"hex": 29, "edge": "c", "resource": "S", "id": 10},
            {"hex": 30, "edge": "b", "resource": "3", "id": 11}
        ]
    }
}

const parseTradeOffer = function(str) {
    let regex = /(\d) *(wheat|grain|sheep|wool|tree|lumber|wood|ore|brick)s?/gm;
    let map = {
        wheat: 'G', grain: 'G',
        sheep: 'S', wool:  'S',
        tree:  'T', wood:  'T', lumber: 'T',
        ore:   'O',
        brick: 'B'
    };
    let m = null;
    let results = [];
    str = str.toLowerCase();
    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        // The result can be accessed through the `m`-variable.
        results.push({
            resource: map[m[2]],
            count: parseInt(m[1])
        });
    }
    return results.length ? results : null;
};

const randomBoard = function(layout) {
    layout = layout || Layouts.standard34;
    terrain = layout.terrain;
    let items = [];
    let conflict = false;
    let matrix = null;
    let attempts = 0;
    do {
        ++attempts;
        conflict = false;
        for(let [k, v] of Object.entries(terrain)) {
            items = items.concat(Array(v).fill(k));
        }
        items = Utils.shuffle(items);
        let prev = null;
        let current = null;
        matrix = Utils.deepCopy(layout.grid);

        // if row is even, -1, 0
        // if row is  odd, 0, +1 
        for(let row = 1; row < matrix.length - 1; row++) {
            prev = null;
            for(let col = 1; col < matrix[row].length; col++) {
                if(matrix[row][col] == 'W' || matrix[row][col] == 'X') {
                    continue;
                }
                current = items.shift();
                let tried = 0;
                let offset = row % 2 === 0 ? [-1, 0] : [0, 1];
                while(
                    current === prev ||
                    current === matrix[row - 1][col + offset[0]] ||
                    current === matrix[row - 1][col + offset[1]]
                ) {
                    if(tried > items.length) {
                        conflict = true;
                        break;
                    }
                    items.push(current);
                    current = items.shift();
                    ++tried;
                }
                matrix[row][col] = current;
                prev = current;
            }
        }
    } while(conflict);
    // console.log('Found with attempts:', attempts);
    // console.log(matrix);
    return matrix;
}

const Purchase = (function() {
    const costs = {
        settlement:  [['B', 1], ['T', 1], ['G', 1], ['S', 1]],
        road:        [['B', 1], ['T', 1]],
        city:        [['G', 2], ['O', 3]],
        development: [['S', 1], ['G', 1], ['O', 1]],
    };
    const validate = function(item, resources) {
        for(const [key, value] of costs[item]) {
            let res = resources[key] || 0;
            if(res < value) {
                return false;
            }
        }
        return true;
    };

    return Object.assign({}, costs, {
        isValid: function(item, resources) { return validate(item, resources)},
        evaluate: evaluate = function(resources) {
            const result = {};
            for(const key of Object.keys(costs)) {
                result[key] = validate(key, resources);
            }
            return result;
        }
    });
})();
