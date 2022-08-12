class Block {
    constructor(index, width, height, field) {
        this.index = index;
        this.width = width;
        this.height = height;
        this.field = field;
        this.isMarked = false;
        this.isRevealed= true;

        this.x = (this.index % this.width) + 1;
        this.y = (Math.ceil((this.index + 1) / this.width));

        this.isRight = this.x === this.width;
        this.isBottom = this.y === this.height;

        this.neighbours = this.calculateNeighbours()
        this.el = this.prepareEl()
        this.isRevealed = false;
        this.el.block = this;
    }

    prepareEl = () => {
        const el = document.createElement('div');
        el.classList.add('covered');
        el.classList.add('block');
        el.id = this.index;
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
            this.onReveal();

        } else if (this.count !== 0 && this.count === this.getNeighbours().reduce((prev, curr) => prev + (curr.isMarked ? 1 : 0), 0)) {
            this.getNeighbours()
                .filter(n => !n.isMarked)
                .map(n => n.onReveal())
        }
    }

    onReveal = () => {
        if (!this.isRevealed) {
            this.isRevealed = true;
            this.update();
            if(this.isMine){
              alert('you lose')
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
                this.el.innerText = this.count;
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
    calculateNeighbours = () => {
        const neighbours = [];
        const number = this.index;
        if (this.x > 1) {
            neighbours.push(number - 1);
        }
        if (this.x < this.width) {
            neighbours.push(number + 1);
        }
        if (this.y > 1) {
            neighbours.push(number - this.width);
            if (this.x > 1) {
                neighbours.push(number - 1 - this.width);
            }
            if (this.x < this.width) {
                neighbours.push(number + 1 - this.width);
            }
        }
        if (this.y < this.height) {
            neighbours.push(number + this.width);
            if (this.x > 1) {
                neighbours.push(number - 1 + this.width);
            }
            if (this.x < this.width) {
                neighbours.push(number + 1 + this.width);
            }
        }
        return neighbours;
    }

    onRightClick = (evt) => {
        if (evt.button === 2 && !this.isRevealed) {
            this.isMarked = !this.isMarked;
            this.update()
        }
    }

    getNeighbours = () => {
        return this.neighbours.map(n => this.field[n]);
    }

    setIsMineAndCount = (isMine, count) => {
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
