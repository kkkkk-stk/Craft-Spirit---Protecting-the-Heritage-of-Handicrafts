// ========== 游戏入口 ==========
// 统一初始化所有模块

import { Preloader } from './preloader.js';
import { MainMenu } from './menu/mainMenu.js';
import { IntroController } from './intro/introController.js';
import { PlayerController } from './game/playerController.js';
import { CameraController } from './game/cameraController.js';
import { NpcController } from './game/npcController.js';
import { DialogueSystem } from './game/dialogueSystem.js';
import { TutorialManager } from './tutorial/tutorialManager.js';
import { MapManager } from './map/mapManager.js';
import { SettingsManager } from './settings/settingsManager.js';
import { PauseManager } from './pause/pauseManager.js';
import { SaveManager } from './save/saveManager.js';
import { BackpackManager } from './backpack/backpackManager.js';
import { Level1Manager } from './level1/level1Manager.js';
import { DyeCraftGame } from './level1/dyeCraftGame.js';
import { DyeThreadGame } from './level1/dyeThreadGame.js';
import { HexPuzzleManager } from './hexPuzzle/hexPuzzleManager.js';

/**
 * 初始化所有模块
 */
function init() {
    console.log('匠灵 · 开始初始化...');

    try {
        // 主界面
        MainMenu.init();

        // 前情提要
        IntroController.init();
        document.addEventListener('startIntro', () => {
            console.log('main: 收到 startIntro 事件');
            IntroController.start();
        });

        // 存档管理（需在设置/暂停前初始化）
        SaveManager.init();
        document.addEventListener('requestSave', () => {
            SaveManager.saveGame();
        });

        // 设置面板
        document.addEventListener('openSettings', (e) => {
            const source = e.detail?.source || 'main-menu';
            SettingsManager.open(source);
        });
        document.addEventListener('settingsClosed', (e) => {
            if (e.detail?.source === 'pause') {
                const pauseOverlay = document.getElementById('pause-overlay');
                if (pauseOverlay) {
                    pauseOverlay.style.display = 'flex';
                }
            }
        });

        // 游戏场景模块
        DialogueSystem.init();
        NpcController.init();
        PlayerController.init();
        CameraController.init();

        // UI 模块
        TutorialManager.init();
        MapManager.init();
        BackpackManager.init();
        SettingsManager.init();
        PauseManager.init();

        // 第一关
        Level1Manager.init();

        // 畲山采药·打靛制色小游戏
        DyeCraftGame.init();

        // 浸染丝线·晾晒小游戏
        DyeThreadGame.init();

        // 六边锦绣拼图
        HexPuzzleManager.init();

        console.log('匠灵 · 所有模块初始化完成 ✅');
    } catch (err) {
        console.error('匠灵 · 初始化失败:', err);
    }
}

/**
 * 启动资源预加载，完成后显示进入按钮
 */
function startLoading() {
    const barFill = document.getElementById('loading-bar-fill');
    const percentEl = document.getElementById('loading-percent');
    const hintEl = document.getElementById('loading-hint');
    const enterBtn = document.getElementById('loading-enter-btn');
    const loadingScreen = document.getElementById('loading-screen');

    Preloader.loadAll((loaded, total, hint) => {
        const pct = Math.round((loaded / total) * 100);
        barFill.style.width = pct + '%';
        percentEl.textContent = pct + '%';
        if (hint) hintEl.textContent = hint;
    }).then(({ loaded, failed }) => {
        // 确保进度满
        barFill.style.width = '100%';
        percentEl.textContent = '100%';
        hintEl.textContent = '匠灵已唤醒';

        if (failed.length) {
            console.warn('预加载失败的资源（' + failed.length + ' 项）:', failed);
        }

        // 显示进入按钮（用户交互后初始化，顺便满足浏览器自动播放策略）
        enterBtn.classList.add('show');
        enterBtn.addEventListener('click', () => {
            loadingScreen.classList.add('loaded');
            setTimeout(() => loadingScreen.remove(), 800);
            init();
        }, { once: true });
    });
}

// DOM 加载完成后启动预加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoading);
} else {
    startLoading();
}
