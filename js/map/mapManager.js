// ========== 地图管理器 ==========

import { gameState } from '../common/gameState.js';

export const MapManager = {
    mapScreen: null,

    /**
     * 初始化地图管理器
     */
    init() {
        this.mapScreen = document.getElementById('map-screen');

        // 关闭按钮
        const closeBtn = document.querySelector('.map-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // 地图按键（使用可配置按键绑定）
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (gameState.isPaused || gameState.dialogueActive) return;

            if (gameState.keyBindings.openMap.keys.includes(key)) {
                this.toggle();
            }
        });

        console.log('MapManager: 初始化完成');
    },

    /**
     * 切换地图显示/隐藏
     */
    toggle() {
        if (this.mapScreen.style.display === 'flex') {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * 打开地图
     */
    open() {
        if (!gameState.hasMap) {
            this._showToast('你还没有获得地图！');
            return;
        }
        this.mapScreen.style.display = 'flex';
    },

    /**
     * 关闭地图
     */
    close() {
        this.mapScreen.style.display = 'none';
    },

    /**
     * 简易 Toast 提示
     */
    _showToast(message) {
        let toast = document.querySelector('.toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
        }, 2200);
    }
};
