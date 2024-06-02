import { Utils, $ } from './utils.js'
import { CanvasView } from './views/canvas.js';
import { Board } from './models/board.js';
import { Layouts, makeConfig } from './common.js';

const random = function() {
    const randomize = function() {
        let app = $('#app');
        app.classList.remove('good');

        let layoutOption = $('[type="radio"]:checked');
        let layoutName = layoutOption ? layoutOption.value : 'standard34';
        let layout = Layouts[layoutName];
        let params = Utils.getURLParams();
        let config = makeConfig({
            debug: params.hasOwnProperty('debug'),
            showEmpty: params.hasOwnProperty('empty'),
            boardWidth: layout.grid.length,
            boardHeight: layout.grid[0].length,
            noHexNumbers: true
        });
        
        const board = new Board(layout, config);
        const view = new CanvasView(app, config);

        board.randomize(layout);
        view.renderBoard(board, false);
        Object.assign(window, {Settlers: {board: board, view: view}});
        app.classList.add('good');
    }

    $('#randomize').addEventListener('click', randomize);
    randomize();
};


const timeRandom = function(count=10) {
    console.time('randomize');
    for(let i = 0; i < count; i++) {
        let rb = Layouts.randomBoard().flat().join('');
        // console.log(i, rb);
    }
    console.timeEnd('randomize');
};

export { random, timeRandom };
