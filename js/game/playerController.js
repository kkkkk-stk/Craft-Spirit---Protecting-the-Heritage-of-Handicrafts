// ========== 玩家移动控制器 ==========

import { gameState } from '../common/gameState.js';

export const PlayerController = {
    player: null,
    keysPressed: {},

    /**
     * 初始化玩家控制器
     */
    init() {
        this.player = document.getElementById('player');
        this.bindKeys();
        this.updatePosition();
        this.loop();
    },

    /**
     * 绑定键盘事件
     */
    bindKeys() {
        document.addEventListener('keydown', (e) => {
            this.keysPressed[e.key.toLowerCase()] = true;

            // 阻止方向键滚动页面
            if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keysPressed[e.key.toLowerCase()] = false;
        });
    },

    /**
     * 更新玩家位置
     */
    updatePosition() {
        if (!this.player) return;
        this.player.style.left = `calc(${gameState.playerPosPercent}% + 30px)`;

        // 通知 NPC 模块检查距离
        document.dispatchEvent(new CustomEvent('playerMoved'));
    },

    /**
     * 游戏主循环
     */
    loop() {
        // 对话或地图打开时暂停移动
        const mapOpen = document.getElementById('map-screen').style.display === 'flex';
        if (!gameState.dialogueActive && !mapOpen) {
            if (this.keysPressed['arrowleft'] || this.keysPressed['a']) {
                gameState.playerPosPercent = Math.max(5, gameState.playerPosPercent - gameState.playerSpeed * 0.03);
                this.updatePosition();
            }
            if (this.keysPressed['arrowright'] || this.keysPressed['d']) {
                gameState.playerPosPercent = Math.min(85, gameState.playerPosPercent + gameState.playerSpeed * 0.03);
                this.updatePosition();
            }
        }

        requestAnimationFrame(() => this.loop());
    }
};
