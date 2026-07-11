// ========== 畲山采药·打靛制色 小游戏 ==========
// 阶段1：3D山体旋转采药（蓝草/栀子/苏木/茶籽）
// 阶段2：打靛音游（节奏点击，畲族打靛号子节拍）
// 入口：后山染布晒场 → 按 E 交互

export const DyeCraftGame = {
    overlay: null,
    container: null,
    _phase: 1,
    _onComplete: null,

    // ---- 阶段1：采药状态 ----
    _collected: new Set(),
    _rotation: 0,
    _isDragging: false,
    _dragStartX: 0,
    _dragStartRot: 0,
    _currentFace: 0,

    // ---- 阶段2：音游状态 ----
    _audioCtx: null,
    _beatTimer: null,
    _notes: [],
    _activeNotes: [],
    _noteIndex: 0,
    _score: 0,
    _combo: 0,
    _maxCombo: 0,
    _purity: 0,
    _hitCount: 0,
    _totalNotes: 0,
    _gameRunning: false,
    _startTime: 0,
    _rafId: null,
    _gameArea: null,
    _noteLayer: null,
    _purityBar: null,
    _comboEl: null,
    _feedbackEl: null,

    // 山体4面植物数据
    PLANTS: [
        { id: 'indigo',   name: '蓝草', icon: '🌿', color: '#4a90d9', face: 0, label: '阳坡 · 蓝草叶',   hint: '蓝草喜阳，生长在向阳山坡' },
        { id: 'gardenia', name: '栀子', icon: '🌼', color: '#e8c547', face: 1, label: '谷地 · 栀子果',   hint: '栀子果成熟于山间谷地' },
        { id: 'sappan',   name: '苏木', icon: '🪵', color: '#c0392b', face: 2, label: '崖壁 · 苏木心材', hint: '苏木心材藏于崖壁裂缝' },
        { id: 'tea',      name: '茶籽', icon: '🌰', color: '#8b5e3c', face: 3, label: '阴坡 · 茶籽',     hint: '茶籽避光，长在背阴山坡' }
    ],

    // 音符下落参数
    SPAWN_DELAY: 1.8,       // 音符从生成到到达判定线的时间（秒）
    NOTE_FALL_HEIGHT: 420,  // 音符下落距离（px）
    PERFECT_WINDOW: 0.10,   // Perfect 判定窗口（±秒）
    GOOD_WINDOW: 0.18,      // Good 判定窗口
    MISS_WINDOW: 0.25,      // 超过此时间未击中 = Miss
    PASS_PURITY: 3,         // 通关所需纯度（满5）

    // ==================== 初始化 ====================
    init() {
        this.overlay = document.getElementById('dye-craft-overlay');
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'dye-craft-overlay';
            this.overlay.className = 'dye-craft-overlay';
            this.overlay.style.display = 'none';
            document.body.appendChild(this.overlay);
        }

        const closeBtn = document.getElementById('dye-craft-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // 键盘判定（阶段2）
        document.addEventListener('keydown', (e) => {
            if (!this.overlay || this.overlay.style.display === 'none') return;
            if (this._phase !== 2 || !this._gameRunning) return;
            const k = e.key.toLowerCase();
            if (k === 'd' || k === 'arrowleft') { e.preventDefault(); this._hitLane('left'); }
            else if (k === 'k' || k === 'arrowright') { e.preventDefault(); this._hitLane('right'); }
        });

        this._generateNotes();
        console.log('DyeCraftGame: 初始化完成');
    },

    // ==================== 打开/关闭 ====================
    open(onComplete) {
        this._onComplete = onComplete || null;
        this._phase = 1;
        this._collected.clear();
        this._rotation = 0;
        this._currentFace = 0;
        this._score = 0;
        this._combo = 0;
        this._maxCombo = 0;
        this._purity = 0;
        this._hitCount = 0;
        this._activeNotes = [];
        this._noteIndex = 0;
        this._gameRunning = false;

        this._renderPhase1();
        this.overlay.style.display = 'flex';
    },

    close() {
        this._stopRhythm();
        if (this.overlay) this.overlay.style.display = 'none';
    },

    // ==================== 阶段1：畲山采药 ====================
    _renderPhase1() {
        this._currentFace = 0;
        const gradients = [
            'linear-gradient(180deg, #87CEEB 0%, #98D982 40%, #6B8E5A 70%, #4A6741 100%)',
            'linear-gradient(180deg, #B8D4E3 0%, #8FBC8F 35%, #5F7A5F 70%, #3D5A3D 100%)',
            'linear-gradient(180deg, #C8B89A 0%, #A08060 35%, #7A6048 65%, #5A4435 100%)',
            'linear-gradient(180deg, #9AA8B0 0%, #6E8B6E 35%, #4A6A4A 65%, #365536 100%)'
        ];

        this.overlay.innerHTML = `
            <div class="dye-craft-panel">
                <div class="dye-craft-header">
                    <h2>🌿 畲山采药</h2>
                    <button class="dye-craft-close-btn" id="dye-craft-close-x">✕</button>
                </div>
                <div class="dye-craft-hint" id="dc-hint">点击左右箭头切换山坡，点击植物采集 4 种染料原料</div>
                <div class="dye-craft-body">
                    <div class="mountain-stage" id="dc-mountain-stage">
                        <button class="mountain-nav prev" id="dc-prev">◀</button>
                        <div class="mountain-view" id="dc-mountain-view">
                            <div class="mountain-card" id="dc-mountain-card">
                                <div class="mountain-scenery">
                                    <div class="mountain-peak"></div>
                                    <div class="mountain-grass"></div>
                                </div>
                                <div class="plant-collectible" id="dc-plant-btn">
                                    <span class="plant-icon" id="dc-plant-icon">🌿</span>
                                    <span class="plant-label" id="dc-plant-name">阳坡 · 蓝草叶</span>
                                    <span class="plant-hint" id="dc-plant-hint">点击采集</span>
                                </div>
                            </div>
                        </div>
                        <button class="mountain-nav next" id="dc-next">▶</button>
                        <div class="mountain-dots" id="dc-dots">
                            ${this.PLANTS.map((p, i) => `<span class="mountain-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('')}
                        </div>
                        <div class="mountain-face-label" id="dc-face-label">${this.PLANTS[0].label}</div>
                    </div>
                    <div class="basket-area">
                        <div class="basket-title">竹篓</div>
                        <div class="basket-slots" id="dc-basket-slots">
                            ${this.PLANTS.map(p => `
                                <div class="basket-slot ${p.id}" data-plant="${p.id}">
                                    <span class="basket-slot-icon">${p.icon}</span>
                                    <span class="basket-slot-name">${p.name}</span>
                                    <span class="basket-slot-status">未采</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="basket-count" id="dc-basket-count">已采集 0 / 4</div>
                        <button class="dye-craft-btn primary" id="dc-to-phase2" disabled>开始打靛制色 →</button>
                    </div>
                </div>
            </div>
        `;

        // 绑定关闭
        const closeX = document.getElementById('dye-craft-close-x');
        if (closeX) closeX.addEventListener('click', () => this.close());

        // 绑定左右切换
        const prevBtn = document.getElementById('dc-prev');
        const nextBtn = document.getElementById('dc-next');
        if (prevBtn) prevBtn.addEventListener('click', () => this._switchPage(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this._switchPage(1));

        // 绑定圆点切换
        this.overlay.querySelectorAll('.mountain-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.dataset.idx);
                if (idx !== this._currentFace) this._switchPage(idx - this._currentFace);
            });
        });

        // 绑定采集点击
        const plantBtn = document.getElementById('dc-plant-btn');
        if (plantBtn) {
            plantBtn.addEventListener('click', () => {
                const plant = this.PLANTS[this._currentFace];
                if (!plant || this._collected.has(plant.id)) return;
                this._collectPlant(plant.id);
            });
        }

        // 绑定进入阶段2
        const toP2 = document.getElementById('dc-to-phase2');
        if (toP2) {
            toP2.addEventListener('click', () => {
                if (this._collected.size >= 4) this._startPhase2();
            });
        }

        // 初始化第一页
        this._renderPageContent();
    },

    _switchPage(direction) {
        const newFace = (this._currentFace + direction + 4) % 4;
        if (newFace === this._currentFace) return;

        const card = document.getElementById('dc-mountain-card');
        if (!card) { this._currentFace = newFace; this._renderPageContent(); return; }

        // 旋转翻出
        const outDeg = direction > 0 ? -90 : 90;
        card.style.transition = 'transform 0.25s ease-in, opacity 0.25s ease-in';
        card.style.transform = `rotateY(${outDeg}deg)`;
        card.style.opacity = '0';

        setTimeout(() => {
            this._currentFace = newFace;
            this._renderPageContent();
            // 从另一侧旋转翻入
            const inDeg = direction > 0 ? 90 : -90;
            card.style.transition = 'none';
            card.style.transform = `rotateY(${inDeg}deg)`;
            card.style.opacity = '0';
            // 强制重绘
            card.offsetHeight;
            card.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
            card.style.transform = 'rotateY(0deg)';
            card.style.opacity = '1';
        }, 250);
    },

    _renderPageContent() {
        const plant = this.PLANTS[this._currentFace];
        const gradients = [
            'linear-gradient(180deg, #87CEEB 0%, #98D982 40%, #6B8E5A 70%, #4A6741 100%)',
            'linear-gradient(180deg, #B8D4E3 0%, #8FBC8F 35%, #5F7A5F 70%, #3D5A3D 100%)',
            'linear-gradient(180deg, #C8B89A 0%, #A08060 35%, #7A6048 65%, #5A4435 100%)',
            'linear-gradient(180deg, #9AA8B0 0%, #6E8B6E 35%, #4A6A4A 65%, #365536 100%)'
        ];

        const card = document.getElementById('dc-mountain-card');
        if (card) card.style.background = gradients[this._currentFace];

        const icon = document.getElementById('dc-plant-icon');
        if (icon) { icon.textContent = plant.icon; icon.style.color = plant.color; }

        const name = document.getElementById('dc-plant-name');
        if (name) name.textContent = plant.label;

        const hint = document.getElementById('dc-plant-hint');
        const collected = this._collected.has(plant.id);
        if (hint) hint.textContent = collected ? '✓ 已采集' : '点击采集';

        const plantBtn = document.getElementById('dc-plant-btn');
        if (plantBtn) {
            plantBtn.style.cursor = collected ? 'default' : 'pointer';
            plantBtn.style.opacity = collected ? '0.4' : '1';
        }

        const label = document.getElementById('dc-face-label');
        if (label) label.textContent = plant.label;

        // 更新圆点
        this.overlay.querySelectorAll('.mountain-dot').forEach(dot => {
            dot.classList.toggle('active', parseInt(dot.dataset.idx) === this._currentFace);
        });
    },

    _collectPlant(id) {
        if (this._collected.has(id)) return;
        this._collected.add(id);

        const plant = this.PLANTS.find(p => p.id === id);

        // 采集动画
        const icon = document.getElementById('dc-plant-icon');
        if (icon) {
            icon.style.transition = 'all 0.5s ease';
            icon.style.transform = 'scale(0.3) translateY(100px)';
            icon.style.opacity = '0';
        }

        // 更新竹篓
        const slot = this.overlay.querySelector(`.basket-slot[data-plant="${id}"]`);
        if (slot) {
            slot.classList.add('collected');
            const status = slot.querySelector('.basket-slot-status');
            if (status) status.textContent = '已采';
        }

        const countEl = document.getElementById('dc-basket-count');
        if (countEl) countEl.textContent = `已采集 ${this._collected.size} / 4`;

        const hintEl = document.getElementById('dc-hint');
        if (hintEl) hintEl.textContent = `采集到 ${plant.name}！${plant.hint}`;

        // 更新页面状态
        this._renderPageContent();

        // 恢复图标（为下次切换做准备）
        setTimeout(() => {
            if (icon) { icon.style.transition = 'none'; icon.style.transform = ''; icon.style.opacity = ''; }
        }, 600);

        // 全部采齐
        if (this._collected.size >= 4) {
            const btn = document.getElementById('dc-to-phase2');
            if (btn) btn.disabled = false;
            if (hintEl) hintEl.textContent = '4 种染料原料采集完毕！点击「开始打靛制色」进入下一阶段';
        }
    },

    // ==================== 阶段2：打靛音游 ====================
    _startPhase2() {
        this._phase = 2;
        this._renderPhase2();
    },

    _renderPhase2() {
        this.overlay.innerHTML = `
            <div class="dye-craft-panel rhythm-panel">
                <div class="dye-craft-header">
                    <h2>🥁 打靛制色</h2>
                    <button class="dye-craft-close-btn" id="dye-craft-close-x2">✕</button>
                </div>
                <div class="dye-craft-hint">跟着畲族打靛号子的节奏锤打！音符到达判定线时按 <b>D</b>（左锤）或 <b>K</b>（右锤）</div>
                <div class="rhythm-body">
                    <div class="rhythm-mortar" id="dc-mortar">
                        <div class="mortar-bowl"></div>
                        <div class="mortar-pestle" id="dc-pestle-left">🔨</div>
                        <div class="mortar-pestle right" id="dc-pestle-right">🔨</div>
                        <div class="mortar-splash" id="dc-splash"></div>
                    </div>
                    <div class="rhythm-game-area" id="dc-game-area">
                        <div class="rhythm-lanes">
                            <div class="rhythm-lane left-lane" id="dc-lane-left">
                                <div class="lane-judgment-line"></div>
                                <div class="lane-hit-zone" id="dc-hit-left">D</div>
                            </div>
                            <div class="rhythm-lane right-lane" id="dc-lane-right">
                                <div class="lane-judgment-line"></div>
                                <div class="lane-hit-zone" id="dc-hit-right">K</div>
                            </div>
                        </div>
                        <div class="rhythm-note-layer" id="dc-note-layer"></div>
                    </div>
                    <div class="rhythm-sidebar">
                        <div class="rhythm-stat">
                            <div class="stat-label">连击</div>
                            <div class="stat-value" id="dc-combo">0</div>
                        </div>
                        <div class="rhythm-stat">
                            <div class="stat-label">得分</div>
                            <div class="stat-value" id="dc-score">0</div>
                        </div>
                        <div class="purity-section">
                            <div class="stat-label">靛蓝纯度</div>
                            <div class="purity-bar" id="dc-purity-bar">
                                <div class="purity-fill" id="dc-purity-fill"></div>
                                <div class="purity-cells">
                                    <span class="purity-cell"></span>
                                    <span class="purity-cell"></span>
                                    <span class="purity-cell"></span>
                                    <span class="purity-cell"></span>
                                    <span class="purity-cell"></span>
                                </div>
                            </div>
                            <div class="purity-text" id="dc-purity-text">0 / 5</div>
                            <div class="purity-target">达标: ${this.PASS_PURITY} / 5</div>
                        </div>
                    </div>
                </div>
                <div class="rhythm-feedback" id="dc-feedback"></div>
                <div class="rhythm-controls">
                    <button class="dye-craft-btn" id="dc-retry">重新开始</button>
                    <button class="dye-craft-btn" id="dc-skip">返回采药</button>
                </div>
            </div>
        `;

        const closeX = document.getElementById('dye-craft-close-x2');
        if (closeX) closeX.addEventListener('click', () => this.close());

        const retry = document.getElementById('dc-retry');
        if (retry) retry.addEventListener('click', () => this._startRhythm());

        const skip = document.getElementById('dc-skip');
        if (skip) skip.addEventListener('click', () => { this._phase = 1; this._renderPhase1(); });

        // 点击判定区也能击打
        const hitLeft = document.getElementById('dc-hit-left');
        const hitRight = document.getElementById('dc-hit-right');
        if (hitLeft) hitLeft.addEventListener('click', () => this._hitLane('left'));
        if (hitRight) hitRight.addEventListener('click', () => this._hitLane('right'));

        this._gameArea = document.getElementById('dc-game-area');
        this._noteLayer = document.getElementById('dc-note-layer');
        this._purityBar = document.getElementById('dc-purity-fill');
        this._comboEl = document.getElementById('dc-combo');
        this._feedbackEl = document.getElementById('dc-feedback');

        this._startRhythm();
    },

    _generateNotes() {
        // 生成约30秒的音符序列，模仿打靛号子节奏
        const notes = [];
        const beat = 0.6; // 约100 BPM
        let t = 2.5; // 前2.5秒准备

        // 第一段：慢速交替（10秒）
        for (let i = 0; i < 14; i++) {
            notes.push({ time: t, lane: i % 2 === 0 ? 'left' : 'right' });
            t += beat;
        }

        // 间奏
        t += 0.3;

        // 第二段：加入双拍（10秒）
        for (let i = 0; i < 14; i++) {
            notes.push({ time: t, lane: i % 2 === 0 ? 'left' : 'right' });
            if (i % 3 === 2) {
                notes.push({ time: t + beat * 0.5, lane: i % 2 === 0 ? 'right' : 'left' });
            }
            t += beat;
        }

        // 间奏
        t += 0.3;

        // 第三段：加速收尾（8秒）
        const fastBeat = beat * 0.75;
        for (let i = 0; i < 12; i++) {
            notes.push({ time: t, lane: i % 2 === 0 ? 'right' : 'left' });
            t += fastBeat;
        }

        this._notes = notes;
        this._totalNotes = notes.length;
    },

    _startRhythm() {
        this._stopRhythm();
        this._score = 0;
        this._combo = 0;
        this._maxCombo = 0;
        this._purity = 0;
        this._hitCount = 0;
        this._activeNotes = [];
        this._noteIndex = 0;
        this._gameRunning = true;

        // 清空音符层
        if (this._noteLayer) this._noteLayer.innerHTML = '';
        this._updateUI();

        // 初始化音频
        this._initAudio();

        // 记录开始时间
        this._startTime = this._audioCtx.currentTime + 0.1;

        // 启动节拍器
        this._startBeats();

        // 启动游戏循环
        this._gameLoop();
    },

    _stopRhythm() {
        this._gameRunning = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        if (this._beatTimer) {
            clearInterval(this._beatTimer);
            this._beatTimer = null;
        }
    },

    _initAudio() {
        if (!this._audioCtx) {
            try {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('DyeCraft: Web Audio API 不可用');
            }
        }
        if (this._audioCtx && this._audioCtx.state === 'suspended') {
            this._audioCtx.resume();
        }
    },

    _startBeats() {
        if (!this._audioCtx) return;
        const beatTime = 0.6;
        let beatNum = 0;
        const startAt = this._startTime;

        this._beatTimer = setInterval(() => {
            const now = this._audioCtx.currentTime;
            const expected = startAt + beatNum * beatTime;
            if (now >= expected - 0.05) {
                this._playDrum(beatNum);
                beatNum++;
            }
            // 30秒后停止
            if (beatNum > 52) {
                clearInterval(this._beatTimer);
                this._beatTimer = null;
            }
        }, 50);
    },

    _playDrum(beatNum) {
        if (!this._audioCtx) return;
        const ctx = this._audioCtx;
        const t = ctx.currentTime;

        // 低音鼓（每拍）
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(beatNum % 2 === 0 ? 80 : 60, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);

        // 弱高音（偶数拍加点色彩）
        if (beatNum % 2 === 0) {
            const hosc = ctx.createOscillator();
            const hgain = ctx.createGain();
            hosc.frequency.setValueAtTime(300, t);
            hosc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
            hgain.gain.setValueAtTime(0.1, t);
            hgain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            hosc.connect(hgain);
            hgain.connect(ctx.destination);
            hosc.start(t);
            hosc.stop(t + 0.1);
        }
    },

    _playHitSound(success) {
        if (!this._audioCtx) return;
        const ctx = this._audioCtx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (success) {
            // 清脆击中音
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        } else {
            // 沉闷未中音
            osc.frequency.setValueAtTime(120, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        }
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    _gameLoop() {
        if (!this._gameRunning || !this._audioCtx) return;

        const now = this._audioCtx.currentTime - this._startTime;

        // 生成新音符
        while (this._noteIndex < this._notes.length) {
            const note = this._notes[this._noteIndex];
            if (note.time - now <= this.SPAWN_DELAY) {
                this._spawnNote(note);
                this._noteIndex++;
            } else {
                break;
            }
        }

        // 更新音符位置 & 检查 Miss
        const judgmentY = this.NOTE_FALL_HEIGHT;
        for (let i = this._activeNotes.length - 1; i >= 0; i--) {
            const n = this._activeNotes[i];
            const timeUntilHit = n.time - now;
            const progress = 1 - (timeUntilHit / this.SPAWN_DELAY);
            const y = progress * judgmentY;

            if (n.el) {
                n.el.style.top = y + 'px';
            }

            // 超过判定窗口 = Miss
            if (timeUntilHit < -this.MISS_WINDOW) {
                this._onMiss(n);
                this._activeNotes.splice(i, 1);
            }
        }

        // 检查是否结束
        if (this._noteIndex >= this._notes.length && this._activeNotes.length === 0 && now > 0) {
            this._endRhythm();
            return;
        }

        this._rafId = requestAnimationFrame(() => this._gameLoop());
    },

    _spawnNote(note) {
        if (!this._noteLayer) return;
        const el = document.createElement('div');
        el.className = 'rhythm-note ' + note.lane;
        el.innerHTML = note.lane === 'left' ? '◆' : '◆';
        el.style.top = '0px';
        el.style.left = note.lane === 'left' ? '25%' : '75%';
        this._noteLayer.appendChild(el);
        this._activeNotes.push({ time: note.time, lane: note.lane, el: el });
    },

    _hitLane(lane) {
        if (!this._gameRunning || !this._audioCtx) return;

        const now = this._audioCtx.currentTime - this._startTime;

        // 找到该车道最接近判定线的音符
        let bestIdx = -1;
        let bestDelta = Infinity;
        for (let i = 0; i < this._activeNotes.length; i++) {
            const n = this._activeNotes[i];
            if (n.lane !== lane) continue;
            const delta = Math.abs(n.time - now);
            if (delta < bestDelta) {
                bestDelta = delta;
                bestIdx = i;
            }
        }

        // 锤子动画
        this._pestleAnim(lane);

        if (bestIdx >= 0 && bestDelta <= this.GOOD_WINDOW) {
            // 命中
            const n = this._activeNotes[bestIdx];
            this._activeNotes.splice(bestIdx, 1);

            let judgment;
            if (bestDelta <= this.PERFECT_WINDOW) {
                judgment = 'PERFECT';
                this._score += 100;
                this._purity = Math.min(5, this._purity + 0.5);
            } else {
                judgment = 'GOOD';
                this._score += 50;
                this._purity = Math.min(5, this._purity + 0.3);
            }

            this._combo++;
            if (this._combo > this._maxCombo) this._maxCombo = this._combo;
            this._hitCount++;

            this._playHitSound(true);
            this._showFeedback(judgment, true);
            this._splashEffect(true);

            // 移除音符
            if (n.el) {
                n.el.classList.add('hit');
                setTimeout(() => { if (n.el) n.el.remove(); }, 300);
            }
        } else {
            // 空挥
            this._combo = 0;
            this._purity = Math.max(0, this._purity - 0.2);
            this._playHitSound(false);
            this._showFeedback('MISS', false);
            this._splashEffect(false);
        }

        this._updateUI();
    },

    _onMiss(note) {
        this._combo = 0;
        this._purity = Math.max(0, this._purity - 0.15);
        this._showFeedback('MISS', false);
        if (note.el) {
            note.el.classList.add('miss');
            setTimeout(() => { if (note.el) note.el.remove(); }, 300);
        }
        this._updateUI();
    },

    _pestleAnim(lane) {
        const pestle = document.getElementById(lane === 'left' ? 'dc-pestle-left' : 'dc-pestle-right');
        if (!pestle) return;
        pestle.classList.add('strike');
        setTimeout(() => pestle.classList.remove('strike'), 200);
    },

    _splashEffect(success) {
        const splash = document.getElementById('dc-splash');
        if (!splash) return;
        splash.style.background = success
            ? 'radial-gradient(circle, rgba(74,144,217,0.6) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(100,100,100,0.4) 0%, transparent 70%)';
        splash.style.opacity = '1';
        splash.style.transform = 'scale(1.5)';
        setTimeout(() => {
            splash.style.opacity = '0';
            splash.style.transform = 'scale(1)';
        }, 300);
    },

    _showFeedback(text, success) {
        if (!this._feedbackEl) return;
        this._feedbackEl.textContent = text;
        this._feedbackEl.className = 'rhythm-feedback ' + (success ? 'success' : 'fail') + ' show';
        setTimeout(() => {
            if (this._feedbackEl) this._feedbackEl.classList.remove('show');
        }, 500);
    },

    _updateUI() {
        const scoreEl = document.getElementById('dc-score');
        if (scoreEl) scoreEl.textContent = this._score;

        if (this._comboEl) this._comboEl.textContent = this._combo;

        const purityInt = Math.floor(this._purity);
        if (this._purityBar) {
            this._purityBar.style.width = (this._purity / 5 * 100) + '%';
        }
        const purityText = document.getElementById('dc-purity-text');
        if (purityText) purityText.textContent = purityInt + ' / 5';

        // 更新纯度格子颜色
        const cells = this.overlay.querySelectorAll('.purity-cell');
        cells.forEach((cell, i) => {
            cell.classList.toggle('filled', i < purityInt);
        });
    },

    _endRhythm() {
        this._gameRunning = false;
        this._stopRhythm();

        const passed = Math.floor(this._purity) >= this.PASS_PURITY;
        const purityInt = Math.floor(this._purity);

        const grade = purityInt >= 5 ? '完美' : purityInt >= 4 ? '优秀' : purityInt >= 3 ? '合格' : '未达标';

        this.overlay.innerHTML = `
            <div class="dye-craft-panel result-panel">
                <div class="dye-craft-header">
                    <h2>${passed ? '✅ 打靛成功！' : '❌ 纯度不足'}</h2>
                </div>
                <div class="result-body">
                    <div class="result-grade ${passed ? 'pass' : 'fail'}">${grade}</div>
                    <div class="result-stats">
                        <div class="result-stat"><span>靛蓝纯度</span><b>${purityInt} / 5</b></div>
                        <div class="result-stat"><span>最高连击</span><b>${this._maxCombo}</b></div>
                        <div class="result-stat"><span>总得分</span><b>${this._score}</b></div>
                        <div class="result-stat"><span>命中率</span><b>${this._totalNotes > 0 ? Math.round(this._hitCount / this._totalNotes * 100) : 0}%</b></div>
                    </div>
                    <div class="result-message">
                        ${passed
            ? '蓝靛泥在石臼中逐渐泛出深邃的靛蓝色泽，染料制作完成！<br>阿婆的记忆在心中回响：草木取染，一叶一色，皆是畲山的馈赠。'
            : '蓝靛泥颜色不够纯正，再试一次，跟上打靛号子的节奏！'}
                    </div>
                    <div class="result-actions">
                        ${passed ? '' : '<button class="dye-craft-btn primary" id="dc-retry2">重新打靛</button>'}
                        ${passed ? '' : '<button class="dye-craft-btn" id="dc-back-pick">返回采药</button>'}
                        ${passed ? '<button class="dye-craft-btn primary" id="dc-finish">完成制色 ✓</button>' : ''}
                    </div>
                </div>
            </div>
        `;

        if (passed) {
            const finish = document.getElementById('dc-finish');
            if (finish) {
                finish.addEventListener('click', () => {
                    this.close();
                    if (this._onComplete) this._onComplete();
                });
            }
        } else {
            const retry2 = document.getElementById('dc-retry2');
            if (retry2) retry2.addEventListener('click', () => this._startPhase2());
            const backPick = document.getElementById('dc-back-pick');
            if (backPick) backPick.addEventListener('click', () => { this._phase = 1; this._renderPhase1(); });
        }
    }
};
