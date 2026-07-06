// ========== 主界面逻辑 ==========

import { SceneManager } from '../common/sceneManager.js';
import { Toast } from '../common/toast.js';

export const MainMenu = {
    /**
     * 初始化主界面，绑定按钮事件
     */
    init() {
        const startBtn = document.querySelector('.menu-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.onStart());
        }

        // 通过 onclick 绑定的按钮统一用事件委托
        document.getElementById('main-menu').addEventListener('click', (e) => {
            if (e.target.classList.contains('menu-btn')) {
                const text = e.target.textContent.trim();
                switch (text) {
                    case '读取存档':
                        Toast.show('暂无存档');
                        break;
                    case '设置选项':
                        Toast.show('设置功能开发中');
                        break;
                    case '关于我们':
                        this.showAbout();
                        break;
                }
            }
        });
    },

    /**
     * 开始游戏：主界面 → 前情提要
     */
    onStart() {
        SceneManager.transitionTo('main-menu', 'intro-screen', () => {
            // 通知 intro 模块开始播放
            document.dispatchEvent(new CustomEvent('startIntro'));
        });
    },

    /**
     * 关于我们弹窗
     */
    showAbout() {
        alert(`《匠灵：守护手艺传承》\n\n一款以浙江非遗文化为题材的\n国风叙事解谜游戏\n\n开发团队：匠灵工作室\n© 2026 All Rights Reserved`.trim());
    }
};
