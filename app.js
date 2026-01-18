// ==================== CẤU HÌNH ====================
const CONFIG = {
    BRUSH_SIZE_DISPLAY: 1,
    BRUSH_SIZE_AI: 5,
    GAME_DURATION: 25,
    MODEL_PATH: 'game_model_160.onnx',
    CANVAS_SIZE: 400,
    TARGET_SIZE: 160,
    SAFE_SIZE: 130,
    CONFIDENCE_THRESHOLD: 0.12
};

// Danh sách 20 class (phải khớp với model)
const CLASS_NAMES = [
    "airplane", "alarm clock", "ambulance", "angel", "ant",
    "backpack", "basket", "bee", "bicycle", "binoculars",
    "brain", "bulldozer", "bus", "butterfly", "cactus",
    "calculator", "camera", "campfire", "castle", "chandelier"
];

const CLASS_NAMES_VI = {
    "airplane": "Máy bay",
    "alarm clock": "Đồng hồ báo thức",
    "ambulance": "Xe cứu thương",
    "angel": "Thiên thần",
    "ant": "Con kiến",
    "backpack": "Ba lô",
    "basket": "Giỏ",
    "bee": "Con ong",
    "bicycle": "Xe đạp",
    "binoculars": "Ống nhòm",
    "brain": "Bộ não",
    "bulldozer": "Xe ủi",
    "bus": "Xe buýt",
    "butterfly": "Bướm",
    "cactus": "Xương rồng",
    "calculator": "Máy tính",
    "camera": "Máy ảnh",
    "campfire": "Lửa trại",
    "castle": "Lâu đài",
    "chandelier": "Đèn chùm"
};

// ==================== STATE MANAGEMENT ====================
class GameState {
    constructor() {
        this.isGameActive = false;
        this.targetWord = "";
        this.timeLeft = 0;
        this.gameTimer = null;
        this.session = null;
        this.lastX = null;
        this.lastY = null;
        this.needsRedraw = false;
        this.predictionTimeout = null;
    }
}

const state = new GameState();

// ==================== DOM ELEMENTS ====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const aiPreviewCanvas = document.getElementById('aiPreview');
const aiPreviewCtx = aiPreviewCanvas.getContext('2d');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// ==================== CANVAS SETUP ====================
let canvasDisplay = null;
let canvasAI = null;

function initCanvases() {
    // Canvas hiển thị (nền trắng, nét màu)
    canvasDisplay = ctx.createImageData(CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
    for (let i = 0; i < canvasDisplay.data.length; i += 4) {
        canvasDisplay.data[i] = 255;     // R
        canvasDisplay.data[i + 1] = 255; // G
        canvasDisplay.data[i + 2] = 255; // B
        canvasDisplay.data[i + 3] = 255; // A
    }

    // Canvas AI (nền đen, nét trắng)
    canvasAI = new Uint8ClampedArray(CONFIG.CANVAS_SIZE * CONFIG.CANVAS_SIZE);
    canvasAI.fill(0);

    updateDisplayCanvas();
}

function updateDisplayCanvas() {
    ctx.putImageData(canvasDisplay, 0, 0);
}

// Optimized rendering loop
function renderLoop() {
    if (state.needsRedraw) {
        updateDisplayCanvas();
        state.needsRedraw = false;
    }
    requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);

function clearCanvases() {
    // Reset canvas hiển thị
    for (let i = 0; i < canvasDisplay.data.length; i += 4) {
        canvasDisplay.data[i] = 255;
        canvasDisplay.data[i + 1] = 255;
        canvasDisplay.data[i + 2] = 255;
        canvasDisplay.data[i + 3] = 255;
    }
    // Reset canvas AI
    canvasAI.fill(0);
    updateDisplayCanvas();

    // Clear AI preview
    aiPreviewCtx.fillStyle = '#000';
    aiPreviewCtx.fillRect(0, 0, 140, 140);
}

// ==================== DRAWING FUNCTIONS ====================
function drawCircle(imageData, x, y, radius, r, g, b) {
    const size = CONFIG.CANVAS_SIZE;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
                const px = x + dx;
                const py = y + dy;
                if (px >= 0 && px < size && py >= 0 && py < size) {
                    const idx = (py * size + px) * 4;
                    imageData.data[idx] = r;
                    imageData.data[idx + 1] = g;
                    imageData.data[idx + 2] = b;
                    imageData.data[idx + 3] = 255;
                }
            }
        }
    }
}

