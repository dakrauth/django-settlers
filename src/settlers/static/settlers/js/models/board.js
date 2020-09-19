import { Utils } from '../utils.js'
import { Mapping, Resource, Layouts } from '../common.js';

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
            e = Mapping.nodeIndex[e];
        }
        return this.edgeIds[e];
    }
    vertexId(v) {
        if(Utils.isString(v)) {
            v = Mapping.nodeIndex[v];
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
    }
    addHex(hex, node) {
        this.hexes.push(hex instanceof Hex ? hex.id : hex);
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
        this.branches.push({hex: hex.id, node: Mapping.nodeIndex[Mapping.nextNode[node]]});
        this.branches.push({hex: hex.id, node: Mapping.nodeIndex[Mapping.prevNode[node]]});
    }
    other(hex) {
        let id = hex instanceof Hex ? hex.id : hex;
        return this.hexes[0] === id ? this.hexes[1] : this.hexes[0];
    }
}

const reDigits = /\d+/;

class Harbor {
    constructor(location, resource) {
        this.id = location;
        this.resource = resource;
        this.edge = location.replace(reDigits, "");
        this.hex = parseInt(location);
    }
    static factory(harborJSON) {
        // harborJSON will be an object of from {location: resource, ...}
        return Object.entries(harborJSON).reduce((acc, h) => {
            const harbor = new Harbor(h[0], h[1]);
            acc[harbor.id] = harbor;
            return acc;
        }, {});
    }
}

export class Board {
    constructor(init, config) {
        this.init = init;
        this.config = config;
        this.hexes = [];
        this.hexMatrix = [];
        this.hexIds = {};

        this.harbors = Harbor.factory(init.harbors);
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
            harbor.vertices = [vertex.id];

            vertex = this.getVertex(harbor.hex, Mapping.nextNode[harbor.edge]);
            vertex.harbor = harbor.id;
            harbor.vertices.push(vertex.id);
        }
    }
    randomize(layout) {
        layout = layout || Layouts.standard34;
        let rb = Layouts.randomBoard(layout).flat();

        for(let hex of this.hexes) {
            hex.resource = rb.shift();
        }

        this.randomizeChits(layout.chits);
        this.randomizeHarbors(Object.values(Harbor.factory(layout.harbors)));
        let data = this.initialData();
        data.actual = {harbors: Utils.deepCopy(Object.values(this.harbors))};
        console.log()
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
        this.harbors = harbors;
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
        let next = this.getVertex(hexId, Mapping.nextNode[node]);
        if(prev.color !== color && next.color !== color) {
            // next, check the the edges on either side for this hex
            prev = this.getEdge(hexId, Mapping.prevNode[node]);
            next = this.getEdge(hexId, Mapping.nextNode[node]);
            if(prev.color !== color && next.color !== color) {
                // now check the neighboring edges' hex
                let otherHex = edge.hexes[0] === hexId ? edge.hexes[1] : edge.hexes[0];
                let neighborEdge = Mapping.edgeNeighbor[node];

                prev = this.getEdge(otherHex, Mapping.nextNode[neighborEdge]);
                next = this.getEdge(otherHex, Mapping.prevNode[neighborEdge]);
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
        let neighborNode = Mapping.nextNode[Mapping.edgeNeighbor[node]];
        let otherEdge = this.getEdge(otherHex, neighborNode);

        if(!isInit) {
            if(
                this.getEdge(hexId, node).color !== color &&
                this.getEdge(hexId, Mapping.prevNode[node]).color !== color &&
                otherEdge.color !== color
            ) {
                throw new GameException('You need a road leading to that vertex to build a settlement');
            }
        }

        let otherVertex = this.getVertex(otherHex, Mapping.nextNode[neighborNode]);
        if(
            this.getVertex(hexId, Mapping.nextNode[node]).construct ||
            this.getVertex(hexId, Mapping.prevNode[node]).construct ||
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
