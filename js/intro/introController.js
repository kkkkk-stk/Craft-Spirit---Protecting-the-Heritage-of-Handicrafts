// ========== 前情提要逻辑 ==========

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';

export const IntroController = {
    started: false,

    /**
     * 开始播放前情提要
     */
    start() {
        if (this.started) return;
        this.started = true;

        const introScreen = document.getElementById('intro-screen');

        // 跳过处理
        const skipHandler = () => {
            if (gameState.tutorialShown) return;
            gameState.tutorialShown = true;
            document.removeEventListener('keydown', skipHandler);
            introScreen.removeEventListener('click', skipHandler);

            SceneManager.transitionTo('intro-screen', null, () => {
                this.enterGame();
            });
        };

        // 500ms 后才允许跳过
        setTimeout(() => {
            document.addEventListener('keydown', skipHandler);
            introScreen.addEventListener('click', skipHandler);
        }, 500);

        // 8 秒后自动进入游戏
        setTimeout(() => {
            if (!gameState.tutorialShown) {
                skipHandler();
            }
        }, 8000);
    },

    /**
     * 进入游戏场景
     */
    enterGame() {
        SceneManager.show('game-screen', 'block');
        SceneManager.show('ui-hud', 'flex');

        // 延迟显示新手教程
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('showTutorial'));
        }, 600);
    }
};
