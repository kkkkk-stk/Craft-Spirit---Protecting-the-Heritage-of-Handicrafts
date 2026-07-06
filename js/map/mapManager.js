// ========== 地图管理器 ==========

import { gameState } from '../common/gameState.js';
import { Toast } from '../common/toast.js';

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

        // M 键切换地图
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'm') {
                this.toggle();
            }
        });
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
            Toast.show('你还没有获得地图！');
            return;
        }
        this.mapScreen.style.display = 'flex';
    },

    /**
     * 关闭地图
     */
    close() {
        this.mapScreen.style.display = 'none';
    }
};
