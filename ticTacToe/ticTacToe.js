/**
 * 三子棋游戏（改进版）
 * 游戏规则：
 * 1. 两名玩家轮流下棋，分别使用'X'和'O'表示
 * 2. 每名玩家在棋盘上最多只能保留2个棋子
 * 3. 当一方放下第3个棋子时，该方最早放置的棋子会自动消失
 * 4. 任意一方在棋盘上形成三连线即获胜
 */

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
// 添加玩家棋子位置队列
let xPositions = [];
let oPositions = [];

/**
 * 绘制3x3的棋盘网格
 * 只在游戏开始和重置时调用一次
 */
function drawGrid() {
    context.beginPath();
    context.lineWidth = 1;
    
    // 绘制外边框和内部分隔线
    for (let i = 0; i <= 3; i++) {
        // 垂直线
        context.moveTo(i * size, 0);
        context.lineTo(i * size, 300);
        // 水平线
        context.moveTo(0, i * size);
        context.lineTo(300, i * size);
    }
    context.stroke();
}

/**
 * 在指定位置绘制玩家的棋子
 * @param {number} x - 格子的横坐标（0-2）
 * @param {number} y - 格子的纵坐标（0-2）
 * @param {string} player - 玩家标识（'X'或'O'）
 */
function drawMark(x, y, player) {
    context.font = '80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(player, x * size + size / 2, y * size + size / 2);
}

/**
 * 检查是否有玩家获胜
 * 获胜条件：横向、纵向或对角线形成三连线
 * @returns {string|null} 返回获胜玩家的标识，无人获胜返回null
 */
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

/**
 * 游戏重置
 * 清空棋盘、重置玩家、清空历史记录和位置队列
 */
function resetGame() {
    board = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    currentPlayer = 'X';
    moveHistory = [];
    xPositions = [];
    oPositions = [];
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
}

/**
 * 撤销上一步操作
 * 恢复棋盘状态和玩家轮次
 */
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

/**
 * 使棋子逐渐消失的动画效果
 * @param {number} x - 格子的横坐标（0-2）
 * @param {number} y - 格子的纵坐标（0-2）
 * @param {string} mark - 要消失的棋子符号
 * @returns {Promise} 动画完成后的Promise
 */
function fadeOutMark(x, y, mark) {
    return new Promise(resolve => {
        let opacity = 1;
        const startTime = performance.now();
        const duration = 300; // 动画持续1秒

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            opacity = 1 - (elapsed / duration);

            if (opacity > 0) {
                // 只清除棋子所在的区域，保留一点边距避免影响边框
                context.clearRect(
                    x * size + 1, 
                    y * size + 1, 
                    size - 2, 
                    size - 2
                );
                
                // 使用当前透明度绘制棋子
                context.globalAlpha = opacity;
                drawMark(x, y, mark);
                context.globalAlpha = 1;

                requestAnimationFrame(animate);
            } else {
                // 完全清除并重绘边框
                context.clearRect(x * size, y * size, size, size);
                redrawCell(x, y);
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}

// 处理玩家落子事件
canvas.addEventListener('click', async (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / size);
    const y = Math.floor((event.clientY - rect.top) / size);

    if (board[y][x] === '') {
        // 放置新棋子并记录位置
        board[y][x] = currentPlayer;
        drawMark(x, y, currentPlayer);
        moveHistory.push({ x, y, player: currentPlayer });

        // 更新当前玩家的棋子位置队列
        if (currentPlayer === 'X') {
            xPositions.push({x, y});
        } else {
            oPositions.push({x, y});
        }

        // 检查并处理对手的棋子数量限制
        // 当对手棋子达到3个时，移除最早放置的棋子
        const opponentPositions = currentPlayer === 'X' ? oPositions : xPositions;
        if (opponentPositions.length >= 3) {
            const oldestPos = opponentPositions.shift();
            const oldMark = board[oldestPos.y][oldestPos.x];
            board[oldestPos.y][oldestPos.x] = '';
            // 使用渐变效果移除棋子
            await fadeOutMark(oldestPos.x, oldestPos.y, oldMark);
        }

        // 检查是否有玩家获胜
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

// 初始化游戏棋盘
drawGrid();
