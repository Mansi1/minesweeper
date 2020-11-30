class FieldMatrix {

    constructor(width, height, minesAmountInPercentage = 0.1) {
        this.width = width;
        this.height = height;

        this.mineAmount = minesAmountInPercentage;
        this.rootElement = document.getElementById('root');
        this.rootFrameElement = document.getElementById('root-frame');
        this.field = this.renderField()
        console.log('mine amount ', this.mineAmount)
    }

    renderField = () => {
        //set width and height to root element
        const style = `height: ${this.height * 20}px; width: ${this.width * 20}px;`;
        this.rootElement.setAttribute('style',style)
        this.rootFrameElement.setAttribute('style', style)
        this.rootElement.addEventListener('click', this.onClick)
        const field = []
        for (let index = 0, y = 1; y <= this.height; y++) {
            const row = document.createElement('div')
            row.classList.add('row')
            for (let x = 1; x <= this.width; x++, index++) {
                const block = new Block(index, this.width, this.height, field);
                field.push(block);
                row.appendChild(block.render())
            }
            this.rootElement.appendChild(row)
        }
        return field;
    }

    onClick = (evt) => {
        const block = evt.target.block;
        this.mines = this.calculateMines([block.index, ...block.neighbours])
        this.field.forEach(block => {
            block.setIsMineAndCount(this.mines[block.index],
                block.neighbours.reduce((prev, curr) => prev + (!!this.mines[curr] ? 1 : 0), 0)
            )
        })
        this.rootElement.removeEventListener('click', this.onClick);
        block.onClick();
    }

    calculateMines = (noneMineFields) => {
        //10 % of mines
        let indexes = [];

        for (let i = 0; i < (this.width * this.height); i++) {
            if (noneMineFields.indexOf(i) === -1) {
                indexes.push(i);
            }
        }

        const minesAmount = Math.round(this.height * this.width * this.mineAmount);
        document.getElementById('mines').innerText = ' '+minesAmount;
        document.getElementById('fields').innerText = ' '+this.height * this.width;

        const mineIndex = {}
        for (let i = 0; i < minesAmount; i++) {
            const randomIndex = Math.floor(Math.random() * indexes.length);
            mineIndex[indexes[randomIndex]] = true;
            indexes.splice(randomIndex, 1)
        }
        return mineIndex;
    }


}
