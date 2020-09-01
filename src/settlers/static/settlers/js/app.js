import { Utils, $, $$, } from './utils.js'
import { CanvasView } from './views/canvas.js';
import { FormView, GeneralView } from './views/general.js';
import { Game } from './models/game.js';
import { Board } from './models/board.js';
import { Resource, Layouts, makeConfig } from './common.js';

const tradeString = function(trade) {
    return trade.map(t => `${t.count} ${Resource[t.resource].name}`).join(' and ');
};

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

class Controller {
    constructor(status, cfg) {
        this.cfg = cfg;
        this.debug = cfg.debug;
        this.status = status;
        this.element = $('.app');
        this.isSync = !!status.isSync && true;
        
        this.view = new CanvasView($('#app'), cfg);
        this.formView = new FormView(this.element);
        this.generalView = new GeneralView();
        this.game = new Game(status, cfg);
        this.currentTurn = null;
        this.tradeOffers = [];
        this.history = {};
        this.activePlayer = this.game.activePlayer;
        this.viewingPlayer = this.game.viewingPlayer;

        this.turnIndex = this.game.turns.length - 1;
        document.addEventListener('history', this.handleHistory.bind(this));
        this.redraw();

        if(this.status.tradeOffers) {
            if(this.activePlayer === this.viewingPlayer) {
                this.showTradeOfferStatus();
            }
            else if(this.viewingPlayer) {
                this.showTradeOfferForOthers();
            }
        }
        else {
            this.showWelcome();
        }

        let hexBits = this.game.board.hexes.filter(h => h.isLand).map(h => [h.id, h.toString()]);
        $$('.hex-listing').forEach(el=> this.formView.setOptions(el, hexBits));
        $$('.node-listing').forEach(el=> this.formView.setOptions(el, Array.from('abcdef').map(n => [n, n])));

        let resourceBits = Array.from('BOGST').map(r => [r, Resource[r].name]);
        $$('.resource-listing').forEach(el => this.formView.setOptions(el, resourceBits));

        let playerBits = [];
        this.game.players.forEach(p => {
            if(p.id != this.activePlayer.id) {
                playerBits.push(p);
            }
        });
        playerBits = playerBits.map(p => [p.color, p.toString()]);
        playerBits.push(['N/A', 'Nobody']);
        $$('.player-listing').forEach(el => this.formView.setOptions(el, playerBits));

        $('.robber-hex').addEventListener('change', this.handleRobberHexChange.bind(this));
        $('select[name=development-card]').addEventListener('change', e => {
            let value = e.target.value;
            if(value === 'VP') {
                this.playVictoryPoint();
            }
            else {
                Utils.show('.development-' + value);
            }
        });

        $$('input[name="tradeBy"]').forEach(el => {
            el.addEventListener('change', this.handleInitTrade.bind(this))
        });

        $$('.controls a').forEach(el => {
            el.addEventListener('click', this.handleNav.bind(this));
        });

        $('.development-buy-btn').addEventListener('click', this.handleDevelopmentBuy.bind(this));

        $$('.select-group button').forEach(el => {
            el.addEventListener('click', this.validateSelectGroup.bind(this));
        });

        $$('.notification > .delete').forEach(e => e.addEventListener('click', evt => {
            evt.target.parentElement.remove();
        }));

        $('#player-trade button').addEventListener(
            'click',
            this.isSync ? this.handleSyncPlayerTrade.bind(this)
                        : this.handlePlayerTrade.bind(this)
        );
    }
    showTradeOfferStatus() {
        const tradeOffers = this.status.tradeOffers;
        const expires = new Date(tradeOffers.expires);
        const activePlayer = this.activePlayer;
        const now = new Date();
        if(now < expires) {
            $('.welcome').innerHTML = `
                <p>Welcome back ${activePlayer.name} (${activePlayer.color}).</p>
                <p><strong>Your trade offer is under consideration</strong></p>`;
            return;
        }
        let html = `<p>Your trade offer time period has expired.</p>`;
        let accepted = tradeOffers.responses.filter(r => r.accepted);
        if(accepted.length) {
            const ordered = this.game.orderedPlayersAfter(activePlayer.color);
            accepted.sort((a,b) => ordered.indexOf(a.color) - ordered.indexOf(b.color));
        }
        $('.welcome').innerHTML = html;
    }
    showTradeOfferForOthers() {
        const tradeOffers = this.status.tradeOffers;
        const expires = new Date(tradeOffers.expires);
        const color = Utils.capitalize(this.game.activePlayer.color);
        const viewingPlayer = this.viewingPlayer;
        const formatOffer = offer => `
            You receive ${tradeString(offer.offers)}
            in exchange for ${tradeString(offer.wants)} of yours`;

        let timeDelta = Utils.formatTimeDelta(expires);
        const now = new Date();
        let info = `<p>${color} is offering a trade.</p>`
        if(now > expires) {
            info += `<p><i>This offer expired at ${expires.toLocaleString()}</i></p>`;
            $('#trade-response > fieldset').disabled = true;
        }
        else {
            info += `<p><small>This offer will expire at ${expires.toLocaleString()} &mdash; ${timeDelta}.</small></p>`;
        }
        $('#trade-offer-details').innerHTML = info;

        const offers = this.status.tradeOffers.offers;
        if(offers.length === 1) {
            $('#trade-offers-listing').textContent = formatOffer(offers[0]);
        }
        else {
            let html = offers.map((o, i) => `<li><label>
                <input type="checkbox" name="acceptedOffer" value="${i}">
                ${formatOffer(o)}
            </label></li>`
            ).join('');
            $('#trade-offers-listing').innerHTML = `<ul>${html}</ul>`;
        }

        const response = tradeOffers.responses.find(r => r.color === viewingPlayer.color)
        if(response) {
            const accepted = response.accepted ? 'true' : 'false';
            $(`[name=tradeResponse][value="${accepted}"]`).checked = true;

            const cbs = [...$$('[name=acceptedOffer]')];
            if(cbs.length) {
                for(const i of response.offers) {
                    cbs[i].checked = true;
                }
            }
        }

        $('#save-trade').addEventListener('click', this.handleTradeResponse.bind(this));
        Utils.show('#trade-response');
    }
    showWelcome() {
        let html = '';
        const activePlayer = this.activePlayer;
        const viewingPlayer = this.viewingPlayer;
        this.generalView.activateTab('play-tab');
        if(activePlayer === viewingPlayer) {
            html = `<p>Welcome back ${activePlayer.name} (${activePlayer.color}),
                it is your turn</p>`;
            if(this.game.isInitStage) {
                this.initStageTurn();
                $('#save-init').addEventListener('click', this.handleSave.bind(this));
                Utils.show('.setup');
            }
            else {
                $('.roll-btn', this.element).addEventListener('click', this.handleRoll.bind(this));
                $('#save').addEventListener('click', this.handleSave.bind(this));
                Utils.show('.turn');
            }
        }
        else if(viewingPlayer) {
            html = `<p>
                Welcome back ${viewingPlayer.name} (${viewingPlayer.color}).
                It is currently ${activePlayer.color}'s turn (${activePlayer.name}).</p>`;
        }
        else {
            html = `<p>It is currently ${activePlayer.color}'s turn (${activePlayer.name}).</p>`
        }
        $('.welcome').innerHTML = html;
    }
    info() {
        let turnIndex = this.currentTurn ? this.turnIndex - 1 : this.turnIndex;
        if(turnIndex >= 0) {
            let turn = this.game.turns[turnIndex];
            this.generalView.showTurnInfo(
                turn,
                this.game.getPlayer(turn.color),
                this.history[turnIndex]
            );
        }
    }
    initStageTurn() {
        const color = this.activePlayer.color;
        this.currentTurn = {roll: null, color: color, actions: [], isCurrent: true};
        this.game.currentTurn = this.currentTurn;
        this.game.turns.push(this.currentTurn);
        this.turnIndex++;
    }
    startTurn() {
        const player = this.activePlayer;
        this.currentTurn = this.game.currentTurn = {
            roll: this.game.state.nextRoll,
            color: player.color,
            actions: [],
            isCurrent: true
        };
        if(this.game.state.nextRoll === 7) {
            this.game.initializeRobber();
        }

        this.game.turns.push(this.currentTurn);
        this.turnIndex++;

        let devCards = this.activePlayer.devCards.toArray().filter(e => e[1] > 0);
        if(devCards.length) {
            let array = devCards.map(e => [e[0], Resource[e[0]].name]);
            this.formView.setOptions($('select[name=development-card]', this.element), array);
        }
        else {
            $('select[name=development-card]').disabled = true;
        }

        this.redraw();
    }
    validateSelectGroup(evt) {
        const info = this.formView.validateSelectGroup(evt);
        if(info) {
            let fn = this[info.handlerName].bind(this);
            fn(info.data, [info.el, ...info.selects]);
        }
    }
    handleTradeResponse(evt) {
        const el = $('[name=tradeResponse]:checked');
        if(!el) {
            Utils.showAlert('You must either accept or decline the trade offer');
            return;
        }
        let tradeResponse = {
            color: this.viewingPlayer.color,
            accepted: el.value === 'true' ? true : false
        };
        if(tradeResponse.accepted) {
            const cbs = $$('[name=acceptedOffer]');
            if(cbs.length) {
                tradeResponse.offers = Array.from(cbs).filter(e => e.checked);
            }
            else {
                tradeResponse.offers = [0];
            }
        }
        let form = $('#posting');
        form.response.value = JSON.stringify(tradeResponse);
        form.submit();
    }
    handleRobberHexChange(evt) {
        let hex = this.game.board.getHex(evt.target.value);
        let colors = new Set(
            hex.vertexIds
                .map(id => id ? this.game.board.vertices[id].color : null)
                .filter(o => o)
        );
        let data = [];
        for(const color of colors) {
            if(color !== this.activePlayer.color) {
                const player = this.game.getPlayer(color);
                if(player.resources.count) {
                    data.push([color, `${player.toString()}`]);
                }
            }
        }
        if(data.length === 0) {
            data = [['N/A', 'Nobody']]
        }
        else if(data.length > 1) {
            data.unshift(['', '-- victim --']);
        }
        this.formView.setOptions($('.victim-listing'), data);
    }
    handleInitTrade(evt) {
        let value = evt.target.value;
        Utils.hide(value === 'player' ? '#non-player-trade' : '#player-trade');
        Utils.show(value === 'player' ? '#player-trade' : '#non-player-trade');
    }
    handleHistory(evt) {
        let data = JSON.parse(evt.detail);
        let i = data.index;
        if(!this.history[i]) {
            this.history[i] = [];
        }
        this.history[i].push(evt.detail);
    }
    handleRobber(data, elements) {
        if(this.currentTurn.robber) {
            return;
        }

        let action = {hex: parseInt(data.hex)}
        if(data.victim == 'N/A') {
            action.victim = null;
            action.resource = null;
        }
        else {
            let victim = this.game.getPlayer(data.victim);
            action.victim = data.victim;
            action.resource = victim.resources.pickRandom();
        }

        elements.forEach(e => e.disabled = true);
        Object.assign(this.currentTurn.actions[0], action);
        Utils.show('.no-robber');
        this.redraw();
    }
    buildConstruct(player, data, isInit=false) {
        let hex = this.game.board.getHex(data.hex);
        try {
            this.game.checkForConstruction(
                hex,
                data.construct,
                data.location,
                player.color,
                isInit
            );
        }
        catch(e) {
            if(e instanceof GameException) {
                Utils.showAlert('Cannot build: ' + e.message);
                return;
            }
            else {
                throw e;
            }
        }

        this.currentTurn.actions.push({
            type: data.construct,
            hex: hex.id,
            node: data.location
        });
        try {
            this.redraw();
        }
        catch(e) {
            if(e instanceof GameException) {
                Utils.showAlert('Cannot build: ' + e.message);
                this.currentTurn.actions.pop();
                return;
            }
            else {
                throw e;
            }
        }
    }
    handleInit(data, elements) {
        let normData = null;
        if(data.settlementHex) {
            normData = {
                construct: 'settlement',
                hex: data.settlementHex,
                location: data.settlementLocation
            };
        }
        else {
            normData = {
                construct: 'road',
                hex: data.roadHex,
                location: data.roadLocation
            };
        }
        this.buildConstruct(this.activePlayer, normData, true);
    }
    handleBuild(data, elements) {
        let player = this.activePlayer;
        if(!player.canPurchase(data.construct)) {
            Utils.showAlert('Insufficient resources to purchase ' + data.construct);
            return;
        }
        this.buildConstruct(player, data);
    }
    handleSave(evt) {
        if(this.game.isInitStage && this.currentTurn.actions.length != 2) {
            Utils.showAlert('You must select both a settlement and road');
            return;
        }
        let form = $('#posting');
        delete this.currentTurn['index'];
        delete this.currentTurn['isCurrent'];
        if(this.tradeOffers.length) {
            form.trade.value = JSON.stringify(this.tradeOffers);
        }

        const points = this.game.pointsFor(this.activePlayer);
        if(points.grandTotal >= this.game.pointsToWin) {
            this.currentTurn.actions.push({type: "win", points: points.grandTotal});
        }

        form.turn.value = JSON.stringify(this.currentTurn);
        form.submit();
    }
    handlePlayerTrade(evt) {
        let [offers, wants] = Array.from($$('#player-trade input')).map(e => {
            return parseTradeOffer(e.value)
        });

        if(!offers || !wants) {
            Utils.showAlert('Unable to understand trade offer');
            return false;
        }

        this.tradeOffers.push({offers: offers, wants: wants});
        let innerHTML = this.tradeOffers.map(t => `
            <li>Offered ${tradeString(offers)}
            for ${tradeString(wants)}</li>
        `);
        $('#trade-offers').innerHTML = `<ul>${innerHTML.join('')}</ul>`;
    }
    handleSyncPlayerTrade(evt) {
        let [offers, wants] = Array.from($$('#player-trade input')).map(e => {
            return parseTradeOffer(e.value)
        });
        let other = $('#player-trade select').value;
        if(!(offers && wants && other)) {
            Utils.showAlert('Unable to understand trade offer');
            return false;
        }
        let tradeData = {
            type: 'trade',
            by: 'player',
            trader: other,
            offers: offers,
            wants: wants
        };
        if(!this.game.canTrade(this.activePlayer, tradeData)) {
            Utils.showAlert('Cannot make that trade');
            return false;
        }
        this.currentTurn.actions.push(tradeData);
        this.redraw();
    }
    handleTrade(data, elements) {
        let el = $('[name="tradeBy"]:checked');
        if(!el) {
            Utils.showAlert('You must first select who you want to trade with');
            return false;
        }
        let tradeData = {
            type: 'trade',
            by: el.value,
            offers: data.tradeOffers,
            wants: data.tradeWants
        };
        if(!this.game.canTrade(this.activePlayer, tradeData)) {
            Utils.showAlert('Cannot make that trade');
            return false;
        }

        this.currentTurn.actions.push(tradeData);

        Utils.hideAll('#non-player-trade,#player-trade');
        el.checked = false;
        this.redraw();
    }
    playVictoryPoint() {
        const points = this.game.pointsFor(this.activePlayer);
        if(points.grandTotal < this.game.pointsToWin) {
            Utils.showAlert('You do not have enough points to win.')
        }

        this.currentTurn.actions.push({"type": "play", "card": "VP"});
    }
    playDevelopment(card, data) {
        if(this.currentTurn.actions.filter(e => e['Play']).length) {
            Utils.showAlert('Play only 1 development card per turn');
            console.log('Attempted to play 2nd dev card', card);
            return false;
        }
        this.currentTurn.actions.push({...data, type: 'play', card: card});
        $(`.development-${card}`, this.element).classList.add('hidden');
        this.redraw();
    }
    handleRB(data, elements) {
        const rbData = [
            [parseInt(data.rbHex1), data.rbNode1],
            [parseInt(data.rbHex2), data.rbNode2]
        ];
        for(const [hexId, edge] of rbData) {
            let hex = this.game.board.getHex(hexId);
            try {
                this.game.checkForConstruction(hex, 'road', edge, this.activePlayer.color);
            }
            catch(e) {
                if(e instanceof GameException) {
                    Utils.showAlert(e.message);
                    return false;
                }
            }
        }
        this.playDevelopment('RB', rbData);
    }
    handleKN(data, elements) {
        let hex = parseInt(data.knHex);
        let victim = data.knVictim === 'N/A' ? null : this.game.player(data.knVictim);
        this.playDevelopment('KN',{
            hex: hex,
            resource: victim === null ? null : victim.resources.pickRandom(),
            victim: data.knVictim
        });
    }
    handleMP(data, elements) {
        this.playDevelopment('MP', data)
    }
    handleVP(data, elements) {
        this.activePlayer;
    }
    handleDevelopmentBuy(evt) {
        let player = this.activePlayer;
        if(!player.canPurchase('development')) {
            Utils.showAlert('Insufficient resouces to purchase development card');
            return;
        }

        let devCard = this.game.nextDevCard();
        if(!devCard) {
            Utils.showAlert('No more dev cards available');
            evt.target.disabled = true;
            return;
        }

        this.currentTurn.actions.push({type: 'purchase', card: devCard});
        this.redraw();
    }
    handleRoll(evt) {
        let el = $('.actions', this.element);
        Utils.show(el);
        evt.target.remove();
        if(this.game.state.nextRoll === 7) {
            Utils.show('.with-robber');
        }
        else {
            Utils.show('.no-robber');
        }

        this.startTurn();
    }
    handleNav(evt) {
        let value = evt.currentTarget.dataset.value;
        if(value === 'undo') {
            this.undo();
            return;
        }
        let length = this.game.turns.length - 1;
        let i = this.turnIndex;
        if(
            (i === 0 && (value === 'start' || value === 'prev')) ||
            (i === length && (value === 'end' ||  value === 'next'))
        ) {
            return;
        }
        this.turnIndex = {prev: i - 1, next: i + 1, start: 0, end: length}[value];
        this.redraw();
    }
    undo() {
        if(this.currentTurn && this.currentTurn.actions.length) {
            if(window.confirm("Are you sure you want to undo your last action?")) {
                this.currentTurn.actions.pop();
                this.redraw();
            }
        }
        else {
            Utils.showAlert('Nothing to undo');
        }
    }
    disableGroup(group, toggle) {
        $$(`[data-group=${group}]`).forEach(el=>el.disabled=!!toggle);
    }
    redraw() {
        this.history = {};
        console.debug('redraw to ', this.turnIndex);
        this.game.playTo(this.turnIndex);
        this.view.renderGame(this.game, this.turnIndex);
        this.generalView.showStatus(this.game);
        if(
            !this.game.isInitStage &&
            this.currentTurn &&
            this.turnIndex === this.currentTurn.index
        ) {
            this.view.renderDice(this.game.state.nextRoll);
        }
        this.info();
        this.debugger();
        // let purchases = this.activePlayer.canPurchase();
    }
    setForm(name, value) {
        let el = $(`form input[name=${name}]`, this.element);
        el.value = `${value}`;
    }
    testSettlement(hexId, node, color) {
        let hex = this.game.board.getHex(hexId);
        return this.game.checkForConstruction(hex, 'settlement', node, color);
    }
    testLongestRoad() {
        let longestRoad = this.game.getLongestRoad();
    }
    debugger() {
        if(!this.debug) {
            return;
        }
        let turn = this.game.turns[this.turnIndex];
        let player = this.game.getPlayer(turn.color);
        let turnJSON = JSON.stringify(this.currentTurn, null, '  ');
        let rows = player.resources.toArray().map(r => `<th>${Resource[r[0]].name}</th>`);
        rows.push('<th>Total</th>');
        rows = rows.concat(player.devCards.toArray().map(d => `<th>${d[0]}</th>`))
        rows.push('</tr>')

        for(const p of this.game.players) {
            rows.push(`<tr><th>${p.color}<br>${p.name}</th>`);
            rows = rows.concat(p.resources.toArray().map(r => `<td>${r[1]}</td>`));
            rows.push('<th>' + p.resources.count + '</th>');
            rows = rows.concat(p.devCards.toArray().map(d => `<td>${d[1]}</td>`))
        }
        let debug = $('#debug');
        Utils.show(debug);
        debug.innerHTML = `<table class="table is-narrow is-bordered is-fullwidth">
            <tr><th>@ ${this.turnIndex}</th>
            ${rows.join('\n')}
        </table><pre>${turnJSON}</pre>`;
    }
}

