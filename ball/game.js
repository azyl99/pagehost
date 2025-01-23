const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏配置
const config = {
    slots: 11,                    // 11个槽
    maxBalls: 10,                // 每个槽最多10个球
    slotWidth: 60,               // 保持较大的槽宽度
    slotHeight: 400,             // 保持较大的槽高度
    ballRadius: 20,              // 保持较大的球半径
    colors: [                    // 10种颜色
        '#FF0000', // 红
        '#FF7F00', // 橙
        '#FFFF00', // 黄
        '#00FF00', // 绿
        '#00FFFF', // 青
        '#0000FF', // 蓝
        '#8B00FF', // 紫
        '#FF69B4', // 粉
        '#A0522D', // 棕
        '#808080'  // 灰
    ]
};

// 游戏状态
let slots = [];
let selectedSlot = null;
let moveCount = 0;

// 添加选择状态变量
let isDragging = false;
let draggedBall = null;
let dragStartTime = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isClickMode = false;  // 添加这个变量来区分点击模式和拖动模式

// 在游戏状态变量声明后添加历史记录数组
let history = [];
const MAX_HISTORY = 50;  // 最大历史记录数量

// 在游戏状态变量声明部分添加触摸相关变量
let touchStartTime = 0;
let touchStartSlot = null;
let touchMoved = false;  // 添加这个变量来跟踪是否发生了移动

// 在游戏配置后添加最佳记录相关变量
let bestScore = parseInt(localStorage.getItem('ballGameBestScore')) || Infinity;

// 统一的输入处理函数
function handleInputStart(x, y) {
    const clickedSlot = getSlotIndex(x, y);
    if (clickedSlot === -1 || slots[clickedSlot].length === 0) return;

    dragStartTime = Date.now();
    dragStartX = x;
    dragStartY = y;
    
    // 如果点击的是已选中的槽，则取消选中
    if (selectedSlot === clickedSlot) {
        selectedSlot = null;
        isClickMode = false;
        drawGame();
        return;
    }
    
    // 如果已经有选中的槽，不开始任何操作
    if (selectedSlot !== null) return;
    
    selectedSlot = clickedSlot;
    isClickMode = true;  // 初始设置为点击模式
    drawGame();
}

function handleInputMove(x, y) {
    if (!selectedSlot || isClickMode) return;  // 如果是点击模式，不处理移动
    
    // 检查是否应该开始拖动
    if (!isDragging) {
        const moveDistance = Math.sqrt(
            Math.pow(x - dragStartX, 2) + 
            Math.pow(y - dragStartY, 2)
        );
        if (moveDistance > 5) {  // 移动超过5像素才开始拖动
            isDragging = true;
            isClickMode = false;  // 切换到拖动模式
            draggedBall = slots[selectedSlot][slots[selectedSlot].length - 1];
            const ballCenterX = selectedSlot * config.slotWidth + 20 + config.slotWidth/2;
            const ballCenterY = config.slotHeight - (slots[selectedSlot].length - 1) * (config.ballRadius * 2) + 20;
            dragOffsetX = ballCenterX - x;
            dragOffsetY = ballCenterY - y;
        }
    }

    // 只有在拖动模式下才显示拖动动画
    if (isDragging) {
        drawGame();
        // 绘制拖动的球
        ctx.beginPath();
        ctx.arc(
            x + dragOffsetX,
            y + dragOffsetY,
            config.ballRadius - 2,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = config.colors[draggedBall];
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }
}

function handleInputEnd(x, y, isRightClick = false) {
    if (!selectedSlot) return;

    const targetSlot = getSlotIndex(x, y);
    const timeDiff = Date.now() - dragStartTime;
    
    // 如果是快速点击同一个槽位，不做任何操作
    if (!isDragging && timeDiff < 200 && targetSlot === selectedSlot) {
        return;
    }

    if (targetSlot !== -1 && targetSlot !== selectedSlot) {
        if (slots[targetSlot].length < config.maxBalls) {
            saveToHistory();
            
            if (isRightClick || isDragging) {
                // 移动所有相同颜色的球
                const sourceColor = slots[selectedSlot][slots[selectedSlot].length - 1];
                const availableSpace = config.maxBalls - slots[targetSlot].length;
                let ballsMoved = 0;
                
                for (let i = slots[selectedSlot].length - 1; i >= 0; i--) {
                    if (slots[selectedSlot][i] === sourceColor && ballsMoved < availableSpace) {
                        slots[targetSlot].push(slots[selectedSlot][i]);
                        ballsMoved++;
                    } else {
                        break;
                    }
                }
                slots[selectedSlot].splice(slots[selectedSlot].length - ballsMoved, ballsMoved);
                moveCount += ballsMoved;
            } else {
                // 移动单个球
                const ball = slots[selectedSlot].pop();
                slots[targetSlot].push(ball);
                moveCount++;
            }
            
            updateMoveCount();
            saveGameState();
            checkGameComplete();
        }
    }

    // 重置状态
    isDragging = false;
    isClickMode = false;
    draggedBall = null;
    selectedSlot = null;
    drawGame();
}

// 鼠标事件监听器
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleInputStart(x, y);
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleInputMove(x, y);
});

canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleInputEnd(x, y, e.button === 2);
});

// 触摸事件监听器
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    handleInputStart(x, y);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    handleInputMove(x, y);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    handleInputEnd(x, y);
});

// 阻止右键菜单
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

function updateMoveCount() {
    document.getElementById('moveCount').textContent = moveCount;
}

