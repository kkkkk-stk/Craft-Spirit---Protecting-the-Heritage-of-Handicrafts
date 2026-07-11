// ========== 第一关管理器 v3 ==========
import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';
import { OPENING_DIALOGUES, AREAS, ARTIFACTS, MEMORIES, PUZZLES, LOOM_LEVELS } from './level1Data.js';

export const Level1Manager = {
    root: null, _currentScene: 'gate', _firstVillageVisit: true, _grannyDone: false, _player: null,
    dialogueBox: null, dialogueSpeaker: null, dialogueText: null,
    popupOverlay: null, popupContent: null, memoryOverlay: null,
    puzzleOverlay: null, puzzleContent: null, hudProgress: null,
    _dialogueIndex: 0, _dialogueQueue: [], _onDialogueEnd: null,

    init() {
        // 事件监听最先注册
        document.addEventListener('enterLevel1', () => {
            console.log('Level1Manager: 收到 enterLevel1');
            try { this.enter('gate'); } catch (e) { console.error('enter error:', e); }
        });
        document.addEventListener('returnToMenu', () => { try { this._reset(); } catch (e) {} });

        this.root = document.getElementById('level1-screen');
        if (!this.root) { console.warn('Level1Manager: #level1-screen 未找到'); return; }

        this.dialogueBox = document.getElementById('level1-dialogue-box');
        this.dialogueSpeaker = document.getElementById('level1-dialogue-speaker');
        this.dialogueText = document.getElementById('level1-dialogue-text');
        this.popupOverlay = document.getElementById('level1-popup-overlay');
        this.popupContent = document.getElementById('level1-popup-content');
        this.memoryOverlay = document.getElementById('level1-memory-overlay');
        this.puzzleOverlay = document.getElementById('level1-puzzle-overlay');
        this.puzzleContent = document.getElementById('level1-puzzle-content');
        this.hudProgress = document.getElementById('level1-hud-progress');
        this._player = document.getElementById('player');

        // 绑定各种事件
        this._bindDialogue();
        this._bindPopup();
        this._bindPuzzleClose();

        // 离开古宅按钮
        const exitBtn = document.getElementById('house-exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                if (this.puzzleOverlay) this.puzzleOverlay.style.display = 'none';
                this._currentScene = 'village';
                this.enter('village');
                gameState.playerPosPercent = 55;
                document.dispatchEvent(new CustomEvent('gameLoaded'));
            });
        }

        // 六边锦绣拼图入口
        const hexBtn = document.getElementById('hexpuzzle-btn');
        if (hexBtn) {
            hexBtn.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('openHexPuzzle'));
            });
        }

        // 行走监听
        document.addEventListener('playerMoved', () => {
            if (gameState.currentChapter !== 'level1') return;
            this._checkTransitions();
        });

        // 按键：E交互 / ESC关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.puzzleOverlay && this.puzzleOverlay.style.display === 'flex') { this.puzzleOverlay.style.display = 'none'; return; }
                if (this.popupOverlay && this.popupOverlay.style.display === 'flex') { this.popupOverlay.style.display = 'none'; return; }
                if (this.memoryOverlay && this.memoryOverlay.style.display === 'flex') { this.memoryOverlay.style.display = 'none'; return; }
            }
            if (e.key.toLowerCase() === 'e' && gameState.currentChapter === 'level1'
                && !gameState.isPaused && !gameState.dialogueActive) {
                this._handleInteract();
            }
        });

        console.log('Level1Manager: 初始化完成');
    },

    // ==================== 进入关卡 ====================
    enter(scene) {
        if (!gameState.level1) { console.error('Level1: gameState.level1 未定义'); return; }
        gameState.currentChapter = 'level1';
        gameState.level1.entered = true;
        this._currentScene = scene;
        SceneManager.hide('game-screen');
        SceneManager.hide('ui-hud');
        if (this.root) this.root.style.display = 'flex';
        if (this._player && this.root) this.root.appendChild(this._player);
        this._switchView(scene);
        this._updateProgressHud();

        if (scene === 'gate' && !gameState.level1.gateDescribed) {
            gameState.level1.gateDescribed = true;
            setTimeout(() => this._showDesc(
                '山间薄雾沉沉，整座村寨静悄悄的，往日热闹的畲寨烟火散尽。\n青瓦夯土的老房墙面、祠堂图腾、晾晒的旧绣布，全都覆着一层灰蒙蒙的黑气，色彩黯淡死寂。'
            ), 600);
        }
        if (scene === 'village' && this._firstVillageVisit) {
            this._firstVillageVisit = false;
            setTimeout(() => this._showDesc(
                '村口老戏台落满枯叶，无人问津。\n绣花古宅的木门半掩，一道温柔苍老的虚影静静立在门边，身着褪色畲族传统蓝衣，头戴畲族头帕，眼神温柔却满是怅然。'
            ), 400);
        }
        if (scene === 'hub') this._renderArea('yard');
        console.log('Level1: 进入场景', scene);
    },

    // ==================== 场景切换 ====================
    _switchView(scene) {
        ['scene-village-gate', 'scene-village-inside', 'scene-hub', 'scene-house-inside'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const map = { gate: 'scene-village-gate', village: 'scene-village-inside', hub: 'scene-hub', house: 'scene-house-inside' };
        const el = document.getElementById(map[scene]);
        if (el) el.style.display = 'block';

        if (this._player) {
            this._player.style.display = (scene === 'house') ? 'none' : 'block';
            if (scene === 'gate') gameState.playerPosPercent = 8;
            else if (scene === 'village') gameState.playerPosPercent = 12;
            else if (scene === 'hub') gameState.playerPosPercent = 20;
        }
        document.dispatchEvent(new CustomEvent('gameLoaded'));
    },

    _checkTransitions() {
        const pos = gameState.playerPosPercent;
        const movingRight = gameState.playerMoving && gameState.playerDirection === 'right';
        const movingLeft = gameState.playerMoving && gameState.playerDirection === 'left';

        if (this._currentScene === 'gate' && pos >= 84 && movingRight) {
            console.log('transition: gate→village');
            this.enter('village'); return;
        }
        if (this._currentScene === 'village' && pos <= 5 && movingLeft) {
            console.log('transition: village→gate');
            this.enter('gate');
            gameState.playerPosPercent = 82;  // 回到场景一最右侧
            document.dispatchEvent(new CustomEvent('gameLoaded'));
            return;
        }
        if (this._currentScene === 'village' && pos >= 84 && movingRight) {
            console.log('transition: village→hub'); this.enter('hub'); return;
        }
        if (this._currentScene === 'hub' && pos <= 5 && movingLeft) {
            console.log('transition: hub→village');
            this.enter('village');
            gameState.playerPosPercent = 80;
            document.dispatchEvent(new CustomEvent('gameLoaded'));
            return;
        }
        this._updatePrompts(pos);
    },

    _updatePrompts(pos) {
        const gp = document.getElementById('granny-prompt');
        const dp = document.getElementById('door-prompt');
        const yp = document.getElementById('yard-prompt');
        const hp = document.getElementById('hall-prompt');
        if (gp) gp.style.display = (this._currentScene === 'village' && !this._grannyDone && pos > 65) ? 'block' : 'none';
        if (dp) dp.style.display = (this._currentScene === 'village' && this._grannyDone && pos > 48 && pos < 58) ? 'block' : 'none';
        if (yp) yp.style.display = (this._currentScene === 'hub' && pos > 20 && pos < 50) ? 'block' : 'none';
        if (hp) hp.style.display = (this._currentScene === 'hub' && pos > 60) ? 'block' : 'none';
    },

    // ==================== E键交互 ====================
    _handleInteract() {
        const pos = gameState.playerPosPercent;
        if (this._currentScene === 'village' && !this._grannyDone && pos > 65) {
            this._grannyDone = true;
            const gp = document.getElementById('granny-prompt');
            if (gp) gp.style.display = 'none';
            setTimeout(() => this._startDialogue(OPENING_DIALOGUES, () => {
                const g = document.getElementById('village-granny');
                if (g) { g.style.transition = 'opacity 1.5s'; g.style.opacity = '0'; }
                gameState.level1.openingDone = true;
                this._showToast('绣花古宅的门可以进入了');
            }), 300);
        }
        if (this._currentScene === 'village' && this._grannyDone && pos > 48 && pos < 58) {
            this._currentScene = 'house';
            this._switchView('house');
            this._renderArea('house');
        }
        if (this._currentScene === 'hub' && pos > 20 && pos < 50) this._startPuzzle('drying');
        if (this._currentScene === 'hub' && pos > 60) {
            // 祠堂交互：打开六边锦绣拼图（原图腾拼图改为图像还原拼图）
            document.dispatchEvent(new CustomEvent('openHexPuzzle'));
        }
    },

    // ==================== 区域渲染 ====================
    _renderArea(area) {
        const info = AREAS[area]; if (!info) return;
        const descEl = document.getElementById('level1-area-desc');
        if (descEl) descEl.textContent = info.desc || '';
        this._renderArtifacts(area);
        this._renderPuzzleEntry(area);
    },

    _renderArtifacts(area) {
        const c = document.getElementById('level1-artifacts'); if (!c) return; c.innerHTML = '';
        (AREAS[area].artifacts || []).forEach(id => {
            const art = ARTIFACTS[id]; if (!art) return;
            const collected = gameState.level1.artifacts[id];
            const locked = art.requires && !gameState.level1.artifacts[art.requires];
            const el = document.createElement('div');
            el.className = 'artifact-hotspot' + (collected ? ' collected' : '') + (locked ? ' locked' : '');
            el.innerHTML = '<div class="artifact-icon">📦</div><div class="artifact-name">' + art.name + '</div><div class="artifact-status">' + (collected ? '已收集' : (locked ? '🔒' : '点击拾取')) + '</div>';
            if (!collected && !locked) el.addEventListener('click', () => this._collectArtifact(id));
            c.appendChild(el);
        });
    },

    _renderPuzzleEntry(area) {
        const c = document.getElementById('level1-puzzle-entry'); if (!c) return; c.innerHTML = '';
        const pid = AREAS[area].puzzle; if (!pid) return;
        const puzzle = PUZZLES[pid]; if (!puzzle) return;
        const solved = gameState.level1.puzzles[pid];
        const el = document.createElement('div');
        el.className = 'puzzle-entry' + (solved ? ' solved' : '');
        el.innerHTML = '<span>🧩 ' + puzzle.name + '</span><span>' + (solved ? '✅' : '进入') + '</span>';
        if (!solved) el.addEventListener('click', () => this._startPuzzle(pid));
        c.appendChild(el);
    },

    _collectArtifact(id) {
        gameState.level1.artifacts[id] = true;
        this._showPopup(ARTIFACTS[id]);
        this._updateProgressHud();
        if (ARTIFACTS[id].memory) setTimeout(() => this._playMemory(ARTIFACTS[id].memory), 2000);
        this._renderArea('house');
    },

    // ==================== 解密 ====================
    _startPuzzle(pid) {
        const puzzle = PUZZLES[pid];
        if (!puzzle || !this.puzzleOverlay || !this.puzzleContent) return;
        let html = '<h3 style="color:#8b4513;margin-bottom:12px;">' + puzzle.name + '</h3>';
        html += '<p style="color:#5c3a1e;margin-bottom:16px;">' + (puzzle.rule || puzzle.desc || '') + '</p>';

        if (pid === 'loom') {
            // --- Multi-level SVG drag-to-connect loom puzzle ---
            var SW = 480, SH = 340;
            var levels = LOOM_LEVELS;
            var levelIdx = 0;
            var phase = 1;
            var drawn = new Set();
            var drag = null;

            // Build HTML
            html += '<div style="margin:16px 0;">';
            html += '<div id="loom-level-info" style="text-align:center;margin-bottom:8px;"></div>';
            html += '<div id="loom-phases" style="display:flex;justify-content:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;"></div>';
            html += '<svg id="loom-svg" width="' + SW + '" height="' + SH + '" viewBox="0 0 ' + SW + ' ' + SH + '" style="background:#3d2a5c;border-radius:8px;display:block;margin:0 auto;touch-action:none;max-width:100%;"></svg>';
            html += '<div id="loom-hint" style="text-align:center;color:#8b5a2b;font-size:11px;margin-top:10px;min-height:20px;font-family:monospace;"></div>';
            html += '<div style="display:flex;justify-content:center;gap:10px;margin-top:12px;">';
            html += '<button id="loom-clear" class="loom-btn">清空重画</button>';
            html += '<button id="loom-next" class="loom-btn primary" style="display:none;">下一关 →</button>';
            html += '<button id="loom-confirm" class="loom-btn primary" disabled style="display:none;">确认上机织布</button>';
            html += '<button id="loom-tip" class="loom-btn">口诀提示</button>';
            html += '</div></div>';
            this.puzzleContent.innerHTML = html;

            var svg = document.getElementById('loom-svg');
            var hintEl = document.getElementById('loom-hint');
            var phaseEl = document.getElementById('loom-phases');
            var levelInfoEl = document.getElementById('loom-level-info');
            var clearBtn = document.getElementById('loom-clear');
            var confirmBtn = document.getElementById('loom-confirm');
            var nextBtn = document.getElementById('loom-next');
            var tipBtn = document.getElementById('loom-tip');
            var self = this;

            function getLevel() { return levels[levelIdx]; }
            function getNodeMap() {
                var m = {};
                getLevel().nodes.forEach(function (n) { m[n.id] = n; });
                return m;
            }
            function getPhase() { return getLevel().phases[phase - 1]; }
            function phaseEdgeTotal(pi) { return getLevel().phases[pi].edges.length; }
            function phaseDrawnCount(pi) {
                return getLevel().phases[pi].edges.filter(function (e) { return drawn.has(e.id); }).length;
            }
            function isPhaseDone(pi) { return phaseDrawnCount(pi) === phaseEdgeTotal(pi); }
            function isTutorial() { return levelIdx === 0; }
            function totalEdges() { return getLevel().phases.reduce(function (s, p) { return s + p.edges.length; }, 0); }
            function totalDrawn() { return getLevel().phases.reduce(function (s, p, i) { return s + phaseDrawnCount(i); }, 0); }
            function showHint(msg) { if (hintEl) hintEl.textContent = msg; }
            function updateLevelInfo() {
                levelInfoEl.innerHTML = '<span style="color:#8b5a2b;font-size:12px;font-family:monospace;">织纹第 ' + (levelIdx + 1) + '/' + levels.length + ' 关 · ' + getLevel().name + ' — ' + getLevel().desc + '</span>';
            }
            function updatePhases() {
                phaseEl.innerHTML = getLevel().phases.map(function (p, i) {
                    var active = (i + 1 === phase);
                    var done = isPhaseDone(i);
                    var cls = active ? 'loom-phase active' : (done ? 'loom-phase done' : 'loom-phase');
                    return '<span class="' + cls + '">' + (i + 1) + '.' + p.name + ' (' + phaseDrawnCount(i) + '/' + phaseEdgeTotal(i) + ')</span>';
                }).join('');
            }
            function render() {
                var nodeMap = getNodeMap();
                var s = '';
                // 1. Faint target pattern (all edges not yet drawn)
                getLevel().phases.forEach(function (p, pi) {
                    p.edges.forEach(function (e) {
                        if (drawn.has(e.id)) return;
                        var f = nodeMap[e.from], t = nodeMap[e.to];
                        var isCur = (pi + 1 === phase);
                        var cls = isTutorial()
                            ? (isCur ? 'loom-line-target-active' : 'loom-line-target')
                            : 'loom-line-target-active';
                        s += '<line x1="' + f.x + '" y1="' + f.y + '" x2="' + t.x + '" y2="' + t.y + '" class="' + cls + '"/>';
                    });
                });
                // 2. Completed edges (solid)
                getLevel().phases.forEach(function (p) {
                    p.edges.forEach(function (e) {
                        if (!drawn.has(e.id)) return;
                        var f = nodeMap[e.from], t = nodeMap[e.to];
                        s += '<line x1="' + f.x + '" y1="' + f.y + '" x2="' + t.x + '" y2="' + t.y + '" class="loom-line-done"/>';
                    });
                });
                // 3. Drag preview
                if (drag) {
                    s += '<line x1="' + drag.fx + '" y1="' + drag.fy + '" x2="' + drag.cx + '" y2="' + drag.cy + '" class="loom-line-preview"/>';
                }
                // 4. Nodes
                var curEdges = getPhase().edges;
                getLevel().nodes.forEach(function (n) {
                    var inPhase = isTutorial()
                        ? curEdges.some(function (e) { return e.from === n.id || e.to === n.id; })
                        : true;
                    var isCorner = n.id.charAt(0) === 'c';
                    var isDrag = drag && drag.from === n.id;
                    var r = isCorner ? 10 : 7;
                    var cls = 'loom-node' + (isCorner ? ' frame' : '') + (inPhase ? ' active' : '') + (isDrag ? ' dragging' : '');
                    s += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + r + '" class="' + cls + '" data-id="' + n.id + '"/>';
                });
                svg.innerHTML = s;
            }
            function getCoord(e) {
                var rect = svg.getBoundingClientRect();
                return { x: (e.clientX - rect.left) * (SW / rect.width), y: (e.clientY - rect.top) * (SH / rect.height) };
            }
            function onSvgDown(e) {
                var id = e.target.getAttribute ? e.target.getAttribute('data-id') : null;
                if (!id) return;
                e.preventDefault();
                var nodeMap = getNodeMap();
                var node = nodeMap[id];
                if (!node) return;
                var curPhase = getPhase();
                var inPhase = curPhase.edges.some(function (ed) { return ed.from === id || ed.to === id; });
                if (!inPhase) {
                    if (isTutorial()) showHint('请连接当前阶段的节点：' + curPhase.name);
                    else showHint('走线顺序不对，回想口诀：横先竖后、外框先稳、纹理后填');
                    return;
                }
                var c = getCoord(e);
                drag = { from: id, fx: node.x, fy: node.y, cx: c.x, cy: c.y };
                try { svg.setPointerCapture(e.pointerId); } catch (err) {}
                render();
            }
            function onSvgMove(e) {
                if (!drag) return;
                e.preventDefault();
                var c = getCoord(e);
                drag.cx = c.x; drag.cy = c.y;
                render();
            }
            function onSvgUp(e) {
                if (!drag) return;
                e.preventDefault();
                var c = getCoord(e);
                var nodeMap = getNodeMap();
                var target = null, minD = 25;
                Object.values(nodeMap).forEach(function (n) {
                    if (n.id === drag.from) return;
                    var d = Math.hypot(n.x - c.x, n.y - c.y);
                    if (d < minD) { minD = d; target = n; }
                });
                if (target) completeEdge(drag.from, target.id);
                drag = null;
                render();
            }
            function completeEdge(fromId, toId) {
                var curPhase = getPhase();
                var edge = curPhase.edges.find(function (e) {
                    return (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId);
                });
                if (edge && !drawn.has(edge.id)) {
                    drawn.add(edge.id);
                    var drawnN = phaseDrawnCount(phase - 1);
                    var totalN = phaseEdgeTotal(phase - 1);
                    if (drawnN === totalN) {
                        if (phase < getLevel().phases.length) {
                            phase++;
                            if (isTutorial()) showHint('✅ ' + curPhase.name + '完成！继续：' + getPhase().name);
                            else showHint('✅ 走线正确！已完成 ' + totalDrawn() + '/' + totalEdges() + ' 条');
                        } else {
                            onLevelComplete();
                        }
                    } else {
                        if (isTutorial()) showHint(curPhase.name + ' ' + drawnN + '/' + totalN + ' 完成');
                        else showHint('✅ 已完成 ' + totalDrawn() + '/' + totalEdges() + ' 条线');
                    }
                } else {
                    var foundOther = false;
                    getLevel().phases.forEach(function (p, pi) {
                        if (pi + 1 === phase) return;
                        if (p.edges.some(function (e) {
                            return (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId);
                        })) foundOther = true;
                    });
                    if (foundOther) {
                        if (isTutorial()) showHint('请先完成当前阶段：' + curPhase.name);
                        else showHint('走线顺序不对，回想口诀：横先竖后、外框先稳、纹理后填');
                    } else showHint('请连接正确的节点');
                }
                updatePhases();
            }
            function onLevelComplete() {
                if (levelIdx < levels.length - 1) {
                    showHint('✅ ' + getLevel().name + '完成！点击「下一关」继续');
                    nextBtn.style.display = 'block';
                    confirmBtn.style.display = 'none';
                } else {
                    showHint('✅ 全部织纹完成！点击「确认上机织布」');
                    confirmBtn.disabled = false;
                    confirmBtn.style.display = 'block';
                    nextBtn.style.display = 'none';
                }
            }
            function loadLevel(idx) {
                levelIdx = idx;
                phase = 1;
                drawn.clear();
                nextBtn.style.display = 'none';
                confirmBtn.style.display = 'none';
                confirmBtn.disabled = true;
                updateLevelInfo();
                if (isTutorial()) {
                    phaseEl.style.display = 'flex';
                    updatePhases();
                    showHint(getPhase().hint);
                } else {
                    phaseEl.style.display = 'none';
                    showHint('按照口诀「横先竖后、外框先稳、纹理后填」完成所有走线（共' + totalEdges() + '条线）');
                }
                render();
            }

            // Event listeners
            svg.addEventListener('pointerdown', onSvgDown);
            svg.addEventListener('pointermove', onSvgMove);
            svg.addEventListener('pointerup', onSvgUp);
            svg.addEventListener('pointercancel', onSvgUp);
            clearBtn.addEventListener('click', function () {
                if (isTutorial()) {
                    getPhase().edges.forEach(function (e) { drawn.delete(e.id); });
                    showHint('当前阶段已重置，重新开始');
                } else {
                    drawn.clear();
                    phase = 1;
                    showHint('已全部清空，重新开始');
                }
                if (isTutorial()) updatePhases();
                render();
            });
            nextBtn.addEventListener('click', function () {
                loadLevel(levelIdx + 1);
            });
            confirmBtn.addEventListener('click', function () {
                gameState.level1.puzzles.loom = true;
                self._updateProgressHud();
                self.puzzleContent.innerHTML = '<h3 style="color:#4a7a30;">✅ 解谜成功！</h3><p>织机齿轮转动，五彩柔光流入凤凰纹样，古宅黑雾缓缓消散。</p>';
                setTimeout(function () { self.puzzleOverlay.style.display = 'none'; }, 2000);
            });
            tipBtn.addEventListener('click', function () {
                showHint('口诀：横先竖后、外框先稳、纹理后填');
            });

            // Init level 1
            loadLevel(0);
        } else if (pid === 'drying') {
            html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0;">';
            html += puzzle.slots.map((s, i) => '<div class="dry-slot" data-idx="' + i + '" style="padding:10px 16px;background:#e8dcc8;border:2px solid #8b5a2b;border-radius:6px;cursor:pointer;">' + s + '</div>').join('');
            html += '</div><p style="color:#888;">' + (puzzle.errorHint || '') + '</p>';
            this.puzzleContent.innerHTML = html;
            let dryClicked = [];
            this.puzzleContent.querySelectorAll('.dry-slot').forEach(el => {
                el.addEventListener('click', () => {
                    if (el.classList.contains('done')) return;
                    el.classList.add('done'); el.style.background = '#8b5a2b'; el.style.color = '#fff';
                    dryClicked.push(+el.dataset.idx);
                    if (dryClicked.length === puzzle.slots.length) {
                        if (dryClicked.join(',') === puzzle.correctOrder.join(',')) {
                            gameState.level1.puzzles[pid] = true; this._updateProgressHud();
                            this.puzzleContent.innerHTML = '<h3 style="color:#4a7a30;">✅ 晾晒完成！</h3><p>染材按正确顺序摆放，光芒流转。</p>';
                            setTimeout(() => { this.puzzleOverlay.style.display = 'none'; }, 1500);
                        } else {
                            dryClicked = [];
                            this.puzzleContent.querySelectorAll('.dry-slot').forEach(e => { e.classList.remove('done'); e.style.background = '#e8dcc8'; e.style.color = '#2c1810'; });
                        }
                    }
                });
            });
        } else if (pid === 'totem') {
            html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0;">';
            html += puzzle.stones.map(s => '<div class="totem-stone" style="padding:10px 16px;background:#e8dcc8;border:2px solid #8b5a2b;border-radius:6px;cursor:pointer;">' + s + '</div>').join('');
            html += '</div><p style="color:#888;">' + (puzzle.errorHint || '') + '</p>';
            this.puzzleContent.innerHTML = html;
            let totemOrder = [];
            this.puzzleContent.querySelectorAll('.totem-stone').forEach(el => {
                el.addEventListener('click', () => {
                    if (el.classList.contains('placed')) return;
                    el.classList.add('placed'); el.style.background = '#8b5a2b'; el.style.color = '#fff';
                    totemOrder.push(el.textContent.trim());
                    if (totemOrder.length === puzzle.stones.length) {
                        const correct = puzzle.slots.map(s => s.answer);
                        if (totemOrder.join(',') === correct.join(',')) {
                            gameState.level1.puzzles[pid] = true; this._updateProgressHud();
                            this.puzzleContent.innerHTML = '<h3 style="color:#4a7a30;">✅ 图腾归位！</h3><p>石壁光芒大盛，畲族千年文脉重新流淌。</p>';
                            setTimeout(() => { this.puzzleOverlay.style.display = 'none'; }, 1500);
                        } else {
                            totemOrder = [];
                            this.puzzleContent.querySelectorAll('.totem-stone').forEach(e => { e.classList.remove('placed'); e.style.background = '#e8dcc8'; e.style.color = '#2c1810'; });
                        }
                    }
                });
            });
        } else {
            html += '<p>（解谜功能待完善）</p>';
        }
        this.puzzleOverlay.style.display = 'flex';
    },

    // ==================== 弹窗 & 记忆 ====================
    _showPopup(art) {
        if (!this.popupOverlay || !this.popupContent) return;
        this.popupContent.innerHTML = '<h3>' + art.name + '</h3><p>' + art.desc + '</p><p style="margin-top:12px;color:#aaa;">' + art.story + '</p><button onclick="document.getElementById(\'level1-popup-overlay\').style.display=\'none\'">关闭</button>';
        this.popupOverlay.style.display = 'flex';
    },

    _playMemory(id) {
        const m = MEMORIES[id]; if (!m || !this.memoryOverlay) return;
        const video = this.memoryOverlay.querySelector('#level1-memory-video');
        const t = this.memoryOverlay.querySelector('.memory-title');
        const s = this.memoryOverlay.querySelector('.memory-subtitle');
        const cl = this.memoryOverlay.querySelector('.memory-clue');
        if (t) t.textContent = m.title;
        if (s) s.textContent = m.subtitle || '';
        if (cl) cl.textContent = '🔍 ' + (m.clue || '');

        // 设置视频源并播放
        if (video && m.video) {
            video.src = m.video;
            video.load();
            video.play().catch(() => {});
        }

        this.memoryOverlay.style.display = 'flex';
        gameState.level1.memories[id] = true;
        this._updateProgressHud();

        // 关闭：视频结束
        const close = () => {
            this.memoryOverlay.style.display = 'none';
            if (video) { video.pause(); video.src = ''; video.removeEventListener('ended', close); }
        };
        if (video) video.addEventListener('ended', close);
    },

    // ==================== 对话系统 ====================
    _bindDialogue() {
        if (!this.dialogueBox) return;
        this.dialogueBox.addEventListener('click', () => {
            if (!gameState.dialogueActive) return;
            this._dialogueAdvance();
        });
    },

    _startDialogue(list, onEnd) {
        this._dialogueQueue = list;
        this._dialogueIndex = 0;
        this._onDialogueEnd = onEnd || null;
        gameState.dialogueActive = true;
        this._dialogueShow();
    },

    _dialogueShow() {
        if (this._dialogueIndex >= this._dialogueQueue.length) { this._dialogueEnd(); return; }
        const d = this._dialogueQueue[this._dialogueIndex];
        if (this.dialogueSpeaker) this.dialogueSpeaker.textContent = d.speaker;
        if (this.dialogueText) this.dialogueText.innerHTML = d.text.replace(/\n/g, '<br>');
        if (this.dialogueBox) this.dialogueBox.style.display = 'block';
        // 蓝阿婆对话时显示立绘
        const portrait = document.getElementById('level1-dialogue-portrait');
        if (portrait) {
            if (d.speaker === '蓝阿婆') {
                portrait.classList.add('show');
            } else {
                portrait.classList.remove('show');
            }
        }
    },

    _dialogueAdvance() { this._dialogueIndex++; this._dialogueShow(); },

    _dialogueEnd() {
        if (this.dialogueBox) this.dialogueBox.style.display = 'none';
        gameState.dialogueActive = false;
        if (this._onDialogueEnd) { const cb = this._onDialogueEnd; this._onDialogueEnd = null; cb(); }
    },

    // ==================== 事件绑定 ====================
    _bindPopup() {
        if (!this.popupOverlay) return;
        this.popupOverlay.addEventListener('click', (e) => {
            if (e.target === this.popupOverlay) this.popupOverlay.style.display = 'none';
        });
    },

    _bindPuzzleClose() {
        if (!this.puzzleOverlay) return;
        this.puzzleOverlay.addEventListener('click', (e) => {
            if (e.target === this.puzzleOverlay) this.puzzleOverlay.style.display = 'none';
        });
    },

    // ==================== HUD & 工具 ====================
    _updateProgressHud() {
        if (!this.hudProgress) return;
        const a = Object.values(gameState.level1.artifacts).filter(Boolean).length;
        const m = Object.values(gameState.level1.memories).filter(Boolean).length;
        const p = Object.values(gameState.level1.puzzles).filter(Boolean).length;
        this.hudProgress.textContent = '文物 ' + a + '/5 · 记忆 ' + m + '/4 · 解谜 ' + p + '/4';
    },

    _showDesc(text) {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;bottom:25%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#e8dcc8;padding:20px 36px;border-radius:12px;font-size:16px;letter-spacing:2px;line-height:2;text-align:center;max-width:560px;z-index:100;cursor:pointer;';
        el.textContent = text;
        el.addEventListener('click', () => el.remove());
        if (this.root) this.root.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 6000);
    },

    _showToast(msg) {
        let t = document.querySelector('.toast-message');
        if (!t) { t = document.createElement('div'); t.className = 'toast-message'; document.body.appendChild(t); }
        t.textContent = msg; t.style.opacity = '1';
        clearTimeout(this._timer); this._timer = setTimeout(() => { t.style.opacity = '0'; }, 2200);
    },

    _reset() {
        this._currentScene = 'gate';
        this._firstVillageVisit = true;
        this._grannyDone = false;
        if (gameState.level1) gameState.level1.gateDescribed = false;
    }
};
