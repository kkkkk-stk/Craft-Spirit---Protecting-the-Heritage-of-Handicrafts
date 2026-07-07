// ========== 玩家移动控制器（精灵动画版）==========

import { gameState } from '../common/gameState.js';

const FIXED_FRAME_MS = 1000 / 60;       // 固定 60fps 逻辑帧
const ANIM_SPEED = 1;                    // 每逻辑帧推进 1 帧 → 60fps 动画
const ANIM_IMAGE_COUNT = 30;            // 实际图片数量
const ANIM_FRAME_COUNT = 480;            // 总帧数（每张图复用 16 次）
const MOVE_FRAME_PATH = (i) =>
    `assets/images/protagonist_move/protagonist_move_${String(i).padStart(2, '0')}_clean.png`;
const STAND_PATH = 'assets/images/protagonist_stand/character1.png';

export const PlayerController = {
    player: null,
    sprite: null,
    keysPressed: {},
    _lastFrameTime: 0,
    _animTick: 0,          // 动画计时器
    _animFrame: 0,         // 当前行走帧 (0~29)
    _wasMoving: false,     // 上一帧是否在移动

    init() {
        this.player = document.getElementById('player');
        this.sprite = document.getElementById('player-sprite');

        if (!this.sprite) {
            console.error('PlayerController: 找不到 #player-sprite');
        }

        this.bindKeys();
        this.updatePosition();
        this.loop(performance.now());

        document.addEventListener('returnToMenu', () => {
            this.keysPressed = {};
        });

        document.addEventListener('gameLoaded', () => {
            this.updatePosition();
            this._updateSpriteDirection();
        });

        console.log('PlayerController: 精灵动画初始化完成（固定 60fps）');
    },

    bindKeys() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;

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
     * 更新玩家容器 DOM 位置
     */
    updatePosition() {
        if (!this.player) return;
        this.player.style.left = `calc(${gameState.playerPosPercent}% + 30px)`;
        document.dispatchEvent(new CustomEvent('playerMoved'));
    },

    /**
     * 固定 60fps 主循环
     */
    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));

        if (timestamp - this._lastFrameTime < FIXED_FRAME_MS) return;
        this._lastFrameTime = timestamp;

        const gameScreen = document.getElementById('game-screen');
        const gameVisible = gameScreen && gameScreen.style.display !== 'none';
        const mapOpen = document.getElementById('map-screen').style.display === 'flex';
        const settingsOpen = document.getElementById('settings-overlay').style.display === 'flex';
        const canMove = gameVisible && !gameState.isPaused && !gameState.dialogueActive
                        && !mapOpen && !settingsOpen;

        let moved = false;

        if (canMove) {
            if (this._isMoveLeft()) {
                gameState.playerPosPercent = Math.max(5, gameState.playerPosPercent - gameState.playerSpeed * 0.03);
                gameState.playerDirection = 'left';
                moved = true;
            }
            if (this._isMoveRight()) {
                gameState.playerPosPercent = Math.min(85, gameState.playerPosPercent + gameState.playerSpeed * 0.03);
                gameState.playerDirection = 'right';
                moved = true;
            }
        }

        // 同时按下左右键 → 不动
        if (this._isMoveLeft() && this._isMoveRight()) {
            moved = false;
        }

        gameState.playerMoving = moved;

        if (moved) {
            this.updatePosition();
        }

        // 更新精灵动画
        this._updateAnimation(moved);
    },

    // ==================== 精灵动画 ====================

    /**
     * 更新精灵帧和方向
     */
    _updateAnimation(moving) {
        if (!this.sprite) return;

        // 方向翻转
        this._updateSpriteDirection();

        if (moving) {
            // 每 ANIM_SPEED 逻辑帧推进 1 帧
            this._animTick++;
            if (this._animTick >= ANIM_SPEED) {
                this._animTick = 0;
                this._animFrame = (this._animFrame + 1) % ANIM_FRAME_COUNT;
                const imgIdx = this._animFrame % ANIM_IMAGE_COUNT;
                this.sprite.src = MOVE_FRAME_PATH(imgIdx);
            }

            // 从站立切换到行走的第一帧
            if (!this._wasMoving) {
                this._animFrame = 0;
                this._animTick = 0;
                this.sprite.src = MOVE_FRAME_PATH(0);
            }
        } else {
            // 站立
            this._animTick = 0;
            this._animFrame = 0;
            this.sprite.src = STAND_PATH;
        }

        this._wasMoving = moving;
    },

    /**
     * 根据方向翻转精灵
     */
    _updateSpriteDirection() {
        if (!this.player) return;
        if (gameState.playerDirection === 'left') {
            this.player.style.transform = 'scaleX(1)';
        } else {
            this.player.style.transform = 'scaleX(-1)';
        }
    },

    _isMoveLeft() {
        return gameState.keyBindings.moveLeft.keys.some(key => this.keysPressed[key]);
    },

    _isMoveRight() {
        return gameState.keyBindings.moveRight.keys.some(key => this.keysPressed[key]);
    }
};