function drawLineAI(x0, y0, x1, y1, thickness) {
    const size = CONFIG.CANVAS_SIZE;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        // Draw thick point
        for (let ty = -thickness; ty <= thickness; ty++) {
            for (let tx = -thickness; tx <= thickness; tx++) {
                if (tx * tx + ty * ty <= thickness * thickness) {
                    const px = x0 + tx;
                    const py = y0 + ty;
                    if (px >= 0 && px < size && py >= 0 && py < size) {
                        canvasAI[py * size + px] = 255;
                    }
                }
            }
        }

        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

// ==================== TOUCH/MOUSE HANDLING ====================
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = CONFIG.CANVAS_SIZE / rect.height;

    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);

    return {
        x: Math.max(0, Math.min(x, CONFIG.CANVAS_SIZE - 1)),
        y: Math.max(0, Math.min(y, CONFIG.CANVAS_SIZE - 1))
    };
}

function handleStart(e) {
    if (!state.isGameActive) return;
    e.preventDefault();

    const { x, y } = getCanvasCoords(e);
    state.lastX = x;
    state.lastY = y;

    // Vẽ điểm đầu tiên
    const hue = Math.random();
    const [r, g, b] = hsvToRgb(hue, 1, 1);

    drawCircle(canvasDisplay, x, y, CONFIG.BRUSH_SIZE_DISPLAY, r, g, b);
    drawCircle({ data: canvasAI }, x, y, CONFIG.BRUSH_SIZE_AI, 255, 255, 255);

    state.needsRedraw = true;
}

function handleMove(e) {
    if (!state.isGameActive || state.lastX === null || state.lastY === null) return;
    e.preventDefault();

    const { x, y } = getCanvasCoords(e);

    // Crayon effect cho canvas hiển thị
    const hue = (x % 400) / 400.0;
    const [r, g, b] = hsvToRgb(hue, 1, 1);

    const dist = Math.hypot(x - state.lastX, y - state.lastY);

    if (dist > 0) {
        // Vẽ crayon effect (rải hạt)
        for (let i = 0; i < Math.max(1, dist); i++) {
            const alpha = i / Math.max(dist, 1);
            const currX = Math.floor(state.lastX * (1 - alpha) + x * alpha);
            const currY = Math.floor(state.lastY * (1 - alpha) + y * alpha);

            // Rải 8 hạt mỗi điểm
            for (let j = 0; j < 8; j++) {
                const spread = CONFIG.BRUSH_SIZE_DISPLAY + 2;
                const offX = Math.floor(Math.random() * (spread * 2 + 1) - spread);
                const offY = Math.floor(Math.random() * (spread * 2 + 1) - spread);
                const px = currX + offX;
                const py = currY + offY;

                if (px >= 0 && px < CONFIG.CANVAS_SIZE && py >= 0 && py < CONFIG.CANVAS_SIZE) {
                    const idx = (py * CONFIG.CANVAS_SIZE + px) * 4;
                    canvasDisplay.data[idx] = r;
                    canvasDisplay.data[idx + 1] = g;
                    canvasDisplay.data[idx + 2] = b;
                }
            }
        }

        // Vẽ nét thẳng cho AI canvas
        drawLineAI(state.lastX, state.lastY, x, y, CONFIG.BRUSH_SIZE_AI);
    }

    state.lastX = x;
    state.lastY = y;

    updateDisplayCanvas();
    predictImage();
}

function handleEnd(e) {
    if (!state.isGameActive) return;
    e.preventDefault();

    state.lastX = null;
    state.lastY = null;

    predictImage();
}

// Event listeners
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd);

canvas.addEventListener('touchstart', handleStart);
canvas.addEventListener('touchmove', handleMove);
canvas.addEventListener('touchend', handleEnd);

