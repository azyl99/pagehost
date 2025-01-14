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
let selectedBall = null;
let selectedSlot = null;
let moveCount = 0;

// 添加选择状态变量
let isDragging = false;
let dragStartX = 0;
let selectedSlots = new Set();

// 在游戏状态变量声明后添加历史记录数组
let history = [];
const MAX_HISTORY = 50;  // 最大历史记录数量

function updateMoveCount() {
    document.getElementById('moveCount').textContent = moveCount;
}

function initGame() {
    // 设置画布尺寸
    canvas.width = config.slots * config.slotWidth + 40;
    canvas.height = config.slotHeight + 40;
    
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

// 添加右键点击事件处理
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 阻止默认的右键菜单
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedSlot = getSlotIndex(x, y);
    if (clickedSlot === -1) return;

    if (selectedSlot === null) {
        if (slots[clickedSlot].length > 0) {
            selectedSlot = clickedSlot;
        }
    } else {
        if (clickedSlot !== selectedSlot) {
            // 获取选中槽最上面球的颜色
            const sourceColor = slots[selectedSlot][slots[selectedSlot].length - 1];
            // 计算目标槽还能接收多少个球
            const availableSpace = config.maxBalls - slots[clickedSlot].length;
            
            if (availableSpace > 0) {
                saveToHistory();
                let ballsMoved = 0;
                // 从上往下遍历源槽中的球
                for (let i = slots[selectedSlot].length - 1; i >= 0; i--) {
                    // 如果颜色相同且目标槽还有空间
                    if (slots[selectedSlot][i] === sourceColor && ballsMoved < availableSpace) {
                        slots[clickedSlot].push(slots[selectedSlot][i]);
                        ballsMoved++;
                    } else {
                        // 保留不同颜色的球或超出空间的球
                        break;
                    }
                }
                // 从源槽移除已经移动的球
                slots[selectedSlot].splice(slots[selectedSlot].length - ballsMoved, ballsMoved);
                
                // 更新移动次数（每个球都算一次）
                moveCount += ballsMoved;
                updateMoveCount();
                saveGameState();
            }
        }
        selectedSlot = null;
    }
    
    drawGame();
});

// 修改原有的左键点击事件，确保两个事件处理逻辑一致
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedSlot = getSlotIndex(x, y);
    if (clickedSlot === -1) return;

    if (selectedSlot === null) {
        if (slots[clickedSlot].length > 0) {
            selectedSlot = clickedSlot;
        }
    } else {
        if (clickedSlot !== selectedSlot && slots[clickedSlot].length < config.maxBalls) {
            saveToHistory();
            const ball = slots[selectedSlot].pop();
            slots[clickedSlot].push(ball);
            moveCount++;
            updateMoveCount();
            saveGameState();
        }
        selectedSlot = null;
    }
    
    drawGame();
});

// 修改 startGame 函数
function startGame() {
    if (!loadGameState()) {
        initGame();
    }
    drawGame();
}

// 修改重新开始按钮的处理函数
function resetGame() {
    localStorage.removeItem('ballGameState');
    history = [];  // 清空历史记录
    initGame();
    drawGame();
}

// 开始游戏
startGame(); 

// 在现有事件监听器之后添加触屏事件支持
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

// 添加获取触摸坐标的辅助函数
function getTouchPos(canvas, touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;    // 计算X轴缩放比例
    const scaleY = canvas.height / rect.height;   // 计算Y轴缩放比例
    
    return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
    };
}

// 修改 handleTouchStart 函数
function handleTouchStart(e) {
    e.preventDefault();
    
    const touch = e.touches[0];
    const pos = getTouchPos(canvas, touch);
    const clickedSlot = getSlotIndex(pos.x, pos.y);
    
    if (clickedSlot === -1) return;

    touchStartTime = Date.now();
    touchStartSlot = clickedSlot;

    if (slots[clickedSlot].length > 0) {
        selectedSlot = clickedSlot;
        drawGame();
    }
}

function handleTouchMove(e) {
    e.preventDefault();
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    if (!selectedSlot) return;

    const touch = e.changedTouches[0];
    const pos = getTouchPos(canvas, touch);
    const targetSlot = getSlotIndex(pos.x, pos.y);
    
    if (targetSlot === -1 || targetSlot === selectedSlot) {
        selectedSlot = null;
        drawGame();
        return;
    }

    // 检查是否是长按（超过500毫秒）
    const isLongPress = Date.now() - touchStartTime > 500;

    if (isLongPress) {
        // 模拟右键点击行为（移动相同颜色的球）
        const sourceColor = slots[selectedSlot][slots[selectedSlot].length - 1];
        const availableSpace = config.maxBalls - slots[targetSlot].length;
        
        if (availableSpace > 0) {
            saveToHistory();
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
            updateMoveCount();
            saveGameState();
        }
    } else {
        // 模拟左键点击行为（移动单个球）
        if (slots[targetSlot].length < config.maxBalls) {
            saveToHistory();
            const ball = slots[selectedSlot].pop();
            slots[targetSlot].push(ball);
            moveCount++;
            updateMoveCount();
            saveGameState();
        }
    }

    selectedSlot = null;
    drawGame();
}

// 添加触摸开始时间变量
let touchStartTime = 0;
let touchStartSlot = null;

// 修改 canvas 样式以禁用移动设备上的默认触摸行为
canvas.style.touchAction = 'none'; 

// 修改 canvas 样式，确保宽高比保持一致
canvas.style.width = '100%';
canvas.style.maxWidth = `${config.slots * config.slotWidth + 40}px`;
canvas.style.height = 'auto'; 