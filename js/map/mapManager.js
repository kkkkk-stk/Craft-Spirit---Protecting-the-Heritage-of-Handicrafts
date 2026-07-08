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

        // 地图关节点点击 → 进入对应关卡
        this.mapScreen.addEventListener('click', (e) => {
            const node = e.target.closest('.map-node');
            if (!node || node.classList.contains('locked')) return;
            const level = node.dataset.level;
            if (level === 'level1') {
                this.close();
                document.dispatchEvent(new CustomEvent('enterLevel1'));
            }
        });

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
        this._updateNodeStatuses();
        this.mapScreen.style.display = 'flex';
    },

    /**
     * 更新地图关节点状态（已通关/解锁）
     */
    _updateNodeStatuses() {
        const nodes = this.mapScreen.querySelectorAll('.map-node');
        nodes.forEach(node => {
            const level = node.dataset.level;
            const statusEl = node.querySelector('.map-node-status');
            if (level === 'level1') {
                if (gameState.level1 && gameState.level1.completed) {
                    node.classList.remove('locked');
                    if (statusEl) statusEl.textContent = '✅ 已通关 · 可重玩';
                } else {
                    node.classList.remove('locked');
                    if (statusEl) statusEl.textContent = '点击进入';
                }
            } else if (level === 'level2') {
                // 第一关通关后解锁第二关
                if (gameState.level1 && gameState.level1.completed) {
                    node.classList.remove('locked');
                    if (statusEl) statusEl.textContent = '点击进入';
                }
            }
        });
    },

    /**
     * 关闭地图
     */
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
