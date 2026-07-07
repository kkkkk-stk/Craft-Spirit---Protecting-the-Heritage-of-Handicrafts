// ========== 前情提要逻辑 ==========
// 仅在新游戏首次进入时播放，读档跳过

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';

export const IntroController = {
    started: false,
    _skipTimer: null,
    _autoTimer: null,
    _skipHandler: null,

    /**
     * 初始化（监听返回主菜单 → 重置状态）
     */
    init() {
        document.addEventListener('returnToMenu', () => {
            this._cleanup();
            console.log('IntroController: 状态已重置');
        });
    },

    /**
     * 开始播放前情提要
     */
    start() {
        if (this.started) {
            console.log('IntroController: 已经启动，跳过重复调用');
            return;
        }
        this.started = true;
        console.log('IntroController: 开始播放前情提要');

        const introScreen = document.getElementById('intro-screen');
        if (!introScreen) {
            console.error('IntroController: 找不到 #intro-screen 元素');
            return;
        }

        // 跳过 → 直接进入游戏
        this._skipHandler = () => {
            if (gameState.tutorialShown) return;
            gameState.tutorialShown = true;
            this._cleanup();

            console.log('IntroController: 跳过前情提要 → 进入游戏');
            SceneManager.transitionTo('intro-screen', null, () => {
                this._enterGame();
            });
        };

        // 500ms 后允许跳过（防误触）
        this._skipTimer = setTimeout(() => {
            document.addEventListener('keydown', this._skipHandler);
            introScreen.addEventListener('click', this._skipHandler);
            console.log('IntroController: 跳过功能已启用');
        }, 500);

        // 8 秒后自动进入
        this._autoTimer = setTimeout(() => {
            if (!gameState.tutorialShown && this._skipHandler) {
                console.log('IntroController: 自动跳过前情提要');
                this._skipHandler();
            }
        }, 8000);
    },

    /**
     * 进入游戏场景
     */
    _enterGame() {
        console.log('IntroController: 进入游戏场景');

        // 自动保存初始状态
        document.dispatchEvent(new CustomEvent('requestSave'));

        SceneManager.show('game-screen', 'block');
        SceneManager.show('ui-hud', 'flex');

        // 延迟显示新手教程
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('showTutorial'));
        }, 600);
    },

    /**
     * 清理定时器和事件
     */
    _cleanup() {
        this.started = false;

        if (this._skipTimer) {
            clearTimeout(this._skipTimer);
            this._skipTimer = null;
        }
        if (this._autoTimer) {
            clearTimeout(this._autoTimer);
            this._autoTimer = null;
        }
        if (this._skipHandler) {
            document.removeEventListener('keydown', this._skipHandler);
            const introScreen = document.getElementById('intro-screen');
            if (introScreen) {
                introScreen.removeEventListener('click', this._skipHandler);
            }
            this._skipHandler = null;
        }
    }
};