function initGame() {
    // 设置画布尺寸
    canvas.width = config.slots * config.slotWidth + 40;
    canvas.height = config.slotHeight + 40;
    updateCanvasStyle();  // 添加这行
    
    // 重置移动计数
    moveCount = 0;
    updateMoveCount();
    
    // 初始化槽
    slots = Array(config.slots).fill(null).map(() => []);
    
    // 填充球（除第一个槽外）
    for (let i = 1; i < config.slots; i++) {
        for (let j = 0; j < config.maxBalls; j++) {
            slots[i].push(j);
        }
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制槽
    for (let i = 0; i < config.slots; i++) {
        const x = i * config.slotWidth + 20;
        
        // 绘制槽的背景
        ctx.fillStyle = '#EEEEEE';
        ctx.fillRect(x, 20, config.slotWidth, config.slotHeight);
        
        // 绘制槽中的球
        slots[i].forEach((colorIndex, index) => {
            // 如果是正在拖动的球就跳过
            if (isDragging && i === selectedSlot && index === slots[i].length - 1) {
                return;
            }
            
            const y = config.slotHeight - (index + 1) * (config.ballRadius * 2) + 20;
            ctx.beginPath();
            ctx.arc(
                x + config.slotWidth/2,
                y + config.ballRadius,
                config.ballRadius - 2,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = config.colors[colorIndex];
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.stroke();
        });
        
        // 高亮选中的槽
        if (i === selectedSlot) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, 20, config.slotWidth, config.slotHeight);
            ctx.lineWidth = 1;
        }
    }
}

function getSlotIndex(x, y) {
    if (y < 20 || y > config.slotHeight + 20) return -1;
    const slotIndex = Math.floor((x - 20) / config.slotWidth);
    return (slotIndex >= 0 && slotIndex < config.slots) ? slotIndex : -1;
}

// 添加保存历史状态的函数
function saveToHistory() {
    const currentState = {
        slots: slots.map(slot => [...slot]),
        moveCount: moveCount
    };
    history.push(currentState);
    if (history.length > MAX_HISTORY) {
        history.shift();  // 移除最老的记录
    }
}

// 添加撤回函数
function undo() {
    if (history.length > 0) {
        const previousState = history.pop();
        slots = previousState.slots.map(slot => [...slot]);
        moveCount = previousState.moveCount;
        updateMoveCount();
        saveGameState();  // 保存到本地存储
        drawGame();
    }
}

// 修改 saveGameState 函数，加入历史记录
function saveGameState() {
    const gameState = {
        slots: slots,
        moveCount: moveCount,
        history: history  // 添加历史记录
    };
    localStorage.setItem('ballGameState', JSON.stringify(gameState));
}

// 修改 loadGameState 函数，加载历史记录
function loadGameState() {
    const savedState = localStorage.getItem('ballGameState');
    if (savedState) {
        canvas.width = config.slots * config.slotWidth + 40;
        canvas.height = config.slotHeight + 40;
        
        const gameState = JSON.parse(savedState);
        slots = gameState.slots;
        moveCount = gameState.moveCount || 0;
        history = gameState.history || [];  // 加载历史记录
        updateMoveCount();
        return true;
    }
    return false;
}

// 修改 startGame 函数
function startGame() {
    if (!loadGameState()) {
        initGame();
    }
    updateBestScore();  // 添加这行
    drawGame();
}

// 修改重新开始按钮的处理函数
function resetGame() {
    localStorage.removeItem('ballGameState');
    history = [];  // 清空历史记录
    initGame();
    drawGame();
    updateBestScore();  // 更新显示的最佳记录
}

// 开始游戏
startGame(); 

// 修改 canvas 样式以禁用移动设备上的默认触摸行为
canvas.style.touchAction = 'none'; 

// 修改 canvas 样式，确保宽高比保持一致
canvas.style.width = '100%';
canvas.style.maxWidth = `${config.slots * config.slotWidth + 40}px`;
canvas.style.height = 'auto'; 

// 修改 canvas 样式设置
function updateCanvasStyle() {
    const containerWidth = window.innerWidth;
    const maxWidth = config.slots * config.slotWidth + 40;
    
    // 设置画布的显示尺寸
    if (containerWidth < maxWidth) {
        const scale = containerWidth / maxWidth;
        canvas.style.width = '100%';
        canvas.style.height = `${config.slotHeight * scale}px`;
    } else {
        canvas.style.width = `${maxWidth}px`;
        canvas.style.height = `${config.slotHeight + 40}px`;
    }
}

// 添加窗口大小改变事件监听
window.addEventListener('resize', updateCanvasStyle); 

// 添加更新最佳记录的函数
function updateBestScore() {
    const bestScoreElement = document.getElementById('bestScore');
    bestScoreElement.textContent = bestScore === Infinity ? '暂无' : bestScore;
}

// 修改检查游戏完成的函数
function checkGameComplete() {
    // 检查每个非空槽是否都是被相同颜色的球填满
    for (let i = 0; i < config.slots; i++) {
        if (slots[i].length > 0) {
            const color = slots[i][0];
            if (!slots[i].every(ball => ball === color) || slots[i].length != 10) {
                return false;
            }
        }
    }
    
    // 如果完成了，更新最佳记录
    if (moveCount < bestScore) {
        bestScore = moveCount;
        localStorage.setItem('ballGameBestScore', bestScore);
        updateBestScore();
        setTimeout(() => {
            alert(`恭喜！你创造了新的最佳记录：${moveCount}步！`);
        }, 100);
    } else {
        setTimeout(() => {
            alert(`恭喜！你完成了游戏，共用了${moveCount}步！\n当前最佳记录是：${bestScore}步`);
        }, 100);
    }
    return true;
} 