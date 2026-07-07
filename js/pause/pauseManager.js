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
     * 返回主菜单
     */
    quitToMenu() {
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

        SceneManager.show('main-menu', 'flex');

        document.dispatchEvent(new CustomEvent('returnToMenu'));
    }
};
