// ========== 六边锦绣拼图管理器 ==========
// 三阶六边形旋转拼图，用 last1_square.webp 作为背景图
// 玩法：点击旋转六边格（左键顺时针60°，右键逆时针60°），全图复原即通关

import { Preloader } from '../preloader.js';

export const HexPuzzleManager = {
    overlay: null,
    board: null,
    stageSelect: null,
    boardWrapper: null,
    winFx: null,
    reference: null,

    _currentStage: 1,
    _tiles: [],
    _tileMap: {},           // "q,r" -> tile index，用于邻居查找
    _completedStages: new Set(),

    // 棋盘尺寸（与背景图缩放一致）
    BOARD_W: 600,
    BOARD_H: 600,
    IMAGE_PATH: 'assets/images/game/last1_square.webp',

    // 六边形邻居方向（flat-top axial 坐标）
    _NEIGHBOR_DIRS: [[1,0], [1,-1], [0,-1], [-1,0], [-1,1], [0,1]],

    // 三阶配置
    STAGES: {
        1: { rings: 1, label: '第一阶', desc: '7块 · 入门 · 单格点亮' },
        2: { rings: 2, label: '第二阶', desc: '19块 · 中等 · 集群点亮' },
        3: { rings: 3, label: '第三阶', desc: '37块 · 挑战 · 集群点亮' }
    },

    init() {
        this.overlay = document.getElementById('hex-puzzle-overlay');
        this.board = document.getElementById('hex-board');
        this.stageSelect = document.getElementById('hex-stage-select');
        this.boardWrapper = document.getElementById('hex-board-wrapper');
        this.winFx = document.getElementById('hex-win-fx');
        this.reference = document.getElementById('hex-reference');

        // 关闭按钮
        const closeBtn = document.getElementById('hex-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // 返回选关
        const backBtn = document.getElementById('hex-back-btn');
        if (backBtn) backBtn.addEventListener('click', () => this._showStageSelect());

        // 重新打乱
        const shuffleBtn = document.getElementById('hex-shuffle-btn');
        if (shuffleBtn) shuffleBtn.addEventListener('click', () => this._shuffle());

        // 查看原图
        const refBtn = document.getElementById('hex-reference-btn');
        if (refBtn) {
            let refVisible = false;
            refBtn.addEventListener('click', () => {
                refVisible = !refVisible;
                if (this.reference) {
                    this.reference.style.backgroundImage = `url(${this.IMAGE_PATH})`;
                    this.reference.classList.toggle('show', refVisible);
                }
                refBtn.textContent = refVisible ? '隐藏原图' : '查看原图';
            });
        }

        // 关卡选择按钮
        document.querySelectorAll('.hex-stage-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stage = parseInt(btn.dataset.stage);
                this._openStage(stage);
            });
        });

        // 监听打开事件
        document.addEventListener('openHexPuzzle', () => {
            this.open();
        });

        console.log('HexPuzzleManager: 初始化完成');
    },

    // ==================== 打开/关闭 ====================
    open() {
        // 先确保拼图图片已加载完成，再显示界面
        Preloader.loadLazy('hexPuzzle').then(() => {
            this._showStageSelect();
            if (this.overlay) this.overlay.style.display = 'flex';
        });
    },

    close() {
        if (this.overlay) this.overlay.style.display = 'none';
        // 重置原图按钮
        const refBtn = document.getElementById('hex-reference-btn');
        if (refBtn) refBtn.textContent = '查看原图';
        if (this.reference) this.reference.classList.remove('show');
    },

    // ==================== 关卡选择 ====================
    _showStageSelect() {
        if (this.stageSelect) this.stageSelect.style.display = 'block';
        if (this.boardWrapper) this.boardWrapper.style.display = 'none';
        if (this.winFx) this.winFx.style.display = 'none';

        // 更新已完成标记
        document.querySelectorAll('.hex-stage-btn').forEach(btn => {
            const stage = parseInt(btn.dataset.stage);
            btn.classList.toggle('completed', this._completedStages.has(stage));
        });

        // 全部完成提示
        const allDone = this._completedStages.size === 3;
        const allDoneEl = document.getElementById('hex-all-complete');
        if (allDoneEl) allDoneEl.style.display = allDone ? 'block' : 'none';
    },

    _openStage(stage) {
        this._currentStage = stage;
        if (this.stageSelect) this.stageSelect.style.display = 'none';
        if (this.boardWrapper) this.boardWrapper.style.display = 'block';

        // 参考图按钮始终显示
        const refBtn = document.getElementById('hex-reference-btn');
        if (refBtn) {
            refBtn.style.display = 'block';
            refBtn.textContent = '查看原图';
        }
        if (this.reference) this.reference.classList.remove('show');

        this._buildBoard(stage);
    },

    // ==================== 构建棋盘 ====================
    _buildBoard(stage) {
        if (!this.board) return;
        // 只清除六边格，保留参考图层
        this.board.querySelectorAll('.hex-tile').forEach(el => el.remove());
        this._tiles = [];

        const N = this.STAGES[stage].rings;
        const boardW = this.BOARD_W;
        const boardH = this.BOARD_H;
        const sqrt3 = Math.sqrt(3);

        // 计算六边形尺寸，使整个蜂窝网格适配棋盘
        const sizeW = boardW / (3 * N + 2);
        const sizeH = boardH / (sqrt3 * (2 * N + 1));
        const size = Math.min(sizeW, sizeH) * 0.92;

        const hexW = 2 * size;
        const hexH = sqrt3 * size;

        // 更新标题
        const label = document.getElementById('hex-stage-label');
        if (label) label.textContent = `六边锦绣 · ${this.STAGES[stage].label}`;

        // 生成蜂窝坐标（axial coordinates，限制为大六边形形状）
        for (let q = -N; q <= N; q++) {
            for (let r = -N; r <= N; r++) {
                if (Math.abs(q + r) > N) continue;

                // 像素中心（flat-top 六边形）
                const cx = boardW / 2 + 1.5 * size * q;
                const cy = boardH / 2 + sqrt3 * size * (r + q / 2);

                // 格子左上角
                const left = cx - size;
                const top = cy - hexH / 2;

                // 随机初始旋转（1~5，确保不是0即正确）
                const initialRotation = Math.floor(Math.random() * 5) + 1;

                const tile = document.createElement('div');
                tile.className = 'hex-tile';
                tile.dataset.idx = this._tiles.length;

                tile.style.width = hexW + 'px';
                tile.style.height = hexH + 'px';
                tile.style.left = left + 'px';
                tile.style.top = top + 'px';
                tile.style.backgroundImage = `url(${this.IMAGE_PATH})`;
                tile.style.backgroundSize = `${boardW}px ${boardH}px`;
                tile.style.backgroundPosition = `-${left}px -${top}px`;
                tile.style.transform = `rotate(${initialRotation * 60}deg)`;

                // 左键顺时针
                tile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._rotateTile(parseInt(tile.dataset.idx), 1);
                });
                // 右键逆时针
                tile.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._rotateTile(parseInt(tile.dataset.idx), -1);
                });

                this.board.appendChild(tile);
                this._tiles.push({
                    el: tile,
                    q, r,
                    rotation: initialRotation,
                    left, top
                });
            }
        }

        this._buildNeighborMap();
        this._updateProgress();
    },

    // ==================== 邻居系统 ====================
    _buildNeighborMap() {
        this._tileMap = {};
        this._tiles.forEach((t, i) => {
            this._tileMap[`${t.q},${t.r}`] = i;
        });
    },

    _getNeighbors(tile) {
        const neighbors = [];
        for (const [dq, dr] of this._NEIGHBOR_DIRS) {
            const key = `${tile.q + dq},${tile.r + dr}`;
            const idx = this._tileMap[key];
            if (idx !== undefined) neighbors.push(this._tiles[idx]);
        }
        return neighbors;
    },

    // 判断格子及其所有邻居是否全部正确（用于第二阶集群点亮）
    _isClusterCorrect(tile) {
        if (tile.rotation % 6 !== 0) return false;
        return this._getNeighbors(tile).every(n => n.rotation % 6 === 0);
    },
    _rotateTile(idx, direction) {
        const tile = this._tiles[idx];
        if (!tile) return;

        // 无限累加，不取模，避免CSS动画逆向旋转
        tile.rotation += direction;
        tile.el.style.transform = `rotate(${tile.rotation * 60}deg)`;

        this._updateProgress();

        if (this._checkWin()) {
            this._onWin();
        }
    },

    _shuffle() {
        this._tiles.forEach(tile => {
            tile.rotation = Math.floor(Math.random() * 5) + 1;
            tile.el.style.transform = `rotate(${tile.rotation * 60}deg)`;
        });
        this._updateProgress();
    },

    // ==================== 判定 ====================
    _checkWin() {
        return this._tiles.length > 0 && this._tiles.every(t => t.rotation % 6 === 0);
    },

    _updateProgress() {
        const stage = this._currentStage;
        const total = this._tiles.length;
        let matched = 0;

        if (stage === 1) {
            // 第一阶：单格点亮，转对就亮
            this._tiles.forEach(t => {
                const correct = t.rotation % 6 === 0;
                t.el.classList.toggle('matched', correct);
                if (correct) matched++;
            });
        } else {
            // 第二阶、第三阶：集群点亮，自己和所有邻居都正确才亮
            this._tiles.forEach(t => {
                const clusterOk = this._isClusterCorrect(t);
                t.el.classList.toggle('matched', clusterOk);
                if (t.rotation % 6 === 0) matched++;
            });
        }

        const progressEl = document.getElementById('hex-progress');
        if (progressEl) progressEl.textContent = `${matched} / ${total}`;
    },

    // ==================== 通关 ====================
    _onWin() {
        this._completedStages.add(this._currentStage);
        const allDone = this._completedStages.size === 3;

        // 先点亮全部格子
        this._tiles.forEach(t => t.el.classList.add('matched'));

        // 延迟弹窗，让玩家看到完整亮图
        setTimeout(() => {
            if (this.winFx) {
                const content = this.winFx.querySelector('.hex-win-content');
                if (content) {
                    let html = '<h2>✨ 拼图完成！</h2>';
                    html += '<p>刺绣图谱复原成功</p>';
                    if (allDone) {
                        html += '<p class="hex-win-all">🏆 三阶全部完成 · 万线归宗！</p>';
                    }
                    content.innerHTML = html;
                }
                this.winFx.style.display = 'flex';
            }

            // 通知关卡一
            document.dispatchEvent(new CustomEvent('hexPuzzleSolved', {
                detail: { stage: this._currentStage, allDone }
            }));

            // 延迟返回选关
            setTimeout(() => {
                if (this.winFx) this.winFx.style.display = 'none';
                this._showStageSelect();
            }, allDone ? 4000 : 2800);
        }, 800);
    }
};
