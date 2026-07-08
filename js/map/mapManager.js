// ========== 地图管理器 ==========

import { gameState } from '../common/gameState.js';

export const MapManager = {
    mapScreen: null,

    init() {
        this.mapScreen = document.getElementById('map-screen');

        const closeBtn = document.querySelector('.map-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (gameState.isPaused || gameState.dialogueActive) return;
            if (gameState.keyBindings.openMap.keys.includes(key)) {
                this.toggle();
            }
        });

        console.log('MapManager: 初始化完成');
    },

    toggle() {
        if (this.mapScreen.style.display === 'flex') {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        if (!gameState.hasMap) {
            this._showToast('你还没有获得地图！');
            return;
        }
        this.mapScreen.style.display = 'flex';
    },

    close() {
        this.mapScreen.style.display = 'none';
    },

    _showToast(msg) {
        let toast = document.querySelector('.toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(this._timer);
        this._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    }
};
