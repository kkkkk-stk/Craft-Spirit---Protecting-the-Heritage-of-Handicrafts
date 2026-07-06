// ========== 新手教程管理器 ==========

import { gameState } from '../common/gameState.js';

export const TutorialManager = {
    overlay: null,

    /**
     * 初始化新手教程
     */
    init() {
        this.overlay = document.getElementById('tutorial-overlay');

        // 关闭按钮
        const closeBtn = document.querySelector('.tutorial-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // 监听显示教程事件
        document.addEventListener('showTutorial', () => this.show());
    },

    /**
     * 显示新手教程
     */
    show() {
        this.overlay.style.display = 'flex';
    },

    /**
     * 关闭新手教程
     */
    close() {
        this.overlay.style.display = 'none';
    }
};