// ==================== AI PREDICTION ====================
function updateAIPreview(imgData) {
    // imgData is 160x160 grayscale
    // Phóng to lên 140x140 với pixel art style
    const canvas140 = document.createElement('canvas');
    canvas140.width = 160;
    canvas140.height = 160;
    const ctx140 = canvas140.getContext('2d');

    // Convert grayscale to RGB
    const imageData = ctx140.createImageData(160, 160);
    for (let i = 0; i < imgData.length; i++) {
        const val = imgData[i];
        imageData.data[i * 4] = val;
        imageData.data[i * 4 + 1] = val;
        imageData.data[i * 4 + 2] = val;
        imageData.data[i * 4 + 3] = 255;
    }
    ctx140.putImageData(imageData, 0, 0);

    // Scale to 140x140 with pixelated rendering
    aiPreviewCtx.imageSmoothingEnabled = false;
    aiPreviewCtx.drawImage(canvas140, 0, 0, 160, 160, 0, 0, 140, 140);

    // Draw green border
    aiPreviewCtx.strokeStyle = '#00ff00';
    aiPreviewCtx.lineWidth = 2;
    aiPreviewCtx.strokeRect(0, 0, 140, 140);
}

async function predictImage() {
    if (!state.session || !state.isGameActive) return;

    try {
        // 1. Tìm bounding box
        let minX = CONFIG.CANVAS_SIZE, minY = CONFIG.CANVAS_SIZE;
        let maxX = 0, maxY = 0;
        let hasDrawing = false;

        for (let y = 0; y < CONFIG.CANVAS_SIZE; y++) {
            for (let x = 0; x < CONFIG.CANVAS_SIZE; x++) {
                if (canvasAI[y * CONFIG.CANVAS_SIZE + x] > 0) {
                    hasDrawing = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (!hasDrawing) {
            // Hiển thị màn hình đen
            updateAIPreview(new Uint8ClampedArray(160 * 160));
            return;
        }

        // 2. Cắt ROI
        const roiW = maxX - minX + 1;
        const roiH = maxY - minY + 1;
        const roi = new Uint8ClampedArray(roiW * roiH);

        for (let y = 0; y < roiH; y++) {
            for (let x = 0; x < roiW; x++) {
                roi[y * roiW + x] = canvasAI[(minY + y) * CONFIG.CANVAS_SIZE + (minX + x)];
            }
        }

        // 3. Resize với padding (giống Python)
        const imgFinal = new Uint8ClampedArray(CONFIG.TARGET_SIZE * CONFIG.TARGET_SIZE);
        const scale = CONFIG.SAFE_SIZE / Math.max(roiH, roiW);
        const newW = Math.floor(roiW * scale);
        const newH = Math.floor(roiH * scale);

        // Simple nearest neighbor resize
        const resized = new Uint8ClampedArray(newW * newH);
        for (let y = 0; y < newH; y++) {
            for (let x = 0; x < newW; x++) {
                const srcX = Math.floor(x / scale);
                const srcY = Math.floor(y / scale);
                resized[y * newW + x] = roi[srcY * roiW + srcX];
            }
        }

        // Center trong 160x160
        const xOff = Math.floor((CONFIG.TARGET_SIZE - newW) / 2);
        const yOff = Math.floor((CONFIG.TARGET_SIZE - newH) / 2);

        for (let y = 0; y < newH; y++) {
            for (let x = 0; x < newW; x++) {
                imgFinal[(yOff + y) * CONFIG.TARGET_SIZE + (xOff + x)] = resized[y * newW + x];
            }
        }

        // Update preview
        updateAIPreview(imgFinal);

        // 4. Chuyển sang RGB (3 channels)
        const imgRGB = new Float32Array(3 * CONFIG.TARGET_SIZE * CONFIG.TARGET_SIZE);
        for (let i = 0; i < imgFinal.length; i++) {
            const val = imgFinal[i] / 255.0;
            imgRGB[i] = val;                                    // R
            imgRGB[CONFIG.TARGET_SIZE * CONFIG.TARGET_SIZE + i] = val;     // G
            imgRGB[2 * CONFIG.TARGET_SIZE * CONFIG.TARGET_SIZE + i] = val; // B
        }

        // 5. Run inference
        const tensor = new ort.Tensor('float32', imgRGB, [1, 3, CONFIG.TARGET_SIZE, CONFIG.TARGET_SIZE]);
        const feeds = { images: tensor };  // ✅ FIXED: Model yêu cầu 'images' không phải 'input'
        const results = await state.session.run(feeds);
        const output = results.output0.data;  // ✅ FIXED: Output name là 'output0' không phải 'output'

        // 6. Softmax
        const maxVal = Math.max(...output);
        const expPreds = Array.from(output).map(x => Math.exp(x - maxVal));
        const sumExp = expPreds.reduce((a, b) => a + b, 0);
        const softmax = expPreds.map(x => x / sumExp);

        // 7. Kết quả
        const idx = softmax.indexOf(Math.max(...softmax));
        const conf = softmax[idx];

        if (idx < CLASS_NAMES.length) {
            const label = CLASS_NAMES[idx];
            const vietnameseName = CLASS_NAMES_VI[label];

            if (label === state.targetWord && conf > CONFIG.CONFIDENCE_THRESHOLD) {
                gameOver(true);
            } else {
                updateStatusText(`AI đoán: <b>${label}</b> (${vietnameseName}) - ${Math.floor(conf * 100)}%`);
            }
        }
    } catch (error) {
        console.error('Prediction error:', error);
    }
}

// ==================== GAME LOGIC ====================
function startNewGame() {
    clearCanvases();

    state.targetWord = CLASS_NAMES[Math.floor(Math.random() * CLASS_NAMES.length)];
    state.timeLeft = CONFIG.GAME_DURATION;
    state.isGameActive = true;

    startBtn.style.display = 'none';
    clearBtn.style.display = 'block';

    updateStatusText("Sẵn sàng...");

    if (state.gameTimer) clearInterval(state.gameTimer);
    state.gameTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!state.isGameActive) return;

    state.timeLeft--;
    updateStatusText("AI đang nhìn...");

    if (state.timeLeft <= 0) {
        gameOver(false);
    }
}

function gameOver(win) {
    state.isGameActive = false;
    if (state.gameTimer) {
        clearInterval(state.gameTimer);
        state.gameTimer = null;
    }

    const vietnameseName = CLASS_NAMES_VI[state.targetWord];

    if (win) {
        statusText.innerHTML = `🎉 WIN! Correctly drew: <b>${state.targetWord}</b> (${vietnameseName})`;
        document.querySelector('.container').classList.add('win-animation');
        setTimeout(() => {
            document.querySelector('.container').classList.remove('win-animation');
        }, 600);
    } else {
        statusText.innerHTML = `Time's up! You needed to draw: <b>${state.targetWord}</b> (${vietnameseName})`;
    }

    startBtn.textContent = 'CHƠI TIẾP';

    setTimeout(() => {
        startBtn.style.display = 'block';
        clearBtn.style.display = 'none';
    }, 2000);
}

function updateStatusText(status) {
    const vietnameseName = CLASS_NAMES_VI[state.targetWord];
    const color = state.timeLeft > 10 ? '#000' : '#f00';

    statusText.innerHTML = `Draw: <b>${state.targetWord.toUpperCase()}</b> (${vietnameseName})  |  <span style="color: ${color}">⏳ ${state.timeLeft}s</span><br>${status}`;
}

// ==================== INITIALIZATION ====================
async function loadModel() {
    try {
        console.log('Đang tải ONNX model...');
        loadingOverlay.querySelector('.loading-text').textContent = 'Đang tải AI Model...';

        state.session = await ort.InferenceSession.create(CONFIG.MODEL_PATH, {
            executionProviders: ['wasm']
        });

        // 🔍 DEBUG: In ra tên input/output
        console.log('✅ Model loaded successfully!');
        console.log('📊 Input names:', state.session.inputNames);
        console.log('📊 Output names:', state.session.outputNames);

        loadingOverlay.classList.add('hidden');
        statusText.textContent = 'Nhấn nút BẮT ĐẦU để chơi!';
        startBtn.disabled = false;
    } catch (error) {
        console.error('❌ Error loading model:', error);
        loadingOverlay.querySelector('.loading-text').textContent = `Lỗi: ${error.message}`;
        statusText.textContent = `Không thể tải model. Vui lòng kiểm tra file ${CONFIG.MODEL_PATH}`;
    }
}

// Event listeners
startBtn.addEventListener('click', () => {
    startNewGame();
});

clearBtn.addEventListener('click', () => {
    if (state.isGameActive) {
        clearCanvases();
    }
});

// Initialize
initCanvases();
loadModel();
