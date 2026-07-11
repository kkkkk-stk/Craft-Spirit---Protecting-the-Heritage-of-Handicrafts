// ========== 浸染丝线·晾晒 小游戏 ==========
// 阶段1：QTE 浸染（丝线下沉→点击捞出→判定深浅）
// 阶段2：晾晒排序（拖动丝线到正确晾晒架）

export const DyeThreadGame = {
    overlay: null,
    _onComplete: null,
    _phase: 1,

    // 浸染状态
    _currentThread: 0,
    _dipProgress: [0, 0, 0, 0, 0],
    _dipCounts: [0, 0, 0, 0, 0],
    _isDipping: false,
    _isOxidizing: false,
    _dipStart: 0,
    _rafId: null,
    _dipDuration: 2000,

    // 晾晒状态
    _dryingPlaced: [null, null, null, null, null],

    // 5根丝线数据（对应真实工艺：浅色少染，深色多染）
    THREADS: [
        { name: '栀子黄', targetColor: '#e8c547', lightColor: '#f5e89c', targetDips: 1, dyeName: '栀子汁',  icon: '🟡' },
        { name: '草木绿', targetColor: '#7cb342', lightColor: '#c5e1a5', targetDips: 2, dyeName: '草木灰',  icon: '🟢' },
        { name: '蓝草蓝', targetColor: '#4a90d9', lightColor: '#bbdefb', targetDips: 3, dyeName: '蓝靛泥',  icon: '🔵' },
        { name: '苏木红', targetColor: '#c0392b', lightColor: '#ef9a9a', targetDips: 4, dyeName: '苏木煎',  icon: '🔴' },
        { name: '茶籽黑', targetColor: '#3a3a3a', lightColor: '#9e9e9e', targetDips: 5, dyeName: '茶籽液',  icon: '⚫' },
    ],

    // 判定窗口（进度百分比 0-100）
    JUDGE: {
        PERFECT_MIN: 80, PERFECT_MAX: 95,
        GOOD_MIN: 60,    GOOD_MAX: 80,
        OK_MIN: 40,      OK_MAX: 60,
        EARLY_MIN: 20,   EARLY_MAX: 40,
    },

    init() {
        this.overlay = document.getElementById('dye-thread-overlay');
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'dye-thread-overlay';
            this.overlay.className = 'dye-thread-overlay';
            this.overlay.style.display = 'none';
            document.body.appendChild(this.overlay);
        }
        console.log('DyeThreadGame: 初始化完成');
    },

    open(onComplete) {
        this._onComplete = onComplete || null;
        this._phase = 1;
        this._currentThread = 0;
        this._dipProgress = [0, 0, 0, 0, 0];
        this._dipCounts = [0, 0, 0, 0, 0];
        this._dryingPlaced = [null, null, null, null, null];
        this._isDipping = false;
        this._isOxidizing = false;
        this._renderDyeingPhase();
        this.overlay.style.display = 'flex';
    },

    close() {
        this._stopDip();
        if (this.overlay) this.overlay.style.display = 'none';
    },

    // ==================== 阶段1：QTE浸染 ====================
    _renderDyeingPhase() {
        const thread = this.THREADS[this._currentThread];
        const progress = this._dipProgress[this._currentThread];
        const dips = this._dipCounts[this._currentThread];

        this.overlay.innerHTML = `
            <div class="dt-panel">
                <div class="dt-header">
                    <h2>🧵 浸染丝线</h2>
                    <button class="dt-close-btn" id="dt-close-x">✕</button>
                </div>
                <div class="dt-hint" id="dt-hint">将白丝线浸入染缸，在合适时机点击「捞出」控制颜色深浅</div>

                <div class="dt-dyeing-body">
                    <!-- 左侧：丝线状态栏 -->
                    <div class="dt-thread-list">
                        <div class="dt-section-title">丝线进度</div>
                        ${this.THREADS.map((t, i) => {
                            const p = this._dipProgress[i];
                            const d = this._dipCounts[i];
                            const done = d >= t.targetDips;
                            const current = i === this._currentThread;
                            const colorVal = done ? t.targetColor : (d > 0 ? t.lightColor : '#ffffff');
                            return `
                                <div class="dt-thread-item ${current ? 'current' : ''} ${done ? 'done' : ''}">
                                    <span class="dt-thread-icon" style="background:${colorVal};">${t.icon}</span>
                                    <div class="dt-thread-info">
                                        <div class="dt-thread-name">${t.name}</div>
                                        <div class="dt-thread-dips">${d}/${t.targetDips} 次</div>
                                    </div>
                                    ${done ? '<span class="dt-check">✅</span>' : (current ? '<span class="dt-arrow">▶</span>' : '<span class="dt-lock">🔒</span>')}
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- 中央：染缸QTE -->
                    <div class="dt-vat-area" id="dt-vat-area">
                        <div class="dt-thread-label" id="dt-thread-label">${thread.name} · 染料: ${thread.dyeName}</div>
                        <div class="dt-vat" id="dt-vat">
                            <div class="dt-vat-liquid" style="background: linear-gradient(180deg, ${thread.targetColor}88, ${thread.targetColor});"></div>
                            <div class="dt-thread-line" id="dt-thread-line">
                                <div class="dt-thread-knot" id="dt-thread-knot"></div>
                            </div>
                            <div class="dt-vat-rim"></div>
                        </div>
                        <div class="dt-dip-meter" id="dt-dip-meter">
                            <div class="dt-dip-track">
                                <div class="dt-dip-zone perfect">P</div>
                                <div class="dt-dip-zone good">G</div>
                                <div class="dt-dip-zone ok">O</div>
                                <div class="dt-dip-zone early">E</div>
                            </div>
                            <div class="dt-dip-pointer" id="dt-dip-pointer"></div>
                            <div class="dt-dip-label">下沉进度</div>
                        </div>
                        <button class="dt-retrieve-btn" id="dt-retrieve">👆 点击捞出</button>
                        <div class="dt-feedback" id="dt-feedback"></div>
                    </div>

                    <!-- 右侧：当前丝线详情 -->
                    <div class="dt-detail">
                        <div class="dt-section-title">当前丝线</div>
                        <div class="dt-detail-icon" id="dt-detail-icon" style="color:${thread.targetColor};">${thread.icon}</div>
                        <div class="dt-detail-name">${thread.name}</div>
                        <div class="dt-detail-dye">染料: ${thread.dyeName}</div>
                        <div class="dt-detail-progress">
                            <div class="dt-progress-label">浸染进度</div>
                            <div class="dt-progress-dots" id="dt-progress-dots">
                                ${Array.from({length: thread.targetDips}, (_, i) =>
                                    `<span class="dt-dot ${i < dips ? 'filled' : ''}"></span>`
                                ).join('')}
                            </div>
                            <div class="dt-progress-count">${dips} / ${thread.targetDips}</div>
                        </div>
                        <div class="dt-color-preview">
                            <div class="dt-color-label">当前色</div>
                            <div class="dt-color-swatch" id="dt-color-swatch" style="background:${dips > 0 ? thread.lightColor : '#ffffff'};"></div>
                            <div class="dt-color-arrow">→</div>
                            <div class="dt-color-label">目标色</div>
                            <div class="dt-color-swatch target" style="background:${thread.targetColor};"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const closeX = document.getElementById('dt-close-x');
        if (closeX) closeX.addEventListener('click', () => this.close());

        const retrieveBtn = document.getElementById('dt-retrieve');
        if (retrieveBtn) retrieveBtn.addEventListener('click', () => this._clickRetrieve());

        // 点击染缸区域也能捞出
        const vatArea = document.getElementById('dt-vat-area');
        if (vatArea) vatArea.addEventListener('click', (e) => {
            if (e.target.id !== 'dt-close-x' && !e.target.closest('.dt-thread-item')) {
                this._clickRetrieve();
            }
        });

        // 空格键也能捞出
        this._keyHandler = (e) => {
            if (this.overlay.style.display === 'none') return;
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                this._clickRetrieve();
            }
        };
        document.addEventListener('keydown', this._keyHandler);

        // 开始第一次浸染
        setTimeout(() => this._startDip(), 600);
    },

    _startDip() {
        if (this._isDipping || this._isOxidizing) return;
        this._isDipping = true;
        this._dipStart = performance.now();

        const hintEl = document.getElementById('dt-hint');
        if (hintEl) hintEl.textContent = '丝线正在下沉…在合适时机点击「捞出」或按空格！';

        const retrieveBtn = document.getElementById('dt-retrieve');
        if (retrieveBtn) { retrieveBtn.disabled = false; retrieveBtn.textContent = '👆 点击捞出！'; }

        this._dipLoop();
    },

    _dipLoop() {
        if (!this._isDipping) return;

        const elapsed = performance.now() - this._dipStart;
        const progress = Math.min(100, (elapsed / this._dipDuration) * 100);

        // 更新指针位置
        const pointer = document.getElementById('dt-dip-pointer');
        if (pointer) pointer.style.left = progress + '%';

        // 更新丝线下沉位置
        const threadLine = document.getElementById('dt-thread-line');
        if (threadLine) {
            const sinkDepth = (progress / 100) * 180; // 最大下沉180px
            threadLine.style.height = (40 + sinkDepth) + 'px';
        }

        // 丝线逐渐染色（进入染液后）
        const thread = this.THREADS[this._currentThread];
        const knot = document.getElementById('dt-thread-knot');
        if (knot && progress > 30) {
            const intensity = Math.min(1, (progress - 30) / 70);
            knot.style.background = this._blendColor('#ffffff', thread.targetColor, intensity * 0.6);
        }

        // 沉底 = MISS
        if (progress >= 100) {
            this._judgeDip(100);
            return;
        }

        this._rafId = requestAnimationFrame(() => this._dipLoop());
    },

    _clickRetrieve() {
        if (!this._isDipping) return;
        this._isDipping = false;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }

        const elapsed = performance.now() - this._dipStart;
        const progress = Math.min(100, (elapsed / this._dipDuration) * 100);
        this._judgeDip(progress);
    },

    _judgeDip(progress) {
        this._isDipping = false;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }

        const thread = this.THREADS[this._currentThread];
        let judgment, dipGain, feedbackText, feedbackClass;

        if (progress >= 100) {
            judgment = 'MISS';
            dipGain = 0;
            feedbackText = '沉底了！丝线过度浸染发灰…';
            feedbackClass = 'fail';
        } else if (progress >= this.JUDGE.PERFECT_MIN && progress <= this.JUDGE.PERFECT_MAX) {
            judgment = 'PERFECT';
            dipGain = 1;
            feedbackText = '完美时机！染料充分附着';
            feedbackClass = 'perfect';
        } else if (progress >= this.JUDGE.GOOD_MIN) {
            judgment = 'GOOD';
            dipGain = 1;
            feedbackText = '不错！浸染成功';
            feedbackClass = 'good';
        } else if (progress >= this.Judge_OK_MIN()) {
            judgment = 'OK';
            dipGain = 0.5;
            feedbackText = '浸染不足，只染上了一半…';
            feedbackClass = 'ok';
        } else {
            judgment = 'EARLY';
            dipGain = 0;
            feedbackText = '太早了！丝线还没充分浸入染液';
            feedbackClass = 'fail';
        }

        // 更新进度
        this._dipCounts[this._currentThread] += dipGain;

        // 显示反馈
        const fbEl = document.getElementById('dt-feedback');
        if (fbEl) {
            fbEl.textContent = judgment + ' — ' + feedbackText;
            fbEl.className = 'dt-feedback ' + feedbackClass + ' show';
        }

        // 更新颜色色块
        const swatch = document.getElementById('dt-color-swatch');
        if (swatch) {
            const dips = this._dipCounts[this._currentThread];
            const ratio = Math.min(1, dips / thread.targetDips);
            swatch.style.background = this._blendColor('#ffffff', thread.targetColor, ratio);
        }

        // 更新进度点
        this._updateProgressDots();

        // 禁用按钮
        const retrieveBtn = document.getElementById('dt-retrieve');
        if (retrieveBtn) { retrieveBtn.disabled = true; retrieveBtn.textContent = '氧化中…'; }

        // 检查是否完成当前丝线
        const currentDips = this._dipCounts[this._currentThread];
        if (currentDips >= thread.targetDips) {
            // 当前丝线完成
            const hintEl = document.getElementById('dt-hint');
            if (hintEl) hintEl.textContent = `${thread.name} 染色完成！准备下一根…`;
            setTimeout(() => this._nextThread(), 1500);
        } else {
            // 需要再浸染一次（氧化等待）
            this._isOxidizing = true;
            const hintEl = document.getElementById('dt-hint');
            if (hintEl) hintEl.textContent = '空气中氧化…丝线颜色逐渐加深…';
            setTimeout(() => {
                this._isOxidizing = false;
                this._startDip();
            }, 1200);
        }

        // 1秒后隐藏反馈
        setTimeout(() => {
            if (fbEl) fbEl.classList.remove('show');
        }, 1000);
    },

    Judge_OK_MIN() { return this.JUDGE.OK_MIN; },

    _updateProgressDots() {
        const thread = this.THREADS[this._currentThread];
        const dips = this._dipCounts[this._currentThread];
        const dotsContainer = document.getElementById('dt-progress-dots');
        if (!dotsContainer) return;
        const dots = dotsContainer.querySelectorAll('.dt-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < Math.floor(dips));
            dot.classList.toggle('half', i === Math.floor(dips) && dips % 1 > 0);
        });
    },

    _nextThread() {
        this._currentThread++;
        if (this._currentThread >= this.THREADS.length) {
            // 全部染完，进入晾晒
            this._startDryingPhase();
        } else {
            this._renderDyeingPhase();
        }
    },

    _stopDip() {
        this._isDipping = false;
        this._isOxidizing = false;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    _blendColor(c1, c2, ratio) {
        const p1 = this._parseHex(c1);
        const p2 = this._parseHex(c2);
        const r = Math.round(p1[0] + (p2[0] - p1[0]) * ratio);
        const g = Math.round(p1[1] + (p2[1] - p1[1]) * ratio);
        const b = Math.round(p1[2] + (p2[2] - p1[2]) * ratio);
        return `rgb(${r},${g},${b})`;
    },

    _parseHex(hex) {
        const h = hex.replace('#', '');
        return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
    },

    // ==================== 阶段2：晾晒排序 ====================
    _startDryingPhase() {
        this._phase = 2;
        this._dryingPlaced = [null, null, null, null, null];
        this._renderDryingPhase();
    },

    _renderDryingPhase() {
        this.overlay.innerHTML = `
            <div class="dt-panel drying-panel">
                <div class="dt-header">
                    <h2>☀️ 晾晒丝线</h2>
                    <button class="dt-close-btn" id="dt-close-x2">✕</button>
                </div>
                <div class="dt-hint">将丝线从浅到深拖到晾晒架（左=向阳浅光区，右=背阴暗凉区）</div>

                <div class="dt-drying-body">
                    <div class="dt-rack-area">
                        <div class="dt-sun-label">☀️ 向阳浅光 → 背阴暗凉 🌑</div>
                        <div class="dt-racks" id="dt-racks">
                            ${[0,1,2,3,4].map(i => `
                                <div class="dt-rack" data-idx="${i}">
                                    <div class="dt-rack-frame"></div>
                                    <div class="dt-rack-slot" id="dt-slot-${i}"></div>
                                    <div class="dt-rack-num">${i+1}号架</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="dt-threads-pool" id="dt-threads-pool">
                        <div class="dt-pool-label">未晾晒丝线</div>
                        <div class="dt-pool-items" id="dt-pool-items">
                            ${this.THREADS.map((t, i) => `
                                <div class="dt-dryable-thread" draggable="true" data-idx="${i}" id="dt-dry-${i}">
                                    <span class="dt-dry-icon" style="color:${t.targetColor};">${t.icon}</span>
                                    <span class="dt-dry-name">${t.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="dt-drying-actions">
                    <button class="dt-btn primary" id="dt-confirm-dry" disabled>确认晾晒</button>
                </div>
            </div>
        `;

        const closeX = document.getElementById('dt-close-x2');
        if (closeX) closeX.addEventListener('click', () => this.close());

        // 拖拽逻辑
        this._setupDryingDrag();

        const confirmBtn = document.getElementById('dt-confirm-dry');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this._checkDrying());
    },

    _setupDryingDrag() {
        const threads = this.overlay.querySelectorAll('.dt-dryable-thread');
        const slots = this.overlay.querySelectorAll('.dt-rack-slot');
        const pool = document.getElementById('dt-pool-items');

        threads.forEach(thread => {
            thread.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', thread.dataset.idx);
                thread.classList.add('dragging');
            });
            thread.addEventListener('dragend', () => {
                thread.classList.remove('dragging');
            });
        });

        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('hover'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('hover'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('hover');
                const idx = parseInt(e.dataTransfer.getData('text/plain'));
                const rackIdx = parseInt(slot.parentElement.dataset.idx);

                // 如果架子上已有丝线，先放回池子
                const existing = this._dryingPlaced[rackIdx];
                if (existing !== null) {
                    const oldEl = document.getElementById('dt-dry-' + existing);
                    if (oldEl) pool.appendChild(oldEl);
                }

                // 从原位置移除
                const prevPos = this._dryingPlaced.indexOf(idx);
                if (prevPos >= 0) this._dryingPlaced[prevPos] = null;

                // 放到新位置
                this._dryingPlaced[rackIdx] = idx;
                const threadEl = document.getElementById('dt-dry-' + idx);
                slot.innerHTML = '';
                if (threadEl) slot.appendChild(threadEl);
                this._updateDryingState();
            });
        });

        // 池子也能接收（放回）
        if (pool) {
            pool.addEventListener('dragover', (e) => e.preventDefault());
            pool.addEventListener('drop', (e) => {
                e.preventDefault();
                const idx = parseInt(e.dataTransfer.getData('text/plain'));
                const prevPos = this._dryingPlaced.indexOf(idx);
                if (prevPos >= 0) {
                    this._dryingPlaced[prevPos] = null;
                    const slotEl = document.getElementById('dt-slot-' + prevPos);
                    if (slotEl) slotEl.innerHTML = '';
                }
                const el = document.getElementById('dt-dry-' + idx);
                if (el) pool.appendChild(el);
                this._updateDryingState();
            });
        }
    },

    _updateDryingState() {
        const allPlaced = this._dryingPlaced.every(v => v !== null);
        const btn = document.getElementById('dt-confirm-dry');
        if (btn) btn.disabled = !allPlaced;
    },

    _checkDrying() {
        // 正确顺序：从浅到深 = 栀子黄(0) 草木绿(1) 蓝草蓝(2) 苏木红(3) 茶籽黑(4)
        const correct = [0, 1, 2, 3, 4];
        const isCorrect = this._dryingPlaced.every((v, i) => v === correct[i]);

        if (isCorrect) {
            this._showResult(true);
        } else {
            // 错误提示
            const hintEl = document.querySelector('.dt-hint');
            if (hintEl) {
                hintEl.textContent = '晾晒顺序不对！浅色染料要放向阳处先晒，深色放背阴处久置。重新摆放！';
                hintEl.style.color = '#ef4444';
            }
            // 抖动效果
            const racks = document.getElementById('dt-racks');
            if (racks) {
                racks.classList.add('shake');
                setTimeout(() => racks.classList.remove('shake'), 500);
            }
        }
    },

    // ==================== 结算 ====================
    _showResult(success) {
        this._stopDip();
        this.overlay.innerHTML = `
            <div class="dt-panel result-panel">
                <div class="dt-header">
                    <h2>${success ? '✅ 浸染晾晒完成！' : '❌ 未完成'}</h2>
                </div>
                <div class="dt-result-body">
                    <div class="dt-result-grade ${success ? 'pass' : 'fail'}">${success ? '五色丝线 · 染就' : '再试一次'}</div>
                    <div class="dt-result-threads">
                        ${this.THREADS.map((t, i) => `
                            <div class="dt-result-thread">
                                <span class="dt-result-swatch" style="background:${t.targetColor};"></span>
                                <span class="dt-result-name">${t.name}</span>
                                <span class="dt-result-dips">${this._dipCounts[i].toFixed(1)} / ${t.targetDips} 次</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="dt-result-message">
                        ${success
            ? '五色丝线在阳光下泛起柔光：栀子黄、草木绿、蓝草蓝、苏木红、茶籽黑。<br>阿婆的记忆回响：草木取染，一叶一色，浸染之间，皆是畲山的馈赠。'
            : '浸染未完成，重新尝试吧！'}
                    </div>
                    <div class="dt-result-actions">
                        ${success
            ? '<button class="dt-btn primary" id="dt-finish">完成 ✓</button>'
            : '<button class="dt-btn primary" id="dt-retry">重新浸染</button>'}
                    </div>
                </div>
            </div>
        `;

        if (success) {
            const finish = document.getElementById('dt-finish');
            if (finish) finish.addEventListener('click', () => {
                this.close();
                if (this._onComplete) this._onComplete();
            });
        } else {
            const retry = document.getElementById('dt-retry');
            if (retry) retry.addEventListener('click', () => {
                this._phase = 1;
                this._currentThread = 0;
                this._dipProgress = [0,0,0,0,0];
                this._dipCounts = [0,0,0,0,0];
                this._renderDyeingPhase();
            });
        }
    }
};
