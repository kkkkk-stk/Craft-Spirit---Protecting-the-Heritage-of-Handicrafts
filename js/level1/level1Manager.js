// ========== 第一关管理器（畲族刺绣）==========
// 场景控制 / 文物收集 / 对话 / 记忆CG / 解谜逻辑 / 通关

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';
import {
    OPENING_DIALOGUES, AREAS, ARTIFACTS, MEMORIES,
    PUZZLES, ENDING_DIALOGUES
} from './level1Data.js';

export const Level1Manager = {
    // ========== DOM 引用 ==========
    root: null,
    areaScene: null,
    dialogueBox: null,
    dialogueSpeaker: null,
    dialogueText: null,
    popupOverlay: null,
    popupContent: null,
    memoryOverlay: null,
    puzzleOverlay: null,
    puzzleContent: null,
    hudProgress: null,

    // ========== 状态 ==========
    _dialogueIndex: 0,
    _dialogueQueue: [],
    _onDialogueEnd: null,
    _loomClickOrder: [],

    // ========== 初始化 ==========
    init() {
        this.root = document.getElementById('level1-screen');
        if (!this.root) {
            console.error('Level1Manager: 找不到 #level1-screen');
            return;
        }
        this.areaScene = document.getElementById('level1-area-scene');
        this.dialogueBox = document.getElementById('level1-dialogue-box');
        this.dialogueSpeaker = document.getElementById('level1-dialogue-speaker');
        this.dialogueText = document.getElementById('level1-dialogue-text');
        this.popupOverlay = document.getElementById('level1-popup-overlay');
        this.popupContent = document.getElementById('level1-popup-content');
        this.memoryOverlay = document.getElementById('level1-memory-overlay');
        this.puzzleOverlay = document.getElementById('level1-puzzle-overlay');
        this.puzzleContent = document.getElementById('level1-puzzle-content');
        this.hudProgress = document.getElementById('level1-hud-progress');

        this._bindAreaNav();
        this._bindDialogue();
        this._bindPopup();
        this._bindBackToGame();

        document.addEventListener('enterLevel1', () => this.enter());
        document.addEventListener('returnToMenu', () => this._reset());

        console.log('Level1Manager: 初始化完成');
    },

    // ========== 进入第一关 ==========
    enter() {
        gameState.currentChapter = 'level1';
        gameState.level1.entered = true;

        // 隐藏游戏序章场景
        SceneManager.hide('game-screen');
        SceneManager.hide('ui-hud');
        SceneManager.show('level1-screen', 'flex');

        this._renderArea(gameState.level1.currentArea);
        this._updateProgressHud();

        if (!gameState.level1.openingDone) {
            setTimeout(() => this._startDialogue(OPENING_DIALOGUES, () => {
                gameState.level1.openingDone = true;
                this._showToast('可以自由探索三个区域，收集文物了');
            }), 800);
        }
    },

    // ========== 区域导航 ==========
    _bindAreaNav() {
        const nav = document.getElementById('level1-area-nav');
        if (!nav) return;
        nav.addEventListener('click', (e) => {
            const btn = e.target.closest('.area-nav-btn');
            if (!btn) return;
            const area = btn.dataset.area;
            if (area && area !== gameState.level1.currentArea) {
                this._switchArea(area);
            }
        });
    },

    _switchArea(area) {
        gameState.level1.currentArea = area;
        this._renderArea(area);
    },

    _renderArea(area) {
        const info = AREAS[area];
        // 更新导航高亮
        document.querySelectorAll('.area-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.area === area);
        });
        // 更新场景描述
        const descEl = document.getElementById('level1-area-desc');
        if (descEl) descEl.textContent = info.desc;

        // 渲染文物热点
        this._renderArtifacts(area);

        // 渲染解谜入口
        this._renderPuzzleEntry(area);
    },

    _renderArtifacts(area) {
        const container = document.getElementById('level1-artifacts');
        if (!container) return;
        container.innerHTML = '';

        const artifactIds = AREAS[area].artifacts;
        artifactIds.forEach(id => {
            const art = ARTIFACTS[id];
            const collected = gameState.level1.artifacts[id];
            const locked = art.requires && !gameState.level1.artifacts[art.requires];

            const el = document.createElement('div');
            el.className = 'artifact-hotspot' + (collected ? ' collected' : '') + (locked ? ' locked' : '');
            el.innerHTML = `
                <div class="artifact-icon">${this._artifactIcon(id)}</div>
                <div class="artifact-name">${art.name}</div>
                ${collected ? '<div class="artifact-status">已收集</div>' : (locked ? '<div class="artifact-status">🔒 需先收集前置文物</div>' : '<div class="artifact-status">点击拾取</div>')}
            `;
            if (!collected && !locked) {
                el.addEventListener('click', () => this._collectArtifact(id));
            }
            container.appendChild(el);
        });
    },

    _artifactIcon(id) {
        const icons = { 1: '🧵', 2: '🌈', 3: '📜', 4: '🌿', 5: '👑' };
        return icons[id] || '📦';
    },

    _renderPuzzleEntry(area) {
        const container = document.getElementById('level1-puzzle-entry');
        if (!container) return;
        container.innerHTML = '';

        const puzzleKey = AREAS[area].puzzle;
        if (!puzzleKey) return;

        // 古树年轮在yard但需要特殊入口
        const puzzle = PUZZLES[puzzleKey];
        const done = gameState.level1.puzzles[puzzleKey];
        const unlocked = this._isPuzzleUnlocked(puzzleKey);

        const el = document.createElement('div');
        el.className = 'puzzle-entry' + (done ? ' done' : '') + (unlocked ? '' : ' locked');
        el.innerHTML = `
            <div class="puzzle-entry-icon">${done ? '✅' : (unlocked ? '🔧' : '🔒')}</div>
            <div class="puzzle-entry-name">${puzzle.name}</div>
            <div class="puzzle-entry-status">${done ? '已通关' : (unlocked ? '点击挑战' : this._puzzleLockReason(puzzleKey))}</div>
        `;
        if (unlocked && !done) {
            el.addEventListener('click', () => this._openPuzzle(puzzleKey));
        }
        container.appendChild(el);
    },

    _isPuzzleUnlocked(key) {
        const s = gameState.level1;
        switch (key) {
            case 'loom':    return s.artifacts[1] && s.memories[3];
            case 'drying':  return s.artifacts[4] && s.memories[1];
            case 'treeRing':return s.artifacts[3] && s.memories[4] && s.puzzles.drying;
            case 'totem':   return s.artifacts[1]&&s.artifacts[2]&&s.artifacts[3]&&s.artifacts[4]&&s.artifacts[5]
                                    && s.memories[1]&&s.memories[2]&&s.memories[3]&&s.memories[4]
                                    && s.puzzles.loom && s.puzzles.drying && s.puzzles.treeRing;
            default: return false;
        }
    },

    _puzzleLockReason(key) {
        const s = gameState.level1;
        switch (key) {
            case 'loom':    return '需收集绣花绷架并观看记忆三';
            case 'drying':  return '需收集染料包并观看记忆一';
            case 'treeRing':return '需收集纹样底稿、观看记忆四、完成染料晾晒';
            case 'totem':   return '需集齐全部文物、记忆、前置解谜';
            default: return '未解锁';
        }
    },

    // ========== 收集文物 ==========
    _collectArtifact(id) {
        const art = ARTIFACTS[id];
        gameState.level1.artifacts[id] = true;
        this._showToast(`获得文物：${art.name}`);

        // 显示民俗科普弹窗
        this._showPopup(`
            <h3 class="popup-title">📜 ${art.name}</h3>
            <p class="popup-desc">${art.desc}</p>
            <div class="popup-divider"></div>
            <p class="popup-story">${art.story}</p>
            <button class="level1-btn" id="popup-close-btn">关闭弹窗</button>
        `, () => {
            // 弹窗关闭后播放记忆CG
            if (art.memory) {
                this._playMemory(art.memory, () => {
                    this._renderArea(gameState.level1.currentArea);
                    this._updateProgressHud();
                    this._checkTotemUnlock();
                });
            } else {
                this._renderArea(gameState.level1.currentArea);
                this._updateProgressHud();
                this._checkTotemUnlock();
            }
        });
    },

    // ========== 弹窗系统 ==========
    _bindPopup() {
        this.popupOverlay.addEventListener('click', (e) => {
            if (e.target === this.popupOverlay || e.target.id === 'popup-close-btn') {
                this._closePopup();
            }
        });
    },

    _showPopup(html, onClose) {
        this.popupContent.innerHTML = html;
        this.popupOverlay.style.display = 'flex';
        this._popupOnClose = onClose;
    },

    _closePopup() {
        this.popupOverlay.style.display = 'none';
        const cb = this._popupOnClose;
        this._popupOnClose = null;
        if (cb) cb();
    },

    // ========== 记忆CG ==========
    _playMemory(id, onEnd) {
        const mem = MEMORIES[id];
        this.memoryOverlay.querySelector('.memory-title').textContent = mem.title;
        this.memoryOverlay.querySelector('.memory-desc').innerHTML = mem.desc;
        this.memoryOverlay.querySelector('.memory-subtitle').textContent = mem.subtitle;
        this.memoryOverlay.querySelector('.memory-clue').textContent = mem.clue;

        // 模拟CG播放进度条
        const progress = this.memoryOverlay.querySelector('.memory-progress-bar');
        progress.style.transition = 'none';
        progress.style.width = '0%';
        this.memoryOverlay.style.display = 'flex';

        // 锁定交互
        gameState.dialogueActive = true;

        requestAnimationFrame(() => {
            progress.style.transition = 'width 4s linear';
            progress.style.width = '100%';
        });

        let elapsed = 0;
        const total = 4000;
        clearInterval(this._memTimer);
        this._memTimer = setInterval(() => {
            elapsed += 100;
            if (elapsed >= total) {
                clearInterval(this._memTimer);
            }
        }, 100);

        // 点击或自动结束
        const endHandler = () => {
            this.memoryOverlay.style.display = 'none';
            gameState.dialogueActive = false;
            gameState.level1.memories[id] = true;
            clearInterval(this._memTimer);
            this.memoryOverlay.removeEventListener('click', endHandler);
            clearTimeout(autoTimer);
            if (onEnd) onEnd();
        };

        const autoTimer = setTimeout(endHandler, total + 1500);
        // 2秒后允许点击跳过
        setTimeout(() => {
            this.memoryOverlay.addEventListener('click', endHandler);
            const skipHint = this.memoryOverlay.querySelector('.memory-skip-hint');
            if (skipHint) skipHint.style.opacity = '1';
        }, 2000);
    },

    // ========== 对话系统 ==========
    _bindDialogue() {
        this.dialogueBox.addEventListener('click', () => {
            if (!gameState.dialogueActive) return;
            this._nextDialogue();
        });
    },

    _startDialogue(queue, onEnd) {
        this._dialogueQueue = queue;
        this._dialogueIndex = 0;
        this._onDialogueEnd = onEnd;
        gameState.dialogueActive = true;
        this._showDialogue();
    },

    _showDialogue() {
        if (this._dialogueIndex >= this._dialogueQueue.length) {
            this._endDialogue();
            return;
        }
        const d = this._dialogueQueue[this._dialogueIndex];
        this.dialogueSpeaker.textContent = d.speaker || '旁白';
        this.dialogueText.innerHTML = d.text;
        this.dialogueBox.style.display = 'block';
    },

    _nextDialogue() {
        this._dialogueIndex++;
        this._showDialogue();
    },

    _endDialogue() {
        this.dialogueBox.style.display = 'none';
        gameState.dialogueActive = false;
        const cb = this._onDialogueEnd;
        this._onDialogueEnd = null;
        if (cb) cb();
    },

    // ========== 解谜系统 ==========
    _openPuzzle(key) {
        switch (key) {
            case 'loom':    this._openLoomPuzzle(); break;
            case 'drying':  this._openDryingPuzzle(); break;
            case 'treeRing':this._openTreeRingPuzzle(); break;
            case 'totem':   this._openTotemPuzzle(); break;
        }
    },

    // --- 解谜1: 织布机走线 ---
    _openLoomPuzzle() {
        const p = PUZZLES.loom;
        this._loomClickOrder = [];
        this.puzzleContent.innerHTML = `
            <h3 class="puzzle-title">🔧 ${p.name}</h3>
            <p class="puzzle-rule">${p.rule}</p>
            <div class="puzzle-steps" id="loom-steps">
                ${p.steps.map((s, i) => `
                    <div class="puzzle-step" data-step="${i}">
                        <div class="step-label">${s.label}</div>
                        <div class="step-desc">${s.desc}</div>
                    </div>
                `).join('')}
            </div>
            <div class="puzzle-feedback" id="loom-feedback"></div>
            <div class="puzzle-buttons">
                <button class="level1-btn secondary" id="puzzle-reset">清空重画</button>
                <button class="level1-btn" id="puzzle-confirm">确认上机织布</button>
                <button class="level1-btn secondary" id="puzzle-close">关闭</button>
            </div>
        `;
        this.puzzleOverlay.style.display = 'flex';

        this.puzzleContent.querySelectorAll('.puzzle-step').forEach(el => {
            el.addEventListener('click', () => {
                const step = parseInt(el.dataset.step);
                if (this._loomClickOrder.includes(step)) return;
                this._loomClickOrder.push(step);
                el.classList.add('selected');
                el.querySelector('.step-label').insertAdjacentHTML('beforeend',
                    ` <span class="step-order">(${this._loomClickOrder.length})</span>`);
            });
        });

        this.puzzleContent.querySelector('#puzzle-reset').addEventListener('click', () => {
            this._loomClickOrder = [];
            this.puzzleContent.querySelectorAll('.puzzle-step').forEach(el => {
                el.classList.remove('selected');
                const order = el.querySelector('.step-order');
                if (order) order.remove();
            });
            this.puzzleContent.querySelector('#loom-feedback').textContent = '';
        });

        this.puzzleContent.querySelector('#puzzle-confirm').addEventListener('click', () => {
            const correct = p.correctOrder;
            const isRight = this._loomClickOrder.length === correct.length &&
                this._loomClickOrder.every((v, i) => v === correct[i]);
            if (isRight) {
                this._solvePuzzle('loom');
            } else {
                const fb = this.puzzleContent.querySelector('#loom-feedback');
                fb.textContent = p.errorHint;
                fb.className = 'puzzle-feedback error';
            }
        });

        this.puzzleContent.querySelector('#puzzle-close').addEventListener('click', () => {
            this.puzzleOverlay.style.display = 'none';
        });
    },

    // --- 解谜2: 染料晾晒 ---
    _openDryingPuzzle() {
        const p = PUZZLES.drying;
        // 随机打乱染料顺序
        const shuffled = [...Array(p.slots.length).keys()].sort(() => Math.random() - 0.5);
        this._dryingOrder = new Array(p.slots.length).fill(null);

        this.puzzleContent.innerHTML = `
            <h3 class="puzzle-title">🔧 ${p.name}</h3>
            <p class="puzzle-rule">${p.rule}</p>
            <div class="drying-layout">
                <div class="drying-items" id="drying-items">
                    ${shuffled.map(i => `
                        <div class="dye-item" data-dye="${i}" draggable="true">${p.slots[i]}</div>
                    `).join('')}
                </div>
                <div class="drying-rack" id="drying-rack">
                    ${p.slots.map((_, i) => `
                        <div class="rack-slot" data-slot="${i}">
                            <div class="slot-num">${i + 1}号位</div>
                            <div class="slot-drop">放置区</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="puzzle-feedback" id="drying-feedback"></div>
            <div class="puzzle-buttons">
                <button class="level1-btn secondary" id="puzzle-reset">重置摆放</button>
                <button class="level1-btn" id="puzzle-confirm">确认晾晒</button>
                <button class="level1-btn secondary" id="puzzle-close">关闭</button>
            </div>
        `;
        this.puzzleOverlay.style.display = 'flex';

        // 拖拽逻辑
        let draggedDye = null;
        this.puzzleContent.querySelectorAll('.dye-item').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                draggedDye = el;
                e.dataTransfer.effectAllowed = 'move';
            });
        });

        this.puzzleContent.querySelectorAll('.rack-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => { e.preventDefault(); });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedDye) return;
                const slotIdx = parseInt(slot.dataset.slot);
                const dyeIdx = parseInt(draggedDye.dataset.dye);

                // 如果槽位已有东西，先取出
                const existing = this._dryingOrder[slotIdx];
                if (existing !== null) {
                    const oldItem = this.puzzleContent.querySelector(`.dye-item[data-dye="${existing}"]`);
                    if (oldItem) {
                        this.puzzleContent.querySelector('#drying-items').appendChild(oldItem);
                        oldItem.style.display = '';
                    }
                }

                this._dryingOrder[slotIdx] = dyeIdx;
                const dropZone = slot.querySelector('.slot-drop');
                dropZone.innerHTML = '';
                dropZone.appendChild(draggedDye);
                draggedDye.style.display = 'block';
                draggedDye = null;
            });
        });

        this.puzzleContent.querySelector('#puzzle-reset').addEventListener('click', () => {
            this._dryingOrder = new Array(p.slots.length).fill(null);
            this._openDryingPuzzle(); // 重新渲染
        });

        this.puzzleContent.querySelector('#puzzle-confirm').addEventListener('click', () => {
            if (this._dryingOrder.includes(null)) {
                const fb = this.puzzleContent.querySelector('#drying-feedback');
                fb.textContent = '五种染材必须分别摆放至五组架子，不可重复、不可空置。';
                fb.className = 'puzzle-feedback error';
                return;
            }
            const correct = p.correctOrder;
            const isRight = this._dryingOrder.every((v, i) => v === correct[i]);
            if (isRight) {
                this._solvePuzzle('drying');
            } else {
                const fb = this.puzzleContent.querySelector('#drying-feedback');
                fb.textContent = p.errorHint;
                fb.className = 'puzzle-feedback error';
            }
        });

        this.puzzleContent.querySelector('#puzzle-close').addEventListener('click', () => {
            this.puzzleOverlay.style.display = 'none';
        });
    },

    // --- 解谜3: 古树年轮 ---
    _openTreeRingPuzzle() {
        const p = PUZZLES.treeRing;
        this._treeRingValues = [0, 0, 0, 0];

        this.puzzleContent.innerHTML = `
            <h3 class="puzzle-title">🔧 ${p.name}</h3>
            <p class="puzzle-rule">${p.rule}</p>
            <div class="tree-ring-layout">
                <div class="tree-rings" id="tree-rings">
                    ${p.rings.map((r, i) => `
                        <div class="ring-row" data-ring="${i}">
                            <div class="ring-label">${r.label}</div>
                            <div class="ring-slider">
                                ${r.options.map(o => `<button class="ring-btn" data-ring="${i}" data-val="${o}">${o}</button>`).join('')}
                            </div>
                            <div class="ring-answer" id="ring-answer-${i}"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="puzzle-feedback" id="ring-feedback"></div>
            <div class="puzzle-buttons">
                <button class="level1-btn secondary" id="puzzle-reset">重置滑块</button>
                <button class="level1-btn" id="puzzle-confirm">解读年轮</button>
                <button class="level1-btn secondary" id="puzzle-close">关闭</button>
            </div>
        `;
        this.puzzleOverlay.style.display = 'flex';

        this.puzzleContent.querySelectorAll('.ring-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const ring = parseInt(btn.dataset.ring);
                const val = parseInt(btn.dataset.val);
                this._treeRingValues[ring] = val;
                // 更新选中状态
                this.puzzleContent.querySelectorAll(`.ring-btn[data-ring="${ring}"]`).forEach(b => {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                this.puzzleContent.querySelector(`#ring-answer-${ring}`).textContent = `→ ${val}`;
            });
        });

        this.puzzleContent.querySelector('#puzzle-reset').addEventListener('click', () => {
            this._treeRingValues = [0, 0, 0, 0];
            this.puzzleContent.querySelectorAll('.ring-btn').forEach(b => b.classList.remove('selected'));
            this.puzzleContent.querySelectorAll('.ring-answer').forEach(a => a.textContent = '');
            this.puzzleContent.querySelector('#ring-feedback').textContent = '';
        });

        this.puzzleContent.querySelector('#puzzle-confirm').addEventListener('click', () => {
            const allFilled = this._treeRingValues.every(v => v > 0);
            if (!allFilled) {
                const fb = this.puzzleContent.querySelector('#ring-feedback');
                fb.textContent = '请为每层年轮都选择一个数字。';
                fb.className = 'puzzle-feedback error';
                return;
            }
            const isRight = p.rings.every((r, i) => this._treeRingValues[i] === r.answer);
            if (isRight) {
                this._solvePuzzle('treeRing');
            } else {
                const fb = this.puzzleContent.querySelector('#ring-feedback');
                fb.textContent = p.errorHint;
                fb.className = 'puzzle-feedback error';
            }
        });

        this.puzzleContent.querySelector('#puzzle-close').addEventListener('click', () => {
            this.puzzleOverlay.style.display = 'none';
        });
    },

    // --- 解谜4: 石壁图腾终极拼图 ---
    _openTotemPuzzle() {
        const p = PUZZLES.totem;
        this._totemSlots = [null, null, null, null]; // 4层

        this.puzzleContent.innerHTML = `
            <h3 class="puzzle-title">🔧 ${p.name}</h3>
            <p class="puzzle-rule">${p.rule}</p>
            <div class="totem-layout">
                <div class="totem-stones" id="totem-stones">
                    <div class="totem-stones-title">图腾石板素材栏</div>
                    ${p.stones.map((s, i) => `
                        <div class="totem-stone" data-stone="${s}" draggable="true">${s}</div>
                    `).join('')}
                </div>
                <div class="totem-wall" id="totem-wall">
                    <div class="totem-wall-title">石壁凹槽（由下至上）</div>
                    ${p.slots.map((s, i) => `
                        <div class="totem-slot" data-level="${i}">
                            <div class="totem-slot-label">${s.level}</div>
                            <div class="totem-slot-desc">${s.desc}</div>
                            <div class="totem-slot-drop" id="totem-drop-${i}">拖入石板</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="puzzle-feedback" id="totem-feedback"></div>
            <div class="puzzle-buttons">
                <button class="level1-btn secondary" id="puzzle-reset">重置全部石板</button>
                <button class="level1-btn" id="puzzle-confirm">完成图腾祭祀</button>
                <button class="level1-btn secondary" id="puzzle-close">关闭</button>
            </div>
        `;
        this.puzzleOverlay.style.display = 'flex';

        let draggedStone = null;
        this.puzzleContent.querySelectorAll('.totem-stone').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                draggedStone = el;
                e.dataTransfer.effectAllowed = 'move';
            });
        });

        this.puzzleContent.querySelectorAll('.totem-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => { e.preventDefault(); });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedStone) return;
                const level = parseInt(slot.dataset.level);
                const stoneName = draggedStone.dataset.stone;

                // 移出旧位置
                const oldLevel = this._totemSlots.indexOf(stoneName);
                if (oldLevel >= 0) {
                    this._totemSlots[oldLevel] = null;
                    const oldDrop = this.puzzleContent.querySelector(`#totem-drop-${oldLevel}`);
                    if (oldDrop) oldDrop.innerHTML = '拖入石板';
                }
                // 如果目标槽位已有东西，交换回素材栏
                const existing = this._totemSlots[level];
                if (existing) {
                    const existingEl = this.puzzleContent.querySelector(`.totem-stone[data-stone="${existing}"]`);
                    if (existingEl) {
                        this.puzzleContent.querySelector('#totem-stones').appendChild(existingEl);
                        existingEl.style.display = '';
                    }
                }

                this._totemSlots[level] = stoneName;
                const dropZone = this.puzzleContent.querySelector(`#totem-drop-${level}`);
                dropZone.innerHTML = '';
                dropZone.appendChild(draggedStone);
                draggedStone.style.display = 'block';
                draggedStone = null;
            });
        });

        this.puzzleContent.querySelector('#puzzle-reset').addEventListener('click', () => {
            this._totemSlots = [null, null, null, null];
            this._openTotemPuzzle();
        });

        this.puzzleContent.querySelector('#puzzle-confirm').addEventListener('click', () => {
            if (this._totemSlots.includes(null)) {
                const fb = this.puzzleContent.querySelector('#totem-feedback');
                fb.textContent = '四层凹槽必须全部填入图腾石板。';
                fb.className = 'puzzle-feedback error';
                return;
            }
            const isRight = p.slots.every((s, i) => this._totemSlots[i] === s.answer);
            if (isRight) {
                this._solvePuzzle('totem');
            } else {
                const fb = this.puzzleContent.querySelector('#totem-feedback');
                fb.textContent = p.errorHint;
                fb.className = 'puzzle-feedback error';
            }
        });

        this.puzzleContent.querySelector('#puzzle-close').addEventListener('click', () => {
            this.puzzleOverlay.style.display = 'none';
        });
    },

    // ========== 解谜通关 ==========
    _solvePuzzle(key) {
        gameState.level1.puzzles[key] = true;
        this.puzzleOverlay.style.display = 'none';
        this._showToast(`解谜成功：${PUZZLES[key].name}`);
        this._renderArea(gameState.level1.currentArea);
        this._updateProgressHud();

        if (key === 'totem') {
            // 终极解谜完成 → 触发结局
            setTimeout(() => this._startEnding(), 600);
        } else {
            this._checkTotemUnlock();
        }
    },

    _checkTotemUnlock() {
        if (this._isPuzzleUnlocked('totem') && !gameState.level1.puzzles.totem) {
            this._showToast('终极石壁拼图已解锁，前往祠堂挑战！');
        }
    },

    // ========== 通关结局 ==========
    _startEnding() {
        gameState.dialogueActive = true;
        // 先显示特效蒙层
        const fx = document.getElementById('level1-ending-fx');
        if (fx) fx.style.display = 'flex';
        setTimeout(() => {
            if (fx) fx.style.display = 'none';
            this._startDialogue(ENDING_DIALOGUES, () => {
                gameState.level1.completed = true;
                this._showEndingScreen();
            });
        }, 2500);
    },

    _showEndingScreen() {
        this.puzzleContent.innerHTML = `
            <div class="ending-screen">
                <h2 class="ending-title">一针藏山海，一线续畲魂</h2>
                <div class="ending-info">
                    <p>✅ 已通关：浙西南畲族古寨</p>
                    <p>📜 解锁藏品：《景宁畲族刺绣非遗数字档案》</p>
                    <p>🚶 前往下一站：东阳木雕古工坊</p>
                </div>
                <div class="ending-stats">
                    <p>收集文物：${Object.values(gameState.level1.artifacts).filter(v=>v).length}/5</p>
                    <p>匠人记忆：${Object.values(gameState.level1.memories).filter(v=>v).length}/4</p>
                    <p>完成解谜：${Object.values(gameState.level1.puzzles).filter(v=>v).length}/4</p>
                </div>
                <button class="level1-btn ending-btn" id="ending-continue">启程</button>
            </div>
        `;
        this.puzzleOverlay.style.display = 'flex';
        this.puzzleContent.querySelector('#ending-continue').addEventListener('click', () => {
            this.puzzleOverlay.style.display = 'none';
            this._exitToGame();
        });
    },

    _exitToGame() {
        SceneManager.hide('level1-screen');
        SceneManager.show('game-screen', 'block');
        SceneManager.show('ui-hud', 'flex');
        gameState.currentChapter = 'prologue';
        this._showToast('已返回序章，可按M查看地图');
    },

    // ========== 返回游戏按钮 ==========
    _bindBackToGame() {
        const btn = document.getElementById('level1-back-btn');
        if (btn) {
            btn.addEventListener('click', () => this._exitToGame());
        }
    },

    // ========== 进度HUD ==========
    _updateProgressHud() {
        if (!this.hudProgress) return;
        const arts = Object.values(gameState.level1.artifacts).filter(v=>v).length;
        const mems = Object.values(gameState.level1.memories).filter(v=>v).length;
        const pzls = Object.values(gameState.level1.puzzles).filter(v=>v).length;
        this.hudProgress.textContent = `文物 ${arts}/5 · 记忆 ${mems}/4 · 解谜 ${pzls}/4`;
    },

    // ========== Toast ==========
    _showToast(message) {
        let toast = document.querySelector('.toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
        }, 2500);
    },

    // ========== 重置 ==========
    _reset() {
        gameState.level1 = {
            entered: false, openingDone: false,
            artifacts: {1:false,2:false,3:false,4:false,5:false},
            memories: {1:false,2:false,3:false,4:false},
            puzzles: {loom:false,drying:false,treeRing:false,totem:false},
            currentArea: 'house', completed: false
        };
        this._dialogueQueue = [];
        this._dialogueIndex = 0;
        this._onDialogueEnd = null;
        SceneManager.hide('level1-screen');
    }
};
