const CanvasView = (function() {
    // This file is riddled with magic numbers and values. Yay!

    // The parametric equation for a circle is
    //     x = cx + r * cos(𝚹)
    //     y = cy + r * sin(𝚹)
    // 
    // Where r is the radius, cx,cy the origin, and a the angle.
    // Note use radians for angle in trig functions 0..2PI radians: (𝚹 * Math.PI / 180)

    class LineSegment {
        constructor(a, b) {
            this.a = a;
            this.b = b;
        }
        get length() {
            return Math.sqrt(
                Math.pow(this.a.x - this.b.x, 2) +
                Math.pow(this.a.y - this.b.y, 2)
            );
        }
        atDistanceFrom(d) {
            let dir = 1;
            if(d < 0) {
                dir = -1;
                d *= -1;
            }
            return point(
                this.a.x - dir * (d * (this.a.x - this.b.x)) / this.length,
                this.a.y - dir * (d * (this.a.y - this.b.y)) / this.length
            );
        }
        get center() {
            const length = this.length;
            const d2 = length / 2;
            return point(
                this.a.x - (d2 * (this.a.x - this.b.x)) / length,
                this.a.y - (d2 * (this.a.y - this.b.y)) / length
            );
        }
        intersection(other) {
            // Check if none of the lines are of length 0
            let [x1, y1, x2, y2] = [this.a.x, this.a.y, this.b.x, this.b.y];
            let [x3, y3, x4, y4] = [other.a.x, other.a.y, other.b.x, other.b.y];
            if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
                return false;
            }

            let denom = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

            // Lines are parallel
            if (denom === 0) {
                return false;
            }

            let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
            let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
            return point(x1 + ua * (x2 - x1), y1 + ua * (y2 - y1));
        }
    }


    const hexDimensionsFactory = function(n, i) {
        const C = n * Math.sin(Math.PI / 3);
        const offsets1 = [
            [0, -n], [C, -n / 2], [C, n / 2],
            [0, n],  [-C, n / 2], [-C, -n / 2]
        ];
        
        const n2 = n - i;
        const c2 = n2 * Math.sin(Math.PI / 3);
        offsets2 = [
            [0, -n2], [c2, -n2 / 2], [c2, n2 / 2],
            [0, n2],  [-c2, n2 / 2], [-c2, -n2 / 2]
        ];

        const makePoint = function(center) {
            return pt => point(center.x + pt[0], center.y + pt[1]);
        };

        return {
            indicesToCenterPoint: function(i, j) {
                const x = i * C * 2 + ((j % 2) * C);
                const y = j * (n * 1.5);
                return point(x + C, y + n);
            },
            makeDims: function(center) {
                const mapper = makePoint(center);
                const vertices = offsets1.map(mapper);

                let [start, ...pts] = vertices;
                let path = new Path2D();
                path.moveTo(start.x, start.y);
                for(const pt of pts) {
                    path.lineTo(pt.x, pt.y);
                }
                path.closePath();

                return {
                    path: path,
                    center: center,
                    points: vertices,
                    edges: [
                        new LineSegment(vertices[0], vertices[1]),
                        new LineSegment(vertices[1], vertices[2]),
                        new LineSegment(vertices[2], vertices[3]),
                        new LineSegment(vertices[3], vertices[4]),
                        new LineSegment(vertices[4], vertices[5]),
                        new LineSegment(vertices[5], vertices[0])
                    ],
                    innerPoints: offsets2.map(mapper)
                }
            },
            dimsForPoint: function(center) {
                return this.makeDims(center);
            },
            dims: function(i, j) {
                const center = this.indicesToCenterPoint(i, j);
                let dims = this.makeDims(center);
                dims.i = i;
                dims.j = j;
                return dims;
            }
        };
    };

    class CanvasView {
        constructor(canvas, config) {
            this.config = config;
            this.canvas = canvas;
            this.ctx = this.canvas.getContext('2d');
            this.ctx.font = '13pt Calibri';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.lineWidth = 1;
            this.fontFamily = 'Calibri'
            this.fonts = {
                xsmall: `8pt ${this.fontFamily}`,
                small: `9pt ${this.fontFamily}`,
                medium: `13pt ${this.fontFamily}`,
                large: `20pt ${this.fontFamily}`,
                xlarge: `30pt ${this.fontFamily}`
            }
            this.dims = [];
            this.hexFactory = hexDimensionsFactory(config.sideLength, 3);
            for(let j = 0; j < config.boardHeight; ++j) {
                let row = [];
                this.dims.push(row);
                for(let i = 0; i < config.boardWidth; ++i) {
                    // row.push(hexDims(j, i, this.calc));
                    row.push(this.hexFactory.dims(j, i));
                }
            }
            this.flatDims = this.dims.flat();
            this.erase();
            this.canvas.addEventListener('mousemove', this.mouseMoveListener.bind(this));
        }
        mouseMoveListener(evt) {
            this.getHexRelativeTo(evt.clientX, evt.clientY);
        }
        get test() { return makeHexDims; }
        hexDims(hex) {
            const isArray = Array.isArray(hex);
            const [i, j] = isArray ? [hex[0], hex[1]] : [hex.i, hex.j];
            if(isArray) {
                if(i >= this.config.boardWidth || j >= this.config.boardHeight) {
                    return this.hexFactory.dims(i, j);
                }
            }
            return this.dims[i][j];
        }
        drawOpts(opts) {
            if(opts.stroke) {
                this.ctx.strokeStyle = opts.stroke;
                this.ctx.stroke();
            }
            if(opts.fill) {
                this.ctx.fillStyle = opts.fill;
                this.ctx.fill();
            }
        }
        drawCircle(pt, radius, opts) {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
            opts && this.drawOpts(opts);
        }
        drawHex(vertices, opts) {
            const [start, ...points] = vertices;
            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            for(const pt of points) {
                this.ctx.lineTo(pt.x, pt.y);
            }
            this.ctx.closePath();
            if(opts) {
                this.drawOpts(opts);
            }
        }
        drawChit(chit, pt) {
            const clr = (chit === 6 || chit === 8) ? "#c00" : "#333";
            this.drawCircle(pt, 15, {stroke: "#333", fill: "#fff"});
            this.drawText(`${chit}`, pt, clr);
            this.drawText(Const.diceDistroText[chit], point(pt.x, pt.y + 5), clr);
        }
        drawText(text, pt, style, size) {
            this.ctx.save();
            size = size || 'medium';
            this.ctx.font = this.fonts[size];
            this.ctx.fillStyle = style;
            this.ctx.fillText(text, pt.x, pt.y);
            this.ctx.restore();
        }
        drawHelper() {
            let helpHex = this.hexFactory.dimsForPoint(point(60, 585));
            const points = helpHex.points;
            let names = ['a', 'b', 'c', 'd', 'e', 'f'];
            this.ctx.save();
            for(const name of names) {
                this.drawRoad(points, name, 'white');
                const center = this.edgeCenter(name, points);
                this.drawCircle(center, 6, {stroke: 'red', fill: 'white'});
                this.drawText(name, center, 'red', 'small');
            }
            for(const pt of points) {
                const name = names.shift();
                this.drawSettlement(points[Const.nodeIndex[name]], 'white');
                this.drawText(name, point(pt.x, pt.y + 4), 'green', 'small');
            }
            this.ctx.restore();
        }
        drawDice(a, b) {
            this.ctx.save()
            const x = 60;
            const y = 475;
            this.ctx.fillStyle = '#faa';
            this.ctx.fillRect(x + 3, y + 10, 15, 15);
            this.ctx.fillStyle = 'yellow';
            this.ctx.fillRect(x + 28, y + 10, 15, 15);

            this.ctx.font = '36px monospace'
            this.ctx.textAlign = 'start';
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = '#800';
            let txt = this.ctx.measureText(Const.dice[a]);
            this.ctx.fillText(Const.dice[a], x, y);
            this.ctx.fillText(Const.dice[b], x + 25, y);

            this.ctx.clearRect(x + 50, y + 10, 35, 25);
            this.drawText('= ' + (a + b), point(x + 50, y + 10), '#000');
            this.ctx.restore();
        }
        edgeCenter(edge, points) {
            const [i, j] = Const.edgeIndices[edge];
            const line = new LineSegment(points[i], points[j]);
            return line.center;
        }
        drawRoad(points, edge, color, isLongest) {
            let ctx = this.ctx;
            const center = this.edgeCenter(edge, points);
            const [width, height] = [5, 30];
            const x = center.x - width / 2;
            const y = center.y - height / 2;

            ctx.save()
            if(edge === 'c' || edge === 'f' || edge === 'a' || edge === 'd') {
                let rotate = (Math.PI / 180) * 60;
                if(edge === 'a' || edge === 'd') {
                    rotate = -rotate;
                }
                ctx.translate(x + .5 * width, y + .5 * height);
                ctx.rotate(rotate);
                ctx.translate(-(x + .5 * width), -(y + .5 * height));
            }
            ctx.fillStyle = color;
            ctx.strokeStyle = color === Color.blue ? '#fff' : '#000';
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);

            if(isLongest) {
                this.drawCircle(center, 2, {fill: "#fff"});
            }
            
            ctx.restore();
        }
        drawSettlement(pt, color) {
            let ctx = this.ctx;
            ctx.save()
            ctx.beginPath();
            const size = 8;
            ctx.moveTo(pt.x - size, pt.y);
            ctx.lineTo(pt.x, pt.y - size);
            ctx.lineTo(pt.x + size, pt.y);
            ctx.lineTo(pt.x + size, pt.y + 1.5 * size);
            ctx.lineTo(pt.x - size, pt.y + 1.5 * size);
            ctx.closePath();
            this.drawOpts({
                fill: color,
                stroke: color === Color.blue ? '#fff' : '#000'
            });
            ctx.restore();
        }
        drawCity(pt, color) {
            let ctx = this.ctx;
            ctx.save()
            ctx.beginPath();
            const size = 8;
            const y = pt.y - 10;
            ctx.moveTo(pt.x - size, y);
            ctx.lineTo(pt.x, y - size);
            ctx.lineTo(pt.x + size, y);
            ctx.lineTo(pt.x + size, y + size);
            ctx.lineTo(pt.x + 2 * size, y + size);
            ctx.lineTo(pt.x + 2 * size, y + 2.8 * size);
            ctx.lineTo(pt.x - size, y + 2.8 * size);
            ctx.closePath();
            ctx.lineWidth = 2;
            this.drawOpts({
                fill: color,
                stroke: color === Color.blue ? '#fff' : '#000'
            });
            ctx.restore();
        }
        drawRobber(x, y) {
            let ctx = this.ctx;
            ctx.save();
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.fillStyle = '#222';
            ctx.strokeStyle = 'white';

            ctx.beginPath();
            ctx.ellipse(x, y, 8, 12, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath()
            ctx.arc(x, y - 16, 6, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();

            ctx.beginPath()
            ctx.arc(x, y + 18, 10, -Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
        erase() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        getHexRelativeTo(clientX, clientY) {
            //return null;
            let rect = this.canvas.getBoundingClientRect();
            let [x, y] = [clientX - rect.left, clientY - rect.top];
            let indices = {x: x, y: y, i: -1, j: -1}

            for(const dim of this.flatDims) {
                if(this.ctx.isPointInPath(dim.path, x, y)) {
                    indices.i = dim.i;
                    indices.j = dim.j;
                }
            }
            this.showMouse(indices);
            return indices;
        }
        showMouse(indices) {
            let {x, y, i, j} = indices;
            x = x.toFixed().padStart(3);
            y = y.toFixed().padStart(3);
            i = i.toFixed().padStart(2);
            j = j.toFixed().padStart(2);
            let msg = `x: ${x}, y: ${y} | [${i},${j}]`;
            this.ctx.save();
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textAlign = 'left';
            this.ctx.font = '12px monospace';
            this.ctx.fillStyle = '#777';
            this.ctx.clearRect(479, 671, 182, 22);
            this.ctx.fillText(msg, 485, 685);
            this.ctx.restore()
        }
        renderHex(hex) {
            if(hex.isEmpty && !this.config.showEmpty) {
                return;
            }

            const dims = this.hexDims(hex);
            let center = dims.center;
            const resource = Resource[hex.resource];
            const end = dims.points.length - 1;

            this.drawHex(dims.points, {stroke: "#ddd"});
            if(hex.isWater) {
                const [a, b] = [
                    dims.edges[Const.nodeIndex.f].center,
                    dims.edges[Const.nodeIndex.c].center
                ];
                let gradient = this.ctx.createLinearGradient(
                    a.x, a.y,
                    b.x, b.y
                );
                gradient.addColorStop(0, '#a3d9e9');
                gradient.addColorStop(1, resource.bgColor);
                this.drawHex(dims.innerPoints, {fill: gradient});
            }
            else {
                this.drawHex(dims.innerPoints, {fill: Resource[hex.resource].bgColor});
            }

            const isDebug = this.config.debug;
            if(!isDebug && (hex.isWater || hex.isEmpty)) {
                return;
            }
            if(!this.config.noHexNumbers) {
                this.drawText(hex.id, point(center.x, center.y - 25), resource.fgColor, 'large');
            }
            this.drawText(
                this.config.debug ? `[${hex.i}:${hex.j}]` : resource.name,
                point(center.x, center.y + 25),
                resource.fgColor, 'small'
            );

            if(hex.chit) {
                this.drawChit(hex.chit, center);
            }
        }
        renderHarbor(harbor, hex) {
            const dims = this.hexDims(hex);
            const edge = dims.edges[Const.nodeIndex[harbor.edge]];
            const prev = dims.edges[Const.prevNode[harbor.edge]];
            const next = dims.edges[Const.nextNode[harbor.edge]];
            const ctx = this.ctx;
            const N = 24;
            const pt1 = prev.atDistanceFrom(this.config.sideLength + N);
            const pt2 = next.atDistanceFrom(-N);
            const intersect = prev.intersection(next);

            ctx.save();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(edge.a.x, edge.a.y);
            let center = null;
            if(0) {
                center = (new LineSegment(pt1, pt2)).center;
                ctx.lineTo(pt1.x, pt1.y);
                const ctrl = edge.center;
                ctx.quadraticCurveTo(ctrl.x, ctrl.y, pt2.x, pt2.y)
                ctx.lineTo(edge.b.x, edge.b.y);
            }
            else {
                center = (new LineSegment(edge.center, intersect)).center;
                ctx.lineTo(intersect.x, intersect.y);
                ctx.lineTo(edge.b.x, edge.b.y);
            }
            ctx.closePath();
            ctx.setLineDash([4, 1]);
            this.drawOpts({
                fill: Resource[harbor.resource].bgColor,
                stroke: '#000'
            });

            ctx.setLineDash([]);
            // this.drawCircle(center, 8, {fill: 'white', stroke: '#333'});
            let resource = harbor.resource;
            resource = Resource[resource].emoji;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            this.drawText(
                resource,
                center,
                '#000',
                'medium'
            );
            ctx.restore();
        }
        renderBoard(board, helper=true) {
            for(const hex of board.hexes) {
                this.renderHex(hex);
            }
            for(const harbor of Object.values(board.harbors)) {
                this.renderHarbor(harbor, board.hexIds[harbor.hex]);
            }
            if(helper) {
                this.drawHelper();
            }
        }
        renderDice(roll) {
            let dice = Utils.randomDice(roll);
            this.drawDice(...dice);
        }
        renderGame(game) {
            this.erase();
            this.renderBoard(game.board);
            this.renderRobber(game.robber);

            let viewingPlayer = game.viewingPlayer;
            if(viewingPlayer) {
                this.renderResources(viewingPlayer);
            }
            this.renderLALR(game);
            let constructs = [...game.constructs];
            const cmp = {road: 0, settlement: 1, city: 2};
            constructs.sort((a, b) => cmp[a.type] - cmp[b.type]);

            let longestPaths = game.longestRoadPath.map(e => e[2]);
            for(const c of constructs) {
                let hex = game.board.getHex(c.hex);
                let color = Color[c.color];
                switch(c.type) {
                    case 'road':
                        let edge = game.board.getEdge(hex.id, c.node);
                        this.renderRoad(hex, c.node, color, longestPaths.includes(edge.id));
                        break;
                    case 'settlement':
                        this.renderSettlement(hex, c.node, color);
                        break;
                    case 'city':
                        this.renderCity(hex, c.node, color);
                        break;
                }
            }
        }
        renderLALR(game, player) {
            let ctx = this.ctx;
            ctx.save();
            ctx.strokeStyle = '#aaa';
            let [x, y, width, height] = [5, 5, 105, 70];
            const cardHeight = height / 2;
            ctx.clearRect(x - 2, y - 2, width + 4, height + 4);
            for(const [attr, label] of [
                ['longestRoad', 'Longest Road'],
                ['largestArmy', 'Largest Army']
            ]) {
                if(game[attr]) {
                    ctx.fillStyle = Color[game[attr]];
                    ctx.strokeRect(x - 2, y -2, width + 4, cardHeight + 4);
                    ctx.fillRect(x, y, width, cardHeight);
                    this.drawText(
                        label,
                        {x: x + width / 2, y: y + cardHeight / 2},
                        Color.bg[game[attr]],
                        'medium'
                    );
                }
                y += cardHeight + 10;
            }
            ctx.restore();
        }
        renderResources(player) {
            const ctx = this.ctx;
            ctx.save();
            const width = 55;
            const height = 65;
            const N = 2;

            let p1 = point(145, 555);
            let p2 = point(p1.x, p1.y + height + N + 1);
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.clearRect(p1.x - 2, p1.y - 2, 4 + width * 5 + N * 5, 4 + height * 2);

            const items = [player.resources.toArray(), player.devCards.toArray()];
            for(const [k, v] of items.flat()) {
                if(v < 1) {
                    continue;
                }
                const r = Resource[k];
                let p = r.type === 'dev' ? p2 : p1;
                const center = p.x + width / 2;
                ctx.strokeRect(p.x, p.y, width, height);
                ctx.fillStyle = r.bgColor;
                ctx.fillRect(p.x + N, p.y + N, width - 2 * N, height - 2 * N);
                this.drawText(
                    r.name.substring(0, 11),
                    point(center, p.y + 12),
                    r.fgColor,
                    'xsmall'
                );
                this.drawText('×', point(center, p.y + 22), r.fgColor, 'small');
                this.drawText(
                    `${v}`,
                    point(center, p.y + 40),
                    r.fgColor,
                    'large'
                );
                p.x += width + 3
            }
            ctx.restore();
        }
        renderRoad(hex, edge, color, isLongest) {
            const dims = this.hexDims(hex);
            this.drawRoad(dims.points, edge, color, isLongest);
        }
        renderSettlement(hex, vertex, color) {
            const dims = this.hexDims(hex);
            this.drawSettlement(dims.points[Const.nodeIndex[vertex]], color);
        }
        renderCity(hex, vertex, color) {
            const dims = this.hexDims(hex);
            this.drawCity(dims.points[Const.nodeIndex[vertex]], color);
        }
        renderRobber(hex) {
            const dims = this.hexDims(hex);
            this.drawRobber(dims.center.x - 20, dims.center.y);
        }
    }

    return CanvasView;
})();
