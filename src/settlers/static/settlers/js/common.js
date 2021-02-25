import { Utils } from './utils.js'


const Mapping = {
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

const makeConfig = function(opts) {
    return Object.assign({}, {
        sideLength: 50,
        boardWidth: 7,
        boardHeight: 7,
        showEmpty: false,
        useWater: false,
        debug: false
    }, opts || {});
} 

const Layouts = {
    standard34: {
        name: "standard34",
        pointsToWin: 10,
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
        harbors: {
            "1f": "3",
            "2a": "B",
            "4e": "O",
            "7a": "3",
            "12b": "S",
            "13e": "G",
            "16c": "3",
            "17d": "3",
            "18c": "T"
        }
    },
    standard56: {
        name: "standard56",
        pointsToWin: 10,
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
        harbors: {
            "1f": "3",
            "2a": "B",
            "7a": "O",
            "8e": "3",
            "13d": "S",
            "18b": "G",
            "23c": "3",
            "24e": "3",
            "28d": "T",
            "29c": "S",
            "30b": "3"
        }
    },
    seafarers: {
        name: "seafarers",
        pointsToWin: 10,
        terrain: {D: 2, T: 6, O: 5, B: 5, G: 6, S: 6},
        constructs: {city: 4, settlement: 5, road: 15},
        resourceCards: {O: 24, G: 24, T: 24, S: 24, B: 24},
        developmentCards: {KN: 20, RB: 3, MP: 3, YP: 3, VP: 5},
        chits: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
        grid: [
            ["X", "X", "X", "W", "W", "X", "X", "X", "X"],
            ["X", "X", "W", "W", "W", "W", "X", "X", "X"],
            ["X", "W", "L", "L", "L", "W", "X", "X", "X"],
            ["X", "W", "L", "L", "L", "L", "W", "X", "X"],
            ["W", "L", "L", "L", "L", "L", "W", "X", "X"],
            ["W", "L", "L", "L", "L", "L", "L", "W", "X"],
            ["W", "L", "L", "L", "L", "L", "W", "X", "X"],
            ["X", "W", "L", "L", "L", "L", "W", "X", "X"],
            ["X", "W", "L", "L", "L", "W", "X", "X", "X"],
            ["X", "X", "W", "W", "W", "W", "X", "X", "X"],
            ["X", "X", "X", "W", "W", "X", "X", "X", "X"],
        ],
        harbors: {
            "1f": "3",
            "2a": "B",
            "7a": "O",
            "8e": "3",
            "13d": "S",
            "18b": "G",
            "23c": "3",
            "24e": "3",
            "28d": "T",
            "29c": "S",
            "30b": "3"
        }
    },
    randomBoard: function(layout) {
        layout = layout || Layouts.standard34;
        const terrain = layout.terrain;
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
        evaluate: function(resources) {
            const result = {};
            for(const key of Object.keys(costs)) {
                result[key] = validate(key, resources);
            }
            return result;
        }
    });
})();


class GameException {
    constructor(message, data) {
        this.message = message;
        console.error(message, data);
    }
}


export {
    Color,
    GameException,
    Layouts,
    Mapping,
    Purchase,
    Resource,
    makeConfig
};
