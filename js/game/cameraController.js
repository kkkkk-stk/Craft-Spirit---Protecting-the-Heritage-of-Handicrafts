// ========== 摄像机跟随控制器 ==========
// 游戏世界比视口宽，摄像机跟随主角水平滚动，只显示主角附近区域

import { gameState } from '../common/gameState.js';

export const CameraController = {
    _worldLayer: null,
    _worldWidthRatio: 1,       // 世界宽度 = 视口（无摄像机滚动）
    _playerScreenRatio: 0.35,  // 玩家保持在屏幕 35% 处
    _bgX: 50,                  // level1 背景视差位置（跨场景延续）
    _lastPercent: null,        // 上次 playerPosPercent（增量计算用）
    _lastSceneId: null,        // 上次活跃场景 id（检测场景切换）

    init() {
        this._worldLayer = document.querySelector('#game-screen > .world-layer');
        if (!this._worldLayer) {
            console.warn('CameraController: 找不到 .world-layer');
            return;
        }

        // 玩家移动时更新摄像机
        document.addEventListener('playerMoved', () => this.update());

        // 窗口大小变化时重新计算
        window.addEventListener('resize', () => this.update());

        // 读档后更新
        document.addEventListener('gameLoaded', () => {
            setTimeout(() => this.update(), 50);
        });

        // 新游戏进入（前情提要结束后触发教程时更新）
        document.addEventListener('showTutorial', () => this.update());

        // 返回主菜单时重置
        document.addEventListener('returnToMenu', () => {
            if (this._worldLayer) this._worldLayer.style.transform = '';
            // 重置 level1 视差状态
            this._bgX = 50;
            this._lastPercent = null;
            this._lastSceneId = null;
        });

        console.log('CameraController: 摄像机初始化完成');
    },

    /**
     * 根据玩家在世界中的位置更新摄像机偏移
     */
    update() {
        // game-screen 优先检查（避免 level1-screen 无 inline display 时误判）
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen && gameScreen.style.display !== 'none' && this._worldLayer) {
            // 轻微背景视差：背景随玩家位置缓慢平移，营造深度感
            const pct = gameState.playerPosPercent;
            const bgX = 50 + (pct - 45) * 0.3;
            this._worldLayer.style.backgroundPosition = bgX + '% center';
            return;
        }

        // level1 模式：对当前可见场景做视差滚动
        const level1Screen = document.getElementById('level1-screen');
        if (level1Screen && level1Screen.style.display !== 'none') {
            this._updateLevel1Parallax(level1Screen);
            return;
        }
    },

    /**
     * level1 场景视差滚动（相机效果）
     * 远景背景慢速滚动，近景地面快速滚动，营造深度感
     */
    _updateLevel1Parallax(level1Screen) {
        // 转场期间不更新，避免用旧场景+新位置错误计算背景
        if (gameState.transitioning) return;

        const scenes = level1Screen.querySelectorAll('.level1-scene');
        let active = null;
        scenes.forEach(s => {
            if (s.style.display !== 'none' && s.id !== 'scene-house-inside') active = s;
        });
        if (!active) return;

        const pct = gameState.playerPosPercent;

        // 场景切换：吸收 playerPosPercent 跳变，背景位置延续不重置
        if (this._lastSceneId !== active.id) {
            this._lastSceneId = active.id;
            this._lastPercent = pct;
        } else if (this._lastPercent !== null) {
            // 场景内移动：按增量更新背景位置
            const dPct = pct - this._lastPercent;
            this._lastPercent = pct;
            // 玩家往右走（dPct>0），背景往左退（_bgX 增大）
            this._bgX += dPct * 0.2;
            this._bgX = Math.max(30, Math.min(70, this._bgX));
        }

        active.style.backgroundPositionX = this._bgX + '%';

        // 地面固定不动（玩家踩在地面上），清除可能残留的内联偏移
        const ground = active.querySelector('.gate-path, .village-ground, .hub-ground');
        if (ground) {
            ground.style.backgroundPositionX = '';
        }
    }
};
