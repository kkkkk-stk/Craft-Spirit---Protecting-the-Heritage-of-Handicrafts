// ========== 前情提要逻辑 ==========

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';

export const IntroController = {
    started: false,
    _skipTimer: null,   // 500ms 后启用跳过的定时器
    _autoTimer: null,   // 8s 自动跳过的定时器
    _skipHandler: null, // 当前活跃的跳过处理函数

    /**
     * 初始化（监听返回主菜单事件以重置状态）
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

        // 跳过处理函数
        this._skipHandler = () => {
            if (gameState.tutorialShown) return;
            gameState.tutorialShown = true;
            this._cleanup();

            console.log('IntroController: 跳过前情提要，进入游戏');
            SceneManager.transitionTo('intro-screen', null, () => {
                this.enterGame();
            });
        };

        // 500ms 后才允许跳过（防止误触）
        this._skipTimer = setTimeout(() => {
            document.addEventListener('keydown', this._skipHandler);
            introScreen.addEventListener('click', this._skipHandler);
            console.log('IntroController: 跳过功能已启用');
        }, 500);

        // 8 秒后自动进入游戏
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
    enterGame() {
        console.log('IntroController: 进入游戏场景');
        SceneManager.show('game-screen', 'block');
        SceneManager.show('ui-hud', 'flex');

        // 延迟显示新手教程
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('showTutorial'));
        }, 600);
    },

    /**
     * 清理所有定时器和事件监听
     */
    _cleanup() {
        this.started = false;

        // 清除定时器
        if (this._skipTimer) {
            clearTimeout(this._skipTimer);
            this._skipTimer = null;
        }
        if (this._autoTimer) {
            clearTimeout(this._autoTimer);
            this._autoTimer = null;
        }

        // 移除事件监听
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
