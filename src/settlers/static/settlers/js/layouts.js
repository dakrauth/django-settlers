import { Utils } from './utils.js'

// {
//     "isSync": true,
//     "layout": "standard34",
//     "grid": [
//          "X0X0W0W0W0W0X0",
//          "X0W0BbO9ScW0X0",
//          "X0W0S5T2B4O6W0",
//          "W0ObD0G6T3SaW0",
//          "X0W0G3T5BaG9W0",
//          "X0W0S8G4T8W0X0",
//          "X0X0W0W0W0W0X0"
//      ],
//     "harbors": {"1f": "3", "2a": "3", "4e": "G", "7a": "3", "12b": "B", "13e": "S", "16c": "3", "17d": "T", "18c": "O },
//     "players": [],
//     "turns": []
// }

const Layouts = {
    standard34: {
        name: "standard34",
        pointsToWin: 10,
        terrain: {D: 1, T: 4, O: 3, B: 3, G: 4, S: 4},
        constructs: {city: 4, settlement: 5, road: 15},
        resourceCards: {O: 19, G: 19, T: 19, S: 19, B: 19},
        developmentCards: {KN: 14, RB: 2, MP: 2, YP: 2, VP: 5},
        grid: [
            ["X0", "X0", "W0", "W0", "W0", "W0", "X0"],
            ["X0", "W0", "L0", "L0", "L0", "W0", "X0"],
            ["X0", "W0", "L0", "L0", "L0", "L0", "W0"],
            ["W0", "L0", "L0", "L0", "L0", "L0", "W0"],
            ["X0", "W0", "L0", "L0", "L0", "L0", "W0"],
            ["X0", "W0", "L0", "L0", "L0", "W0", "X0"],
            ["X0", "X0", "W0", "W0", "W0", "W0", "X0"]
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
        },
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
            ["X0", "X0", "W0", "W0", "W0", "W0", "X0", "X0", "X0"],
            ["X0", "W0", "L0", "L0", "L0", "W0", "X0", "X0", "X0"],
            ["X0", "W0", "L0", "L0", "L0", "L0", "W0", "X0", "X0"],
            ["W0", "L0", "L0", "L0", "L0", "L0", "W0", "X0", "X0"],
            ["W0", "L0", "L0", "L0", "L0", "L0", "L0", "W0", "X0"],
            ["W0", "L0", "L0", "L0", "L0", "L0", "W0", "X0", "X0"],
            ["X0", "W0", "L0", "L0", "L0", "L0", "W0", "X0", "X0"],
            ["X0", "W0", "L0", "L0", "L0", "W0", "X0", "X0", "X0"],
            ["X0", "X0", "W0", "W0", "W0", "W0", "X0", "X0", "X0"]
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
    }
}


const randomBoard = function(layout) {
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

    return matrix;
}

export { Layouts, randomBoard };
