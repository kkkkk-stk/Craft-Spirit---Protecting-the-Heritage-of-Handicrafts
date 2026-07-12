// ========== 前情提要逻辑 ==========
// 仅在新游戏首次进入时播放，读档跳过

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';
import { Preloader } from '../preloader.js';

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

        const enterScene = () => {
            SceneManager.show('game-screen', 'block');
            SceneManager.show('ui-hud', 'flex');
            // 延迟显示新手教程
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('showTutorial'));
            }, 600);
        };

        // 游戏场景资源已加载完 → 直接进入
        if (Preloader.isGameReady()) {
            enterScene();
        } else {
            // 资源仍在加载，显示带进度条的过渡提示
            const tip = document.createElement('div');
            tip.id = 'scene-loading-tip';
            tip.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#1a1410;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99998;font-family:Microsoft YaHei,sans-serif;';
            tip.innerHTML = '<p style="color:#d4af6e;font-size:20px;letter-spacing:4px;margin-bottom:24px;">正在唤醒匠灵...</p>'
                + '<div style="width:300px;height:12px;background:rgba(245,240,232,0.08);border:1px solid rgba(212,175,110,0.35);border-radius:7px;overflow:hidden;">'
                + '<div id="scene-loading-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#8b5a2b,#d4af6e,#f5e6c8);border-radius:6px;transition:width 0.25s ease;"></div>'
                + '</div>'
                + '<p id="scene-loading-percent" style="color:#c9a86a;font-size:15px;letter-spacing:2px;margin-top:14px;">0%</p>';
            document.body.appendChild(tip);

            const fill = tip.querySelector('#scene-loading-fill');
            const percentEl = tip.querySelector('#scene-loading-percent');

            Preloader.loadGame((loaded, total) => {
                const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
                fill.style.width = pct + '%';
                percentEl.textContent = pct + '%';
            }).then(() => {
                tip.remove();
                enterScene();
            });
        }
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