const getParams = function() {
        let params = new URLSearchParams(window.location.search);
        return Array.from(params.entries()).reduce(function(acc, cur) {
            acc[cur[0]] = cur[1] || true;
            return acc;
        }, {});
};

const allClear = function() {
    $('#app').classList.add('good');
};

export const App = {
    play: function(options) {
        let json = $('#app-status').textContent;
        let status = JSON.parse(json);

        let params = getParams();
        let config = {
            debug: params.hasOwnProperty('debug'),
            showEmpty: params.hasOwnProperty('empty')
        };

        if(config.debug) {
            $$('.debug').forEach(e => e.classList.remove('hidden'));
        }

        if(params.user) {
            let r = /\d+/;
            status.user = r.test(params.user) ? parseInt(params.user) : params.user;
        }

        if(params.roll) {
            status.nextRoll = parseInt(params.roll);
        }

        let cfg = makeConfig(config);
        let ctrl = new Controller(status, cfg);
        if(params.go) {
            $('.roll-btn').click();
        }

        window.app = ctrl;
        window.gm = ctrl.game;
        window.bd = gm.board;
        window.vw = ctrl.view;
        window.ctx = vw.ctx;
        allClear()
    },
    testRandom(count=10) {
        console.time('randomize');
        for(let i = 0; i < count; i++) {
            let rb = Layouts.randomBoard().flat().join('');
            // console.log(i, rb);
        }
        console.timeEnd('randomize');
    },
    random(callback) {
        const randomize = function() {
            let layoutOption = $('[type="radio"]:checked');
            let layoutName = layoutOption ? layoutOption.value : 'standard34';
            let layout = Layouts[layoutName];
            let params = getParams();
            let cfg = makeConfig({
                debug: params.hasOwnProperty('debug'),
                showEmpty: params.hasOwnProperty('empty'),
                boardWidth: layout.grid.length,
                boardHeight: layout.grid[0].length,
                noHexNumbers: true
            });
            
            window.bd = new Board(layout, cfg);
            window.vw = new CanvasView($('#app'), cfg);

            window.bd.randomize(layout);
            window.vw.renderBoard(window.bd, false);
            if(callback) {
                callback(window.bd);
            }
        }

        $('#randomize').addEventListener('click', randomize);
        randomize();
        allClear();
    }
};
