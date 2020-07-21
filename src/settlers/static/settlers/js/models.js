const [Board, Game, GameException] = (function() {
    class GameException {
        constructor(message, data) {
            this.message = message;
            console.error(message, data);
        }
    }

    class Hex {
        constructor(i, j, resource, chit) {
            this.i = i;
            this.j = j;
            this.id = i * 10 + j + resource;
            this.resource = resource;
            this.chit = chit;

            this.vertexIds = [null, null, null, null, null, null];
            this.edgeIds = [null, null, null, null, null, null];
        }
        get isWater() { return this.resource === 'W'; }
        get isDesert() { return this.resource === 'D'; }
        get isEmpty() { return this.resource === 'X'; }
        get isLand() { return !(this.isWater || this.isEmpty); }
        toString() {
            const resName = Resource[this.resource].name;
            return `${this.id} ${resName}`;
        }
        edgeId(e) {
            if(Utils.isString(e)) {
                e = Const.nodeIndex[e];
            }
            return this.edgeIds[e];
        }
        vertexId(v) {
            if(Utils.isString(v)) {
                v = Const.nodeIndex[v];
            }
            return this.vertexIds[v];
        }
    }

    let nodeId = 0;

    class Node {
        constructor() {
            this.id = ++nodeId;
            this.color  = null;
            this.hexes = [];
            //this.values = [];
        }
        addHex(hex, node) {
            this.hexes.push(hex instanceof Hex ? hex.id : hex);
            // this.values.push({hex: hex.id, node: node});
        }
    }

    class Vertex extends Node {
        constructor() {
            super();
            this.construct = null;
            this.harbor = null;
        }
    }

    class Edge extends Node {
        constructor() {
            super();
            this.branches = [];
        }
        addHex(hex, node) {
            super.addHex(hex, node);
            this.branches.push({hex: hex.id, node: Const.nodeIndex[Const.nextNode[node]]});
            this.branches.push({hex: hex.id, node: Const.nodeIndex[Const.prevNode[node]]});
        }
        other(hex) {
            let id = hex instanceof Hex ? hex.id : hex;
            return this.hexes[0] === id ? this.hexes[1] : this.hexes[0];
        }
    }

    class Board {
        constructor(init, config) {
            this.init = init;
            this.config = config;
            this.hexes = [];
            this.hexMatrix = [];
            this.hexIds = {};

            let harborId = 0;
            this.harbors = init.harbors.reduce((acc, h) => {
                h.id = ++harborId;
                acc[h.id] = h;
                return acc;
            }, {});

            this.chits = {
                2: [], 3: [],  4: [],  5: [],  6: [],
                8: [], 9: [], 10: [], 11: [], 12: []
            };
            let humanId = 1;
            let grid = init.grid;
            if(Array.isArray(grid)) {
                grid = grid.flat();
                if(grid[0].length === 1) {
                    grid = grid.map(c => c + '0');
                }
                grid = grid.join('');
            }

            for(let j = 0; j < config.boardHeight; ++j) {
                let row = [];
                this.hexMatrix.push(row);
                for(let i = 0; i < config.boardWidth; ++i) {
                    // console.log(j, i);
                    let chit = parseInt(grid[1], 16);
                    let hex = new Hex(i, j, grid[0], chit);
                    row.push(hex);
                    chit && this.chits[chit].push(hex);
                    grid = grid.substring(2);
                    // if(hex.isEmpty && !this.config.showEmpty) {
                    //     continue;
                    // }
                    if(hex.isDesert) {
                        this.desert = hex;
                    }
                    this.hexes.push(hex);
                    if(hex.isLand) {
                        hex.id = humanId++;
                        this.hexIds[hex.id] = hex;
                    }
                }
            }
            this.hexes.forEach(hex => {
                if(hex.isWater) {
                    hex.id = humanId++;
                    this.hexIds[hex.id] = hex;
                }
            });
            this.vertices = {};
            this.edges = {};
            for(const hex of this.hexes) {
                if(hex.isEmpty) {
                    continue
                }
                let i = Utils.isEven(hex.j) ? hex.i - 1 : hex.i;
                for(const [j, v, w, e] of [[hex.j - 1, 0, 2, 4], [hex.j + 1, 3, 1, 5]]) {
                    let vertex = new Vertex();
                    vertex.addHex(hex, v);
                    this.vertices[vertex.id] = vertex;
                    hex.vertexIds[v] = vertex.id;

                    let west = this.getHex(i, j);
                    let east = this.getHex(i + 1, j);
                    if(west) {
                        west.vertexIds[w] = vertex.id;
                        vertex.addHex(west, w);
                    }
                    if(east) {
                        east.vertexIds[e] = vertex.id;
                        vertex.addHex(east, e);
                    }
                }
                
                let edges = [
                    [hex.i, hex.j - 1, 0, 3],
                    [hex.i + 1, hex.j, 1, 4],
                    [hex.i, hex.j + 1, 2, 5]
                ];
                if(!Utils.isEven(hex.j)) {
                    ++edges[0][0];
                    ++edges[2][0];
                }
                for(const [i2, j2, a, b] of edges) {
                    let edge = new Edge();
                    edge.addHex(hex, a);
                    this.edges[edge.id] = edge;
                    hex.edgeIds[a] = edge.id;

                    let other = this.getHex(i2, j2);
                    if(other) {
                        other.edgeIds[b] = edge.id;
                        edge.addHex(other, b)
                    }
                }
            }
            for(let harbor of Object.values(this.harbors)) {
                let hex = this.hexIds[harbor.hex];
                let vertex = this.getVertex(harbor.hex, harbor.edge)
                vertex.harbor = harbor.id;
                // harbor.vertices = [vertex.id];

                vertex = this.getVertex(harbor.hex, Const.nextNode[harbor.edge]);
                vertex.harbor = harbor.id;
                // harbor.vertices.push(vertex.id);
            }
        }
        randomize(layout) {
            layout = layout || Layouts.standard34;
            let rb = randomBoard(layout).flat();
            for(let hex of this.hexes) {
                hex.resource = rb.shift();
            }

            this.randomizeChits(layout.chits);
            this.randomizeHarbors(layout.harbors);
        }
        initialData() {
            let data = Utils.deepCopy(this.init);
            data.grid = this.hexes.map(h => h.resource + h.chit.toString(16)).join("");
            return data;
        }
        toJSON() {
            return JSON.stringify({'init': this.initialData()});
        }
        randomizeHarbors(harbors) {
            let conflict = false;
            let attempts = 0;
            let harborResources = harbors.map(h => h.resource);
            do {
                conflict = false;
                ++attempts;
                let resources = Utils.shuffle([...harborResources]);
                for(let harbor of harbors) {
                    let hex = this.getHex(harbor.hex);
                    let resource = resources.shift();
                    if(hex.resource === resource) {
                        if(
                            resources.length === 0 ||
                            (resources.length === 1 && resources[0] === resource)
                        ) {
                            conflict = true;
                            break;
                        }
                        resources.push(resource);
                        resource = resources.shift();
                    }
                    harbor.resource = resource;
                }
            } while(conflict);
            console.debug(`randomized harbors in ${attempts} attempt(s)`);
        }
        randomizeChits(originalChits) {
            let conflict = false;
            let attempts = 0;
            const checkNeighbors = function(ns, ch) {
                const six8 = [6, 8];
                for(let n of ns) {
                    if(n.chit === ch || (six8.includes(ch) && six8.includes(n.chit))) {
                        return false;
                    }
                }
                return true;
            };
            do {
                conflict = false;
                ++attempts;
                let chits = Utils.shuffle(originalChits.slice());
                for(let k of Object.keys(this.chits)) {
                    this.chits[k].length = 0;
                }
                for(let hex of this.hexes) {
                    if(hex.isLand && !hex.isDesert) {
                        let chit = chits.shift();
                        let tried = 0;
                        let neighbors = this.getHexNeighbors(hex, h => h.isLand && !h.isDesert);
                        let isGood = false;
                        while(!isGood) {
                            isGood = checkNeighbors(neighbors, chit);
                            if(isGood) {
                                hex.chit = chit;
                                this.chits[chit].push(hex);
                            }
                            else {
                                if(tried > chits.length) {
                                    conflict = true;
                                    isGood = true;
                                }
                                else {
                                    chits.push(chit);
                                    chit = chits.shift();
                                    ++tried;
                                }
                            }
                        }
                        if(conflict) {
                            break;
                        }
                    }
                }
            } while(conflict);
            console.debug(`randomized chits in ${attempts} attempt(s)`);
        }
        getEdge(hexKey, node) {
            let hex = this.hexIds[hexKey];
            let edgeId = hex.edgeId(node);
            return edgeId ? this.edges[edgeId] : null;
        }
        getVertex(hexKey, node) {
            let hex = this.hexIds[hexKey];
            let vertexId = hex.vertexId(node)
            return vertexId ? this.vertices[vertexId] : null;
        }
        reset() {
            for(let v of Object.values(this.vertices)) {
                v.color = v.construct = null;
            }
            for(let e of Object.values(this.edges)) {
                e.color = null;
            }
        }
        getHexNeighbors(hex, filter) {
            if(!(hex instanceof Hex)) {
                hex = this.getHex(hex);
            }
            filter = filter || (e => true);
            let neighbors = [];
            for(const e of ['a', 'b', 'c', 'd', 'e', 'f']) {
                const edge = this.edges[hex.edgeId(e)];
                const other = this.getHex(edge.other(hex));
                if(filter(other)) {
                    neighbors.push(other)
                }
            }
            return neighbors;
        }
        getHex(...args) {
            args = args.map(e => parseInt(e));
            if(args.length === 1) {
                return this.hexIds[args[0]];
            }
            const row = this.hexMatrix[args[1]];
            if(row) {
                return row[args[0]] || null;
            }
            return null;
        }
        validateRoadPlacement(hexId, node, color) {
            let edge = this.getEdge(hexId, node);
            if(edge.color) {
                throw new GameException('Already a ' + edge.color + ' road on that edge');
            }

            // first, check this hex's vertices
            let prev = this.getVertex(hexId, node);
            let next = this.getVertex(hexId, Const.nextNode[node]);
            if(prev.color !== color && next.color !== color) {
                // next, check the the edges on either side for this hex
                prev = this.getEdge(hexId, Const.prevNode[node]);
                next = this.getEdge(hexId, Const.nextNode[node]);
                if(prev.color !== color && next.color !== color) {
                    // now check the neighboring edges' hex
                    let otherHex = edge.hexes[0] === hexId ? edge.hexes[1] : edge.hexes[0];
                    let neighborEdge = Const.edgeNeighbor[node];

                    prev = this.getEdge(otherHex, Const.nextNode[neighborEdge]);
                    next = this.getEdge(otherHex, Const.prevNode[neighborEdge]);
                    if(prev.color !== color && next.color !== color) {
                        throw new GameException('Nothing to connect road to.');
                    }
                }
            }
        }
        validateSettlementPlacement(hexId, node, color, isInit) {
            let vertex = this.getVertex(hexId, node);
            if(vertex.color) {
                throw new GameException('Already a ' + color + 'settlement in the position');
            }
            let otherHex = this.getEdge(hexId, node).other(hexId);
            let neighborNode = Const.nextNode[Const.edgeNeighbor[node]];
            let otherEdge = this.getEdge(otherHex, neighborNode);

            if(!isInit) {
                if(
                    this.getEdge(hexId, node).color !== color &&
                    this.getEdge(hexId, Const.prevNode[node]).color !== color &&
                    otherEdge.color !== color
                ) {
                    throw new GameException('You need a road leading to that vertex to build a settlement');
                }
            }

            let otherVertex = this.getVertex(otherHex, Const.nextNode[neighborNode]);
            if(
                this.getVertex(hexId, Const.nextNode[node]).construct ||
                this.getVertex(hexId, Const.prevNode[node]).construct ||
                (otherVertex ? otherVertex.construct : false)
            ) {
                throw new GameException('Cannot build so close to other settlement');
            }
        }
        edgeSegment(segment, color) {
            let edge = this.getEdge(segment.hex, segment.node);
            let branches = [];
            for(const br of edge.branches) {
                let branchEdge = this.getEdge(br.hex, br.node);
                if(branchEdge.color === color) {
                    branches.push({
                        hex: br.hex,
                        node: br.node,
                        edgeId: branchEdge.id,
                        color: branchEdge.color
                    });
                }
            }
            return branches.length ? {
                hex: segment.hex,
                node: segment.node,
                id: edge.id,
                color: color,
                branches: branches
            } : null;
        }
        getLongestRoad(players) {
            let longest = [];
            players.forEach(player => {
                let path = this.longestRoadFor(player);
                longest.push([path ? path.length : 0, player, path]);
            });
            longest.sort((a, b) => b[0] - a[0]);
            console.log(longest);
        }
        longestRoadFor(player) {
            let roads = player.playedConstructs.filter(c => c.type === 'road');
            let segments = [];
            let segment = null;
            for(const r of roads) {
                segment = this.edgeSegment(r, player.color);
                if(segment) {
                    segments.push(segment);
                }
            }

            let paths = [];
            for (segment of segments) {
                this.walkSegments(segment, player.color, {}, [], paths);
            }
            //console.log(paths);
            let longest = null;
            if(paths) {
                paths.sort((a, b) => b.length - a.length);
                // console.log('Longest for', player.color, paths[0]);
                return paths[0];
            }
            //console.log('No paths');
            return null;
        }
        walkSegments(segment, color, seen, currentPath, paths) {
            if(seen[segment.id]) {
                console.log("We've seen this, how'd we get here?");
                return;
            }
            seen[segment.id] = true;
            currentPath.push([segment.hex, segment.node, segment.id])

            let branchSegments = [];
            let seenCopy = Object.assign({}, seen);
            for(const branch of segment.branches) {
                let branchSegment = this.edgeSegment(branch, color)
                if(branchSegment && !seen[branchSegment.id]) {
                    seenCopy[branchSegment.id] = true
                    branchSegments.push(branchSegment);
                }
            }
            if(!branchSegments.length) {
                paths.push(currentPath);
            }
            else {
                for(let branchSegment of branchSegments) {
                    seenCopy[branchSegment.id] = false;
                    this.walkSegments(
                        branchSegment,
                        color,
                        seenCopy,
                        Utils.deepCopy(currentPath),
                        paths
                    );
                }
            }
        }
    }


    class BaseResources {
        constructor(items) {
            this._played = {};
            items.forEach(i => {
                this[i] = this._played[i] = 0;
            });
        }
        add(item, count=1) {
            this[item] += count;
        }
        toString() {
            let lines = [];
            for(const [k, v] of Object.entries(this)) {
                if(k.charAt(0) !== '_') {
                    let name = Resource[k].name;
                    if(v) {
                        lines.push(`${name}(${v})`);
                    }
                }
            }
            return lines.join(', ');
        }
        get count() {
            return this.toArray().reduce((accum, curr) => accum + curr[1], 0);
        }
        toArray() {
            let entries = Object.entries(this);
            return entries.filter(kvp => kvp[0][0] != '_');
        }
    }

    class DevCards extends BaseResources {
        constructor() {
            super(['KN', 'MP', 'RB', 'VP', 'YP']);
        }
        get played() {
            let items = [];
            for(const [k, v] of Object.entries(this._played)) {
                if(v) {
                    items.push([k ,v]);
                }
            }
            return items;
        }
        deplete(card, count=1) {
            if(!this[card] || this[card] < count) {
                throw new GameException(`Cannot deplete ${count} ${card}(s) from ${this}`);
            }
            else {
                this[card] -= count; 
                this._played[card] += count;
            }
        }
    }

    class Resources extends BaseResources {
        constructor() {
            super(['B', 'O', 'S', 'T', 'G']);
        }
        deplete(construct, count=1) {
            let values = construct;
            if(Utils.isString(construct)) {
                values = construct.length === 1 ? [[construct, 1]] : Purchase[construct];
            }
            for(const [k, v] of values) {
                let cost = v * count;
                if((this[k] - cost) < 0) {
                    throw new GameException(`Cannot deplete ${v} ${k} from ${this}`);
                }
                else {
                    this[k] -= cost;
                    this._played[k] += cost;
                }
            }
        }
        pickRandom(count=1) {
            let values = Object.entries(this).reduce(
                (acc, c) => acc.concat(...c[0].repeat(c[1])),
                []
            );
            if(values.length < count) {
                console.warn(`Cannot pick ${count} random, only ${values.length} available`);
                return null;
            }
            values = Utils.shuffle(values);
            return values.slice(0, count).join('');
        }
        validPurchase(kind) {
            const checks = Purchase.evaluate(this);
            return kind ? checks[kind] : checks;
        }
    }

    class Player {
        constructor(attrs, constructs) {
            this.name = attrs.name;
            this.color = attrs.color;
            this.id = attrs.id;
            this.resources = null;
            this.devCards = null;
            this.originalConstructs = constructs;
        }
        canPurchase(what) {
            return this.resources.validPurchase(what);
        }
        get status() {
            return `${this.resources}, ${this.devCards}`;
        }
        toString() {
            return `${this.name}, ${this.color}, ${this.resources.count} card(s)`;
        }
        reset() {
            this.resources = new Resources();
            this.devCards = new DevCards();
            this.constructs = Utils.deepCopy(this.originalConstructs);
            this.knightCardsPlayed = 0;
            this.longestRoad = false;
            this.largestArmy = false;
            this.playedConstructs = [];
            this.harbors = [];
        }
        isEqual(other) {
            return this.id === other.id;
        }
        get victoryPoints() {
            return this.devCards.VP;
        }
        pointsFor(game) {
            let pts = this.playedConstructs.filter(e => e.type !== 'road').length;
            let result = {build: pts};
            if(game.longestRoad === this.color) {
                pts += 2;
                result.longestRoad = 2;
            }
            if(game.largestArmy === this.color) {
                pts += 2;
                result.largestArmy = 2;
            }
            result.total = pts;
            return result;
        }

    }

    class Players {
        constructor(state) {
            this._players = [];
            this._playersMap = {};
            for(const p of state.players) {
                const player = new Player(p, Utils.deepCopy(state.init.constructs));
                this._players.push(player);
                this._playersMap[p.id] = player;
                this._playersMap[p.color] = player;
            }
            this.length = this._players.length;
            this.activePlayer = (() => {
                const numTurns = state.turns.length;
                const numPlayers = this._players.length;

                let offset = numTurns % numPlayers;
                if(numTurns >= numPlayers && numTurns < numPlayers * 2) {
                    offset = numPlayers + ~offset;
                }

                return this._players[offset]
            })();
        }
        get(key) {
            return this._playersMap[key];
        }
        orderedAfter(color) {
            const i = this._players.findIndex(p => p.color === color);
            return this._players
                       .slice(i + 1, this.length)
                       .concat(this._players.slice(0, i))
                       .map(p => p.color);
        }
        forEach(callback) {
            for(const player of this._players) {
                callback(player);
            }
        }
        reset() {
            this._players.forEach(p => p.reset());
        }
        rob() {
            let losses = [];
            for(let player of this._players) {
                let count = player.resources.count;
                if(count > 7) {
                    count = Math.floor(count / 2);
                    losses.push([player.color, player.resources.pickRandom(count)]);
                }
            }
            return losses;
        }
        debug() {
            console.log(this._players.map(p => {
                return [
                    p.color + ':',
                    p.resources.toString() || '--',
                    '|',
                    p.devCards.toString() || '--'
                ].join(' ');
            }).join('\n'));
        }
    }

    class Game {
        constructor(state, cfg) {
            this.cfg = cfg;
            this.state = state;
            this.board = new Board(state.init, this.cfg);
            this.currentTurn = null;
            this.players = new Players(state);
            this.activePlayer = this.players.activePlayer;
            this.reset();
            this.runs = [];
        }
        get isInitStage() {
            return this.players.length * 2 > this.state.turns.length;
        }
        orderedPlayersAfter(color) {
            return this.players.orderedAfter(color);
        }
        pointsFor(player) {
            return player.pointsFor(this);
        }
        getLongestRoad() {
            let longestRoad = this.board.getLongestRoad(this.players);
        }
        reset() {
            this.constructs = [];
            this.players.reset();
            this.board.reset();

            this.longestRoad = null;
            this.longestRoadCount = 4;
            this.longestRoadPath = [];

            this.largestArmy = null;
            this.largestArmyCount = 2;

            this.robber = this.board.getHex(this.state.init.robber || this.board.desert);
            this.turns = Utils.deepCopy(this.state.turns);
            if(this.currentTurn) {
                this.turns.push(this.currentTurn);
            }
            this.turns.forEach((t,i) => t.index = i);
            this.resourceCards = Utils.deepCopy(this.state.init.resourceCards);
            this.devCards = Utils.shuffle(
                Object.entries(this.state.init.developmentCards).flatMap(
                    e=>Array(e[1]).fill(e[0])
                )
            );
        }
        nextDevCard() {
            return this.devCards.length ? this.devCards[0] : null;
        }
        removeDevCard(card) {
            let index = this.devCards.indexOf(card);
            if(index < 0) {
                console.error(`Error removing ${card} from devCards ${this.devCards}`);
                return;
            }
            this.devCards.splice(index, 1);
        }
        getPlayer(key) {
            return this.players.get(key);
        }
        initializeRobber() {
            let action = {type: 'robber', losses: this.players.rob()};
            this.currentTurn.actions.push(action);
        }
        playTo(index) {
            this.reset();
            let run = [];
            this.runs.push([index, run]);

            for(let i = 0; i <= index; i++) {
                let turn  =  this.turns[i];
                if(turn.breakpoint) {
                    console.log('breakpoint at turn ' + turn.index);
                }

                let player = this.players.get(turn.color);
                let isInit = !turn.roll;
                if(isInit) {
                    this._playInitConstruction(turn);
                }
                else {
                    // No resource collection on 7
                    if(turn.roll !== 7) {
                        // collect for hexes matching this roll
                        this._playPlayerResources(turn.roll);
                    }
                }
                for(const action of turn.actions) {
                    Utils.dispatch('history', {...action, color: player.color, index: turn.index});
                    if(action.type === 'robber') {
                        this._playRobber(turn, action, player);
                    }
                    else if(action.type === 'purchase') {
                        this._playPurchaseDevCard(turn, action, player)
                    }
                    else if(action.type === 'play') {
                        this._playPlayDevCard(turn, action, player);
                    }
                    else if(action.type === 'trade') {
                        this._playTrade(turn, action, player);
                    }
                    else if(['road', 'settlement', 'city'].includes(action.type)) {
                        this._playConstruction(turn, action, player, isInit);
                    }
                    else {
                        throw new GameException('Unknown action type', action);
                    }
                }
                let msg = `${turn.index.toString().padStart(2, ' ')}`;
                run.push(msg);
            }
        }
        _playTrade(turn, action, player) {
            const cost = this.canTrade(player, action);
            if(!cost) {
                throw new GameException('Cannot make trade', action);
            }
            if(action.by === 'player') {
                const other = this.players.get(action.trader);
                for(const offer of action.offers) {
                    player.resources.deplete(offer.resource, offer.count);
                    other.resources.add(offer.resource, offer.count);
                }
                for(const want of action.wants) {
                    player.resources.add(want.resource, want.count);
                    other.resources.deplete(want.resource, want.count);
                }
            }
            else {
                player.resources.deplete(action.offers, cost);
                player.resources.add(action.wants);
            }
        }
        _playPlayDevCard(turn, action, player) {
            switch(action.card) {
                case 'RB':
                    for(const [hexId, edge] of action.roads) {
                        this.constructs.push({
                            type: "road",
                            hex: hexId,
                            node: edge,
                            color: player.color
                        });
                    }
                    player.devCards.deplete('RB');
                    break;
                case 'YP':
                    player.resources.add(action.yp1);
                    player.resources.add(action.yp2);
                    player.devCards.deplete('YP');
                    break;
                case 'MP':
                    let kind = action.monopolize;
                    for(const p of this.players._players) {
                        if(p.isEqual(player)) {
                            continue;
                        }
                        if(p.resources[kind]) {
                            player.resources.add(kind, p.resources[kind]);
                            p.resources[kind] = 0;
                        }
                    }
                    player.devCards.deplete('MP');
                    break;
                case 'KN':
                    this._playRobber(turn, action, player);
                    player.knightCardsPlayed += 1;
                    player.devCards.deplete('KN');
                    break;
            }
        }
        _playPurchaseDevCard(turn, action, player) {
            player.devCards.add(action.card);
            player.resources.deplete('development');
        }
        _playInitConstruction(turn) {
            if(turn.index >= this.players.length) {
                // Collect resources for 2nd settlement
                let construct = turn.actions[0];
                let hex = this.board.getHex();
                
                // let vertex = hex.vertex(construct.node);
                let vertex = this.board.getVertex(construct.hex, construct.node);
                for(const hexId of vertex.hexes) {
                    let hex = this.board.getHex(hexId);
                    if(hex.isLand && !hex.isDesert) {
                        this.players.get(turn.color).resources.add(hex.resource, 1);
                    }
                }
            }
        }
        _playConstruction(turn, action, player, isInit) {
            if(!player.constructs[action.type] && turn.isCurrent) {
                throw new GameException(`You do not have any more ${action.type}s`);
                return;
            }
            let hex = this.board.getHex(action.hex);
            if(!hex) {
                console.error('Could not find hex for', action);
            }

            this.constructs.push({...action, color: player.color});
            player.playedConstructs.push({...action});

            let node = null;
            if(action.type ==='road') {
                node = this.board.getEdge(hex.id, action.node);

            }
            else {
                node = this.board.getVertex(hex.id, action.node);
                if(action.type == 'settlement') {
                    if(node.harbor) {
                        let harbor = this.board.harbors[node.harbor];
                        player.harbors.push(harbor.resource || '?');
                    }
                }
                
            }
            node.color = player.color;
            node.construct = action.type

            --player.constructs[action.type];
            if(action.type === 'city') {
                ++player.constructs['settlement'];
            }
            if(!isInit) {
                player.resources.deplete(action.type);
            }

            if(action.type === 'road') {
                let path = this.board.longestRoadFor(player);
                if(path) {
                    if(path.length > this.longestRoadCount) {
                        this.longestRoadCount = path.length;
                        this.longestRoad = player.color;
                        this.longestRoadPath = path;
                    }
                }
            }
        }
        _playRobber(turn, action, player) {
            if(action.losses && action.losses.length) {
                for(const [color, losses] of action.losses) {
                    let other = this.players.get(color);
                    for(const card of losses) {
                        other.resources.deplete(card);
                    }
                }
            }
            if(action.hex) {
                this.robber = this.board.getHex(action.hex);
            }
            if(action.victim && action.resource) {
                let victim = this.players.get(action.victim)
                victim.resources.deplete(action.resource);
                player.resources.add(action.resource);
            }
        }
        _playPlayerResources(roll) {
            for(const hex of this.board.chits[roll]) {
                if(hex.id === this.robber.id) {
                    continue;
                }
                for(const vertexId of hex.vertexIds) {
                    let vertex = this.board.vertices[vertexId];
                    if(vertex.color) {
                        this.players.get(vertex.color).resources.add(
                            hex.resource,
                            vertex.construct === 'city' ? 2 : 1
                        );
                    }
                }
            }
        }
        get viewingPlayer() {
            return this.state.user ? this.players.get(this.state.user) : null;
        }
        canTrade(player, data) {
            if(data.by === 'bank') {
                if(player.resources[data.offers] >= 4) {
                    return 4;
                }
            }
            else if(data.by === 'harbor') {
                if(player.harbors.length) {
                    if(player.harbors.includes(data.offers)) {
                        return 2;
                    }
                    if(player.harbors.includes('?')) {
                        return 3;
                    }
                }
            }
            else if(data.by === 'player') {
                const other = this.players.get(data.trader);
                for(const offer of data.offers) {
                    if(player.resources[offer.resource] < offer.count) {
                        return 0;
                    }
                }
                for(const want of data.wants) {
                    if(other.resources[want.resource] < want.count) {
                        return 0;
                    }
                }
                return 1;
            }
            return 0;
        }
        checkForConstruction(hex, type, node, color, isInit=false) {
            console.log(`In Game.construct with ${hex.id}, ${type} ${node} ${color}`);
            if(type === 'road') {
                this.board.validateRoadPlacement(hex.id, node, color)
            }
            else if(type === 'settlement') {
                this.board.validateSettlementPlacement(hex.id, node, color, isInit);
            }
            else if(type === 'city') {
                let vertex = this.board.getVertex(hex.id, node);
                if(vertex.color !== color && vertex.construct !== 'settlement') {
                    throw new GameException('You need an existing settlement first');
                }
            }
            return true;
        }
    }
    return [Board, Game, GameException];
})();
