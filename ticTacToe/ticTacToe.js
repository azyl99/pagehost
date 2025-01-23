const canvas = document.getElementById('ticTacToe');
const context = canvas.getContext('2d');
const size = 100;
let board = [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
];
let currentPlayer = 'X';
let moveHistory = [];

function drawGrid() {
    for (let i = 1; i < 3; i++) {
        context.moveTo(i * size, 0);
        context.lineTo(i * size, 300);
        context.moveTo(0, i * size);
        context.lineTo(300, i * size);
    }
    context.stroke();
}

function drawMark(x, y, player) {
    context.font = '80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(player, x * size + size / 2, y * size + size / 2);
}

function checkWinner() {
    for (let i = 0; i < 3; i++) {
        if (board[i][0] === board[i][1] && board[i][1] === board[i][2] && board[i][0] !== '') {
            return board[i][0];
        }
        if (board[0][i] === board[1][i] && board[1][i] === board[2][i] && board[0][i] !== '') {
            return board[0][i];
        }
    }
    if (board[0][0] === board[1][1] && board[1][1] === board[2][2] && board[0][0] !== '') {
        return board[0][0];
    }
    if (board[0][2] === board[1][1] && board[1][1] === board[2][0] && board[0][2] !== '') {
        return board[0][2];
    }
    return null;
}

function resetGame() {
    board = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    currentPlayer = 'X';
    moveHistory = [];
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
}

function undo() {
    if (moveHistory.length > 0) {
        const lastMove = moveHistory.pop();
        board[lastMove.y][lastMove.x] = '';
        currentPlayer = lastMove.player;
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        for (const move of moveHistory) {
            drawMark(move.x, move.y, move.player);
        }
    }
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / size);
    const y = Math.floor((event.clientY - rect.top) / size);

    if (board[y][x] === '') {
        board[y][x] = currentPlayer;
        drawMark(x, y, currentPlayer);
        moveHistory.push({ x, y, player: currentPlayer });
        const winner = checkWinner();
        if (winner) {
            setTimeout(() => {
                alert(`${winner} 赢了!`);
                resetGame();
            }, 10);
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        }
    }
});

drawGrid();
