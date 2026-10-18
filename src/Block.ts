import { mayChord, neighbours } from "./core";
import { play } from "./sound";

export const MINE_REVEALED = 'mine-revealed';

// VERIFIED: strict tsc rejects an `el.block` expando (TS2339), so the element → Block lookup lives in a WeakMap.
const blocks = new WeakMap<Element, Block>();

// The block a grid element belongs to, or undefined for anything else.
export const blockOf = (el: EventTarget | null): Block | undefined =>
    el instanceof Element ? blocks.get(el) : undefined;

export class Block {
    readonly x: number;
    readonly y: number;
    readonly isRight: boolean;
    readonly isBottom: boolean;
    readonly neighbours: number[];
    readonly el: HTMLDivElement;
    isMarked = false;
    isRevealed = false;
    isMine = false;
    count = 0;

    constructor(readonly index: number, readonly width: number, readonly height: number, readonly field: Block[]) {
        this.x = (this.index % this.width) + 1;
        this.y = (Math.ceil((this.index + 1) / this.width));

        this.isRight = this.x === this.width;
        this.isBottom = this.y === this.height;

        this.neighbours = neighbours(index, width, height);
        this.el = this.prepareEl();
        blocks.set(this.el, this);
    }

    prepareEl = (): HTMLDivElement => {
        const el = document.createElement('div');
        el.classList.add('covered');
        el.classList.add('block');
        el.id = String(this.index);
        if (this.isRight) {
            el.classList.add('right');
        }
        if (this.isBottom) {
            el.classList.add('bottom');
        }
        return el;
    }

    onClick = () => {
        if(this.isMarked){
            return
        }
        if (!this.isRevealed) {
            // a mine sounds through FieldMatrix.onMine
            if (!this.isMine) play('reveal');
            this.onReveal();

        } else {
            const around = this.getNeighbours();
            if (mayChord(this.count, around.filter(n => n.isMarked).length, around.filter(n => n.isMine && n.isRevealed).length)) {
                if (around.some(n => !n.isMarked && !n.isRevealed && !n.isMine)) play('reveal');
                around
                    .filter(n => !n.isMarked)
                    .map(n => n.onReveal())
            }
        }
    }

    onReveal = () => {
        if (!this.isRevealed) {
            this.isRevealed = true;
            this.update();
            if(this.isMine){
              // FieldMatrix owns the lives; it hears this on the grid root
              this.el.dispatchEvent(new Event(MINE_REVEALED, { bubbles: true }))
            }
            if (this.count === 0 && !this.isMine) {
                this.getNeighbours().filter(b=> !b.isMine).forEach(b => {
                        b.onReveal()
                    }
                )
            }
        }
    }
    update = () => {
        this.el.innerText = '';
        if (this.isRevealed) {
            this.el.classList.remove('covered');
            if (this.isMine) {
                this.el.classList.add('mine')
                this.el.innerText = '';
            }
            if (this.count > 0 && !this.isMine) {
                this.el.classList.add(`count${this.count}`)
                this.el.innerText = String(this.count);
            }
        }else {
          this.el.classList.add("covered");
          if (this.isMarked) {
            this.el.classList.add('marked')
          }else{
            this.el.classList.remove('marked')

          }
        }

    }

    // game over: show this mine with the boom animation after `delayMs`, without costing a life
    explode = (delayMs: number) => {
        this.isRevealed = true;
        this.el.classList.remove('covered', 'marked');
        this.el.classList.add('mine', 'boom');
        this.el.style.setProperty('--delay', `${delayMs}ms`);
    }

    // win: bounce after `delayMs`; a still hidden mine gets its flag first (mines that cost a heart stay shown)
    cheer = (delayMs: number) => {
        if (this.isMine && !this.isRevealed) {
            this.isMarked = true;
            this.update();
        }
        this.el.classList.add('cheer');
        this.el.style.setProperty('--delay', `${delayMs}ms`);
    }

    onRightClick = (evt: MouseEvent) => {
        if (evt.button === 2 && !this.isRevealed) {
            this.isMarked = !this.isMarked;
            play('flag');
            this.update()
        }
    }

    getNeighbours = (): Block[] => {
        return this.neighbours.map(n => this.field[n]);
    }

    setIsMineAndCount = (isMine: boolean, count: number) => {
        this.isMine = isMine;
        this.count = count;
        this.el.addEventListener('click', this.onClick)
        this.el.addEventListener('contextmenu', (e) => {
            e.preventDefault()
        })
        this.el.addEventListener('mousedown', this.onRightClick)
    }
    render = () => {
        return this.el;
    }
}
