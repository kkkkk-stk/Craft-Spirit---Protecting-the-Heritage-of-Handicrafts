// ========== 第一关管理器 v3 ==========
import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';
import { OPENING_DIALOGUES, DIALOGUE_PHASE_2, DIALOGUE_PHASE_3, DIALOGUE_PHASE_4, CG_SCENES, ENDING_DIALOGUES, AREAS, ARTIFACTS, MEMORIES, PUZZLES, LOOM_LEVELS } from './level1Data.js';
import { DyeCraftGame } from './dyeCraftGame.js';
import { DyeThreadGame } from './dyeThreadGame.js';

export const Level1Manager = {
    root: null, _currentScene: 'gate', _firstVillageVisit: true, _player: null,
    _cgOverlay: null, _spiritTimer: null,
    dialogueBox: null, dialogueSpeaker: null, dialogueText: null,
    popupOverlay: null, popupContent: null, memoryOverlay: null,
    puzzleOverlay: null, puzzleContent: null, hudProgress: null,
    _dialogueIndex: 0, _dialogueQueue: [], _onDialogueEnd: null,

    init() {
        // 事件监听最先注册
        document.addEventListener('enterLevel1', (e) => {
            console.log('Level1Manager: 收到 enterLevel1');
            const scene = (e.detail && e.detail.scene) || gameState.level1.currentScene || 'gate';
            const savedPos = e.detail && e.detail.playerPosPercent;
            try {
                this.enter(scene);
                if (savedPos !== undefined) {
                    gameState.playerPosPercent = savedPos;
                    document.dispatchEvent(new CustomEvent('gameLoaded'));
                }
            } catch (err) { console.error('enter error:', err); }
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

        // 场景转场黑幕（淡入淡出，让场景切换更丝滑）
        this._transitionMask = document.createElement('div');
        this._transitionMask.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:500;transition:opacity 0.25s ease;';
        if (this.root) this.root.appendChild(this._transitionMask);

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


        // 六边拼图完成 → 匠灵诞生 → 通关
        document.addEventListener('hexPuzzleSolved', (e) => {
            if (!e.detail || !e.detail.allDone) return;
            if (gameState.level1.taskPhase !== 7) return;  // 仅阶段7可触发通关
            gameState.level1.puzzles.totem = true;
            gameState.level1.taskPhase = 8;
            this._updateProgressHud();
            // 关闭拼图面板，切换到hub场景，播放匠灵诞生动画
            setTimeout(() => {
                const hexOverlay = document.getElementById('hex-puzzle-overlay');
                if (hexOverlay) hexOverlay.style.display = 'none';
                this._switchView('hub');
                this._playSpiritBirth();
            }, 800);
        });

        // 行走监听
        document.addEventListener('playerMoved', () => {
            if (gameState.currentChapter !== 'level1') return;
            this._checkTransitions();
        });

        // 按键：E交互 / ESC关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.puzzleOverlay && this.puzzleOverlay.style.display === 'flex') { this._closePuzzle(); return; }
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
        gameState.level1.currentScene = scene;
        SceneManager.hide('game-screen');
        SceneManager.show('ui-hud', 'flex');
        const hud = document.getElementById('ui-hud');
        if (hud) hud.style.top = '60px';  // 下移避开 level1 标题栏
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
        if (scene === 'village' && !gameState.level1.villageDescribed) {
            gameState.level1.villageDescribed = true;
            setTimeout(() => this._showDesc(
                '村口老戏台落满枯叶，无人问津。\n绣花古宅的木门半掩，一道温柔苍老的虚影静静立在门边，身着褪色畲族传统蓝衣，头戴畲族头帕，眼神温柔却满是怅然。'
            ), 400);
        }
        if (scene === 'hub') this._renderArea('yard');
        console.log('Level1: 进入场景', scene);
    },

    // ==================== 场景切换 ====================
    _switchView(scene) {
        // 同步设置玩家显示与位置（确保转场后位置正确，且不影响后续位置覆盖）
        if (this._player) {
            this._player.style.display = (scene === 'house') ? 'none' : 'block';
            if (scene === 'gate') gameState.playerPosPercent = 8;
            else if (scene === 'village') gameState.playerPosPercent = 12;
            else if (scene === 'hub') gameState.playerPosPercent = 20;
            else if (scene === 'back-mountain') gameState.playerPosPercent = 15;
        }

        const applyDisplay = () => {
            ['scene-village-gate', 'scene-village-inside', 'scene-hub', 'scene-back-mountain', 'scene-house-inside'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            const map = { gate: 'scene-village-gate', village: 'scene-village-inside', hub: 'scene-hub', 'back-mountain': 'scene-back-mountain', house: 'scene-house-inside' };
            const el = document.getElementById(map[scene]);
            if (el) el.style.display = 'block';
            gameState.transitioning = false;
            document.dispatchEvent(new CustomEvent('gameLoaded'));
        };

        // 黑幕淡入 → 切换场景 → 淡出
        const mask = this._transitionMask;
        if (!mask) { applyDisplay(); return; }

        if (this._transitionTimer) clearTimeout(this._transitionTimer);
        gameState.transitioning = true;
        mask.style.opacity = '1';
        this._transitionTimer = setTimeout(() => {
            applyDisplay();
            this._transitionTimer = null;
            requestAnimationFrame(() => { mask.style.opacity = '0'; });
        }, 250);
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
            return;
        }
        if (this._currentScene === 'village' && pos >= 84 && movingRight) {
            // 阶段0：还没和蓝婆婆对话，不能去后山
            if (gameState.level1.taskPhase < 1) {
                this._showToast('先去找蓝婆婆');
                gameState.playerPosPercent = 82;
                return;
            }
            console.log('transition: village→hub'); this.enter('hub'); return;
        }
        if (this._currentScene === 'hub' && pos <= 5 && movingLeft) {
            console.log('transition: hub→village');
            this.enter('village');
            gameState.playerPosPercent = 80;
            return;
        }
        if (this._currentScene === 'back-mountain' && pos <= 5 && movingLeft) {
            console.log('transition: back-mountain→hub');
            this.enter('hub');
            gameState.playerPosPercent = 20;
            return;
        }
        this._updatePrompts(pos);
    },

    _updatePrompts(pos) {
        const phase = gameState.level1.taskPhase;
        const gp = document.getElementById('granny-prompt');
        const dp = document.getElementById('door-prompt');
        const ep = document.getElementById('yard-entrance-prompt');
        const hp = document.getElementById('hall-prompt');
        const bp1 = document.getElementById('bm-prompt1');
        const bp2 = document.getElementById('bm-prompt2');

        // 蓝婆婆提示（village场景，pos > 65）
        if (gp) {
            if (this._currentScene === 'village' && pos > 65) {
                gp.style.display = 'block';
                if (phase === 0) gp.textContent = '按 E 对话';
                else if (phase === 2) gp.textContent = '按 E 交付染料材料';
                else if (phase === 4) gp.textContent = '按 E 交付五彩丝线';
                else if (phase === 6) gp.textContent = '按 E 交付第一块布';
                else gp.textContent = '按 E 对话';
            } else {
                gp.style.display = 'none';
            }
        }

        // 古宅门提示（village场景，pos 48-58，需 phase >= 5）
        if (dp) {
            if (this._currentScene === 'village' && pos > 48 && pos < 58) {
                if (phase >= 5) {
                    dp.style.display = 'block';
                    dp.textContent = '按 E 进入';
                } else {
                    dp.style.display = 'none';
                }
            } else {
                dp.style.display = 'none';
            }
        }

        // 后山入口提示（hub场景，pos 10-30）
        if (ep) {
            const show = this._currentScene === 'hub' && pos > 10 && pos < 30;
            if (show) {
                if (phase >= 1 && phase <= 4) {
                    ep.style.display = 'block';
                    ep.textContent = '按 E 进入';
                } else {
                    ep.style.display = 'block';
                    ep.textContent = '🔒 后山任务已完成';
                }
            } else {
                ep.style.display = 'none';
            }
        }

        // 祠堂提示（hub场景，pos > 60，需 phase >= 7）
        if (hp) {
            const show = this._currentScene === 'hub' && pos > 60;
            if (show) {
                if (phase >= 7) {
                    if (gameState.level1.puzzles.totem) {
                        hp.style.display = 'none';
                    } else {
                        hp.style.display = 'block';
                        hp.textContent = '按 E 交互';
                    }
                } else {
                    hp.style.display = 'block';
                    hp.textContent = '🔒 需完成前置任务';
                }
            } else {
                hp.style.display = 'none';
            }
        }

        // 后山采药提示（back-mountain，pos 2-22，需 phase === 1）
        if (bp1) {
            if (this._currentScene === 'back-mountain' && pos > 2 && pos < 22 && phase === 1) {
                bp1.style.display = 'block';
                bp1.textContent = gameState.level1.puzzles.dyeCraft ? '已完成' : '按 E 交互';
            } else {
                bp1.style.display = 'none';
            }
        }

        // 后山染线提示（back-mountain，pos 48-72，需 phase === 3）
        if (bp2) {
            if (this._currentScene === 'back-mountain' && pos > 48 && pos < 72 && phase === 3) {
                bp2.style.display = 'block';
                bp2.textContent = gameState.level1.puzzles.dyeThread ? '已完成' : '按 E 交互';
            } else {
                bp2.style.display = 'none';
            }
        }
    },

    // ==================== E键交互 ====================
    _handleInteract() {
        const pos = gameState.playerPosPercent;
        const phase = gameState.level1.taskPhase;

        // 蓝婆婆交互（village场景，pos > 65）
        if (this._currentScene === 'village' && pos > 65) {
            this._handleGrannyInteract();
            return;
        }

        // 古宅门（village场景，pos 48-58，需 phase >= 5）
        if (this._currentScene === 'village' && pos > 48 && pos < 58) {
            if (phase < 5) {
                this._showToast('蓝婆婆还没让你来这里');
                return;
            }
            this._currentScene = 'house';
            this._switchView('house');
            this._renderArea('house');
            return;
        }

        // 后山入口（hub场景，pos 10-30，需 phase 1-4）
        if (this._currentScene === 'hub' && pos > 10 && pos < 30) {
            if (phase < 1 || phase > 4) {
                this._showToast('后山的任务已完成');
                return;
            }
            // 收集文物4（植物染料包），触发记忆CG
            if (!gameState.level1.artifacts[4]) {
                this._collectArtifact(4);
            }
            this.enter('back-mountain');
            return;
        }

        // 后山采药（back-mountain，pos 2-22，需 phase === 1）
        if (this._currentScene === 'back-mountain' && pos > 2 && pos < 22) {
            if (phase !== 1) {
                this._showToast('现在不需要在这里采药');
                return;
            }
            // 确保文物4已收集
            if (!gameState.level1.artifacts[4]) {
                this._collectArtifact(4);
            }
            if (gameState.level1.puzzles.dyeCraft) return;
            this._startPuzzle('dyeCraft');
            return;
        }

        // 后山染线（back-mountain，pos 48-72，需 phase === 3）
        if (this._currentScene === 'back-mountain' && pos > 48 && pos < 72) {
            if (phase !== 3) {
                this._showToast('现在不需要在这里染线');
                return;
            }
            if (gameState.level1.puzzles.dyeThread) return;
            this._startPuzzle('dyeThread');
            return;
        }

        // 祠堂（hub场景，pos > 60，需 phase >= 7）
        if (this._currentScene === 'hub' && pos > 60) {
            if (phase < 7) {
                this._showToast('祠堂还未解锁，先完成蓝婆婆的任务');
                return;
            }
            // 收集文物5（凤冠绣片，有CG）+ 文物2（丝线束，无CG，延迟显示避免覆盖）
            if (!gameState.level1.artifacts[5]) {
                this._collectArtifact(5);
            }
            // 延迟收集文物2，等文物5弹窗关闭后再显示
            if (!gameState.level1.artifacts[2]) {
                setTimeout(() => this._collectArtifact(2), 4000);
            }
            if (!gameState.level1.puzzles.totem) {
                // 先播放CG4，再打开拼图（仅首次）
                if (!gameState.level1.cg4Played) {
                    gameState.level1.cg4Played = true;
                    this._playCG('cg_puzzle', () => {
                        document.dispatchEvent(new CustomEvent('openHexPuzzle'));
                    });
                } else {
                    document.dispatchEvent(new CustomEvent('openHexPuzzle'));
                }
            }
            return;
        }
    },

    // ==================== 蓝婆婆交互（线性任务核心）====================
    _handleGrannyInteract() {
        const phase = gameState.level1.taskPhase;

        if (phase === 0) {
            // 寻找婆婆 → 对话1 → 任务1下达
            const gp = document.getElementById('granny-prompt');
            if (gp) gp.style.display = 'none';
            this._startDialogue(OPENING_DIALOGUES, () => {
                gameState.level1.taskPhase = 1;
                gameState.level1.openingDone = true;
                this._showToast('任务：去后山采药制色');
                this._updateProgressHud();
                this._updatePrompts(gameState.playerPosPercent);
            });
        } else if (phase === 2) {
            // 采药完成 → CG1 → 对话2 → 任务2
            this._playCG('cg1', () => {
                this._startDialogue(DIALOGUE_PHASE_2, () => {
                    gameState.level1.taskPhase = 3;
                    this._showToast('任务：去后山染线晒线');
                    this._updateProgressHud();
                    this._updatePrompts(gameState.playerPosPercent);
                });
            });
        } else if (phase === 4) {
            // 染线完成 → CG2 → 对话3 → 任务3
            this._playCG('cg2', () => {
                this._startDialogue(DIALOGUE_PHASE_3, () => {
                    gameState.level1.taskPhase = 5;
                    this._showToast('任务：去绣花古宅学习缝制');
                    this._updateProgressHud();
                    this._updatePrompts(gameState.playerPosPercent);
                });
            });
        } else if (phase === 6) {
            // 缝制完成 → CG3 → 对话4 → 解锁拼图
            this._playCG('cg3', () => {
                this._startDialogue(DIALOGUE_PHASE_4, () => {
                    gameState.level1.taskPhase = 7;
                    this._showToast('任务：前往祖宅完成图腾拼图');
                    this._updateProgressHud();
                    this._updatePrompts(gameState.playerPosPercent);
                });
            });
        } else {
            // 任务进行中，提示当前任务
            this._showToast(this._getTaskHint(phase));
        }
    },

    // ==================== CG播放 ====================
    _playCG(cgId, onEnd) {
        const cg = CG_SCENES[cgId];
        if (!cg) { if (onEnd) onEnd(); return; }

        // 创建CG覆盖层（懒加载）
        if (!this._cgOverlay) {
            this._cgOverlay = document.createElement('div');
            this._cgOverlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.95);z-index:600;display:none;flex-direction:column;align-items:center;justify-content:center;';
            if (this.root) this.root.appendChild(this._cgOverlay);
        }

        let html = '<div style="text-align:center;max-width:620px;padding:40px;">';
        html += '<h2 style="color:#e8c547;font-size:24px;margin-bottom:30px;letter-spacing:4px;">' + cg.title + '</h2>';
        if (cg.video) {
            html += '<video id="cg-video" src="' + cg.video + '" style="max-width:100%;max-height:45vh;margin-bottom:20px;border-radius:8px;" playsinline></video>';
        }
        html += '<p style="color:#d4c0a0;font-size:16px;line-height:2.2;white-space:pre-line;">' + cg.text + '</p>';
        html += '<button id="cg-continue-btn" style="margin-top:30px;padding:10px 36px;background:#8b4513;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;">继续 ▼</button>';
        html += '</div>';

        this._cgOverlay.innerHTML = html;
        this._cgOverlay.style.display = 'flex';
        gameState.dialogueActive = true;  // 锁定玩家移动

        // 如果有视频，自动播放并暂停BGM
        if (cg.video) {
            const v = this._cgOverlay.querySelector('#cg-video');
            if (v) { v.play().catch(()=>{}); }
            if (gameState.bgmAudio) gameState.bgmAudio.pause();
        }

        const closeCG = () => {
            this._cgOverlay.style.display = 'none';
            gameState.dialogueActive = false;
            const v = this._cgOverlay.querySelector('#cg-video');
            if (v) v.pause();
            if (gameState.bgmAudio && gameState.currentChapter === 'level1') {
                gameState.bgmAudio.play().catch(()=>{});
            }
            if (onEnd) onEnd();
        };

        const btn = this._cgOverlay.querySelector('#cg-continue-btn');
        if (btn) btn.addEventListener('click', closeCG);
    },

    // ==================== 匠灵诞生动画 ====================
    _playSpiritBirth() {
        const spiritBirth = document.getElementById('spirit-birth');
        if (!spiritBirth) { this._playEndingSequence(); return; }

        // 锁定玩家操作
        gameState.transitioning = true;

        // 播放匠灵诞生动画
        spiritBirth.style.display = 'block';
        // 强制回流后触发动画
        void spiritBirth.offsetWidth;

        // 动画总时长约11秒，之后进入结局
        this._spiritTimer = setTimeout(() => {
            spiritBirth.style.display = 'none';
            gameState.transitioning = false;
            this._playEndingSequence();
        }, 11000);
    },

    // ==================== 最终通关序列 ====================
    _playEndingSequence() {
        this._playCG('ending', () => {
            this._startDialogue(ENDING_DIALOGUES, () => {
                gameState.level1.completed = true;
                this._showToast('🎉 关卡通关！浙西南畲族古寨 · 畲族刺绣');
            });
        });
    },

    // ==================== 当前任务提示 ====================
    _getTaskHint(phase) {
        const hints = {
            1: '当前任务：去后山采药制色',
            2: '染料材料已备齐，回去找蓝婆婆',
            3: '当前任务：去后山染线晒线',
            4: '五彩丝线已就绪，回去找蓝婆婆',
            5: '当前任务：去绣花古宅学习缝制',
            6: '第一块布已缝好，回去找蓝婆婆',
            7: '当前任务：前往祖宅完成图腾拼图',
            8: '关卡已完成',
        };
        return hints[phase] || '';
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

    _collectArtifact(id, skipMemory) {
        gameState.level1.artifacts[id] = true;
        const itemId = 'cultural_relic_' + id;
        if (gameState.inventory.indexOf(itemId) === -1) gameState.inventory.push(itemId);
        this._showPopup(ARTIFACTS[id]);
        this._updateProgressHud();
        this._renderArea('house');
        // 触发记忆 CG
        if (!skipMemory && ARTIFACTS[id].memory) {
            setTimeout(() => this._playMemory(ARTIFACTS[id].memory), 2000);
        }
    },

    // ==================== 解密 ====================
    _startPuzzle(pid) {
        const puzzle = PUZZLES[pid];
        if (!puzzle || !this.puzzleOverlay || !this.puzzleContent) return;
        if (gameState.level1.puzzles[pid]) return;

        // 阶段检查
        const taskPhase = gameState.level1.taskPhase;
        if (pid === 'dyeCraft' && taskPhase !== 1) { this._showToast('现在不能采药'); return; }
        if (pid === 'dyeThread' && taskPhase !== 3) { this._showToast('现在不能染线'); return; }
        if (pid === 'loom' && taskPhase !== 5) { this._showToast('现在不能织布'); return; }

        this._prePuzzlePos = gameState.playerPosPercent;
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
                gameState.level1.taskPhase = 6;
                if (gameState.inventory.indexOf('first_cloth') === -1) gameState.inventory.push('first_cloth');
                gameState.level1.memories[3] = true;
                self._updateProgressHud();
                self.puzzleContent.innerHTML = '<h3 style="color:#4a7a30;">✅ 解谜成功！</h3><p>织机齿轮转动，五彩柔光流入凤凰纹样，古宅黑雾缓缓消散。<br>你亲手缝制了第一块布。</p>';
                setTimeout(function () {
                    self.puzzleOverlay.style.display = 'none';
                    self._showToast('第一块布已入背包，回去找蓝婆婆');
                }, 2500);
            });
            tipBtn.addEventListener('click', function () {
                showHint('口诀：横先竖后、外框先稳、纹理后填');
            });

            // Init level 1
            loadLevel(0);
        } else if (pid === 'dyeCraft') {
            // 畲山采药·打靛制色：调用独立游戏模块
            if (this.puzzleOverlay) this.puzzleOverlay.style.display = 'none';
            var self2 = this;
            DyeCraftGame.open(function() {
                gameState.level1.puzzles.dyeCraft = true;
                gameState.level1.taskPhase = 2;
                if (gameState.inventory.indexOf('dye_material') === -1) gameState.inventory.push('dye_material');
                gameState.level1.memories[1] = true;
                self2._updateProgressHud();
                self2._showToast('染料材料已入背包，回去找蓝婆婆');
            });
            return;
        } else if (pid === 'dyeThread') {
            // 浸染丝线·晾晒：调用独立游戏模块
            if (this.puzzleOverlay) this.puzzleOverlay.style.display = 'none';
            var self3 = this;
            DyeThreadGame.open(function() {
                gameState.level1.puzzles.dyeThread = true;
                gameState.level1.taskPhase = 4;
                if (gameState.inventory.indexOf('colorful_threads') === -1) gameState.inventory.push('colorful_threads');
                self3._updateProgressHud();
                self3._showToast('五彩丝线已入背包，回去找蓝婆婆');
            });
            return;
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

    _playMemory(id, onComplete) {
        const m = MEMORIES[id]; if (!m || !this.memoryOverlay) return;
        const video = this.memoryOverlay.querySelector('#level1-memory-video');
        const t = this.memoryOverlay.querySelector('.memory-title');
        const s = this.memoryOverlay.querySelector('.memory-subtitle');
        const cl = this.memoryOverlay.querySelector('.memory-clue');
        if (t) t.textContent = m.title;
        if (s) s.textContent = m.subtitle || '';
        if (cl) cl.textContent = '🔍 ' + (m.clue || '');

        // 设置视频源并播放，暂停 BGM
        if (video && m.video) {
            video.src = m.video;
            video.load();
            video.play().catch(() => {});
        }
        if (gameState.bgmAudio) gameState.bgmAudio.pause();

        this.memoryOverlay.style.display = 'flex';
        gameState.level1.memories[id] = true;
        this._updateProgressHud();

        // 关闭：视频结束或点击关闭，恢复 BGM
        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            this.memoryOverlay.style.display = 'none';
            if (video) { video.pause(); video.src = ''; video.removeEventListener('ended', close); }
            this.memoryOverlay.removeEventListener('click', close);
            if (gameState.bgmAudio && gameState.currentChapter === 'level1') {
                gameState.bgmAudio.play().catch(() => {});
            }
            if (onComplete) onComplete();
        };
        if (video) video.addEventListener('ended', close);
        this.memoryOverlay.addEventListener('click', close);
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
            if (e.target === this.puzzleOverlay) this._closePuzzle();
        });
        const closeBtn = document.getElementById('puzzle-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this._closePuzzle());
    },

    _closePuzzle() {
        if (this.puzzleOverlay) this.puzzleOverlay.style.display = 'none';
        if (this._prePuzzlePos !== undefined) {
            gameState.playerPosPercent = this._prePuzzlePos;
            this._prePuzzlePos = undefined;
        }
    },

    // ==================== HUD & 工具 ====================
    _updateProgressHud() {
        const phase = gameState.level1.taskPhase;
        const taskNames = {
            0: '寻找蓝婆婆',
            1: '后山采药制色',
            2: '返回找蓝婆婆',
            3: '后山染线晒线',
            4: '返回找蓝婆婆',
            5: '古宅学习缝制',
            6: '返回找蓝婆婆',
            7: '祖宅图腾拼图',
            8: '关卡通关'
        };
        const taskText = '📋 当前任务：' + (taskNames[phase] || '');
        if (this.hudProgress) this.hudProgress.textContent = taskText;
    },

    _showDesc(text) {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;bottom:calc(25% + 400px);left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#e8dcc8;padding:20px 36px;border-radius:12px;font-size:16px;letter-spacing:2px;line-height:2;text-align:center;max-width:560px;z-index:100;cursor:pointer;';
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
        clearTimeout(this._spiritTimer);
        const hud = document.getElementById('ui-hud');
        if (hud) hud.style.top = '';  // 恢复默认位置
        if (gameState.level1) {
            gameState.level1.gateDescribed = false;
            gameState.level1.taskPhase = 0;
        }
        const spiritBirth = document.getElementById('spirit-birth');
        if (spiritBirth) spiritBirth.style.display = 'none';
    }
};
