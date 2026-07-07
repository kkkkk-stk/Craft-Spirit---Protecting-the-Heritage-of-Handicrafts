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

        // 监听返回主菜单事件，重置按键状态
        document.addEventListener('returnToMenu', () => {
            this.keysPressed = {};
        });

        // 监听读档事件，刷新玩家位置
        document.addEventListener('gameLoaded', () => {
            this.updatePosition();
            console.log('PlayerController: 位置已刷新');
        });

        console.log('PlayerController: 初始化完成');
    },

    /**
     * 绑定键盘事件
     */
    bindKeys() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;

            // 阻止方向键滚动页面（仅在游戏中）
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen && gameScreen.style.display !== 'none') {
                if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
                    e.preventDefault();
                }
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
     * 游戏主循环（仅 game-screen 可见时处理移动）
     */
    loop() {
        const gameScreen = document.getElementById('game-screen');
        const gameVisible = gameScreen && gameScreen.style.display !== 'none';

        // 暂停、对话、地图、设置打开，或游戏未显示时停止移动
        const mapOpen = document.getElementById('map-screen').style.display === 'flex';
        const settingsOpen = document.getElementById('settings-overlay').style.display === 'flex';

        if (gameVisible && !gameState.isPaused && !gameState.dialogueActive && !mapOpen && !settingsOpen) {
            let moved = false;

            if (this._isMoveLeft()) {
                gameState.playerPosPercent = Math.max(5, gameState.playerPosPercent - gameState.playerSpeed * 0.03);
                moved = true;
            }
            if (this._isMoveRight()) {
                gameState.playerPosPercent = Math.min(85, gameState.playerPosPercent + gameState.playerSpeed * 0.03);
                moved = true;
            }

            if (moved) {
                this.updatePosition();
            }
        }

        requestAnimationFrame(() => this.loop());
    },

    /**
     * 检查是否按下左移按键（使用可配置按键绑定）
     */
    _isMoveLeft() {
        return gameState.keyBindings.moveLeft.keys.some(key => this.keysPressed[key]);
    },

    /**
     * 检查是否按下右移按键（使用可配置按键绑定）
     */
    _isMoveRight() {
        return gameState.keyBindings.moveRight.keys.some(key => this.keysPressed[key]);
    }
};
