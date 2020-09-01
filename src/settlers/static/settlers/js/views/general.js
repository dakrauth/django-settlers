import { $, $$, Utils } from '../utils.js';
import { Resource } from '../common.js';


export class GeneralView {
    constructor() {
        $$('.tabs a').forEach(e => e.addEventListener('click', this.handleTabs.bind(this))); 
    }
    handleTabs(evt) {
        const el = evt.currentTarget;
        const parent = el.parentElement;
        if(parent.classList.contains('is-active')) {
            return;
        }
        let old = $('.is-active', parent.parentElement);
        old.classList.remove('is-active');
        $(`.${old.dataset.tab}`, this.element).classList.add('hidden');

        parent.classList.remove('hidden');
        parent.classList.add('is-active');
        $(`.${parent.dataset.tab}`, this.element).classList.remove('hidden');
    }
    activateTab(tab) {
        $$('.tab').forEach(e => {
            if(e.classList.contains(tab)) {
                e.classList.add('is-active');
                e.classList.remove('hidden');
            }
            else {
                e.classList.remove('is-active');
                e.classList.add('hidden');
            }
        })
        $$('.tabs li').forEach(e => {
            if(e.dataset.tab === tab) {
                e.classList.add('is-active');
                e.classList.remove('hidden');
            }
            else {
                e.classList.remove('is-active');
                e.classList.add('hidden');
            }
        });
    }
    showStatus(game) {
        let html = '';
        let headers = [];
        let cells = [];
        game.players.forEach(p => {
            headers.push(`<th>${p.name} &middot; ${p.color}</th>`);

            let points = game.pointsFor(p);
            let extras = [];
            if(points.longestRoad === p.color) {
                extras.push('LR');
            }
            if(points.largestArmy === p.color) {
                extras.push('LA');
            }
            if(extras.length) {
                extras = ' (' + extras.join(', ') + ')';
            }
            let pc = Utils.pluralize(points.total, 'point', 'points');
            let rc = Utils.pluralize(p.resources.count, 'resource card', 'resource cards');
            let dc = Utils.pluralize(p.devCards.count, 'dev card', 'dev cards');

            let playedDevCards = [];
            for(const [k, v] of p.devCards.played) {
                playedDevCards.push(`Played ${v} ${Resource[k].name}`);
            }
            playedDevCards = playedDevCards.length ? playedDevCards.join('<br>') : '';
            cells.push(`<td>
                <strong>${pc}${extras}</strong><br>
                ${rc}<br>
                ${dc}<br>
                ${playedDevCards}
            </td>`);
        });
        html += '<table class="table is-bordered is-narrow is-size-7 is-fullwidth"><tr>' + headers.join('') + '</tr>';
        html += '<tr>' + cells.join('') + '</tr></table>';
        $('.status').innerHTML = html;
    }
    showTurnInfo(turn, player, history) {
        let when = new Date(turn.played);
        let rows = [
            `<p><strong>Previous turn (#${turn.index + 1})</strong><br>
            ${player.color} (${player.name})<br>
            Rolled &middot; ${turn.roll}<br>
            ${when.toString()}</p>`,

        ];
        if(history && history.length) {
            rows.push('<ul>');
            for(let e of history) {
                e = JSON.parse(e);
                rows.push('<li>');
                if(['road', 'settlement', 'city'].includes(e.type)) {
                    rows.push(`Built a ${e.type} at ${e.hex}${e.node}`);
                }
                else if(e.type === 'trade') {
                    if(e.by == 'player') {
                        let offers = [];
                        let wants = [];
                        for(const offer of e.offers) {
                            offers.push(`${offer.count} ${Resource[offer.resource].name}`);
                        }
                        for(const want of e.wants) {
                            wants.push(`${want.count} ${Resource[want.resource].name}`);
                        }
                        offers = offers.join(', ');
                        wants = wants.join(', ');
                        rows.push(`Traded ${offers} for ${wants} via ${e.trader}`);
                    }
                    else {
                        rows.push(`Traded ${Resource[e.offers].name} for ${Resource[e.wants].name} via ${e.by}`);
                    }
                    
                }
                else if(e.type === 'robber') {
                    let who = e.victim || 'nobody';
                    rows.push(`Moved robber to ${e.hex} and robbed ${who}`);
                }
                else if(e.type === 'play') {
                    let row = [`Played development card ${Resource[e.card].name}`];
                    switch(e.card) {
                        case 'YP':
                            row.push(`for ${Resource[e.yp1].name} and ${Resource[e.yp2].name}`);
                            break;
                        case 'RB':
                            row.push(`at ${e.roads[0][0]}${e.roads[0][1]}, ${e.roads[1][0]}${e.roads[1][1]}`)
                            break;
                        case 'MP':
                            row.push(`and stole everyone's ${Resource[e.monopolize].name}`);
                            break;
                        case 'KN':
                            row.push(` on hex ${e.hex} and stole from ${e.victim}`);
                            break;
                    }
                    rows.push(row.join(' '));
                }
                else if(e.type === 'purchase') {
                    rows.push('Purchased a development card');
                }
                else {
                    rows.push(JSON.stringify(e));
                }
                rows.push('</li>');
            }
            rows.push('</ul>');
        }
        $('#info').innerHTML = rows.join('\n')
    }
}

export class FormView {
    constructor(element) {
        this.element = element;
    }
    setOptions(el, keyValues) {
        Utils.removeAllChildren(el);
        let options = [];
        if(el.dataset.label) {
            options.push(`<option value="">&ndash; ${el.dataset.label} &ndash;</option>`);
        }
        for(let [key, value] of keyValues) {
            options.push(`<option value="${key}">${value}</option>`);
        }
        el.innerHTML = options.join('\n');
    }
    validateSelectGroup(evt) {
        let el = evt.target;

        let ancestor = el.parentElement;
        while(!ancestor.classList.contains('select-group')) {
            ancestor = ancestor.parentElement;
        }

        let selects = $$('select', ancestor);
        if(selects.length === 0) {
            let message = 'Not selectors found for ${handler}';
            console.error(message);
            return false;
        }

        let messages = [];
        let data = {};
        for(const el of selects) {
            if(el.value) {
                data[el.name] = el.value;
            }
            else {
                messages.push(el.dataset.label);
            }
        }

        if(messages.length) {
            Utils.showAlert('Required: please select ' + messages.join(', '));
            return false;
        }

        return {
            handlerName: el.dataset.handler,
            data: data,
            el: el,
            selects: selects
        };
    }
}
