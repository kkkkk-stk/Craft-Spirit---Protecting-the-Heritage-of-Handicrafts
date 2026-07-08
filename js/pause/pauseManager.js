// ========== 暂停管理器 ==========
// 管理 ESC 暂停菜单（继续 / 保存 / 设置 / 返回主菜单）

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';

export const PauseManager = {
    overlay: null,

    /**
     * 初始化暂停管理器
     */
    init() {
        this.overlay = document.getElementById('pause-overlay');
        if (!this.overlay) {
            console.error('PauseManager: 找不到 #pause-overlay 元素');
            return;
        }

        // 暂停面板按钮委托
        this.overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.pause-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            switch (action) {
                case 'resume':
                    this.resume();
                    break;
                case 'save':
                    this.saveGame();
                    break;
                case 'settings':
                    this.openSettings();
                    break;
                case 'quit':
                    this.quitToMenu();
                    break;
            }
        });

        // 全局 ESC 监听（切换暂停）
        document.addEventListener('keydown', (e) => {
            if (gameState.isActionKey('pause', e.key.toLowerCase())) {
                // 如果设置面板从暂停打开，先关设置
                if (gameState.settingsSource === 'pause') {
                    const settingsOverlay = document.getElementById('settings-overlay');
                    if (settingsOverlay && settingsOverlay.style.display === 'flex') {
                        return;
                    }
                }

                // 只在游戏进行中响应暂停
                const gameScreen = document.getElementById('game-screen');
                if (!gameScreen || gameScreen.style.display === 'none') return;

                // 对话或存档选择界面中不暂停
                if (gameState.dialogueActive) return;
                const saveOverlay = document.getElementById('save-slots-overlay');
                if (saveOverlay && saveOverlay.style.display === 'flex') return;

                this.toggle();
            }
        });

        console.log('PauseManager: 初始化完成');
    },

    /**
     * 切换暂停状态
     */
    toggle() {
        if (gameState.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    },

    /**
     * 暂停游戏
     */
    pause() {
        if (gameState.isPaused) return;
        gameState.isPaused = true;
        this.overlay.style.display = 'flex';
        document.dispatchEvent(new CustomEvent('gamePaused'));
        console.log('PauseManager: 游戏暂停');
    },

    /**
     * 继续游戏
     */
    resume() {
        if (!gameState.isPaused) return;
        gameState.isPaused = false;
        this.overlay.style.display = 'none';
        document.dispatchEvent(new CustomEvent('gameResumed'));
        console.log('PauseManager: 游戏继续');
    },

    /**
     * 保存游戏（委托给 SaveManager）
     */
    saveGame() {
        document.dispatchEvent(new CustomEvent('requestSave'));
        // 保存后自动继续
        this.resume();
    },

    /**
     * 从暂停菜单打开设置
     */
    openSettings() {
        this.overlay.style.display = 'none';
        document.dispatchEvent(new CustomEvent('openSettings', {
            detail: { source: 'pause' }
        }));
    },

    /**
     * 返回主菜单（带保存确认）
     */
    quitToMenu() {
        // 创建确认弹窗
        this._showQuitConfirm();
    },

    /**
     * 显示退出确认弹窗
     */
    _showQuitConfirm() {
        // 移除已有弹窗
        const existing = document.querySelector('.quit-confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'quit-confirm-overlay';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100vw;height:100vh;
            background:rgba(0,0,0,0.8);z-index:300;
            display:flex;align-items:center;justify-content:center;
        `;
        overlay.innerHTML = `
            <div style="
                background:#f5f0e8;border:4px solid #8b5a2b;border-radius:16px;
                padding:36px 48px;text-align:center;min-width:380px;
                font-family:'Microsoft YaHei',sans-serif;
            ">
                <h3 style="color:#8b4513;font-size:22px;letter-spacing:4px;margin-bottom:12px;">返回主菜单</h3>
                <p style="color:#5c3a1e;font-size:16px;margin-bottom:28px;line-height:1.8;">
                    当前游戏进度尚未保存<br>是否保存后再返回？
                </p>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <button class="quit-btn-save" style="
                        padding:12px 0;background:#8b4513;color:#fff;border:none;
                        border-radius:8px;font-size:17px;cursor:pointer;letter-spacing:3px;
                    ">保存并返回</button>
                    <button class="quit-btn-nosave" style="
                        padding:12px 0;background:transparent;color:#c62828;border:2px solid #c62828;
                        border-radius:8px;font-size:17px;cursor:pointer;letter-spacing:3px;
                    ">不保存直接返回</button>
                    <button class="quit-btn-cancel" style="
                        padding:12px 0;background:transparent;color:#888;border:1px solid #ccc;
                        border-radius:8px;font-size:16px;cursor:pointer;letter-spacing:2px;
                    ">取消</button>
                </div>
            </div>
        `;

        // 保存并返回
        overlay.querySelector('.quit-btn-save').addEventListener('click', () => {
            overlay.remove();
            document.dispatchEvent(new CustomEvent('requestSave'));
            this._doQuitToMenu();
        });

        // 不保存
        overlay.querySelector('.quit-btn-nosave').addEventListener('click', () => {
            overlay.remove();
            this._doQuitToMenu();
        });

        // 取消
        overlay.querySelector('.quit-btn-cancel').addEventListener('click', () => {
            overlay.remove();
        });

        // 点击遮罩取消
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    },

    /**
     * 执行返回主菜单
     */
    _doQuitToMenu() {
        console.log('PauseManager: 返回主菜单');

        gameState.isPaused = false;
        gameState.dialogueActive = false;
        gameState.tutorialShown = true;

        this.overlay.style.display = 'none';

        SceneManager.hide('pause-overlay');
        SceneManager.hide('game-screen');
        SceneManager.hide('ui-hud');
        SceneManager.hide('dialogue-box');
        SceneManager.hide('tutorial-overlay');
        SceneManager.hide('map-screen');
        SceneManager.hide('settings-overlay');
        SceneManager.hide('save-slots-overlay');

        gameState.playerPosPercent = 15;
        gameState.activeSlotIndex = -1;
        gameState.currentChapter = 'prologue';

        // 将玩家移回游戏主场景
        const player = document.getElementById('player');
        const gameScreen = document.getElementById('game-screen');
        if (player && gameScreen) gameScreen.appendChild(player);

        SceneManager.show('main-menu', 'flex');

        document.dispatchEvent(new CustomEvent('returnToMenu'));
    }
};
