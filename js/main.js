// ========== 游戏入口 ==========
// 统一初始化所有模块

import { MainMenu } from './menu/mainMenu.js';
import { IntroController } from './intro/introController.js';
import { PlayerController } from './game/playerController.js';
import { NpcController } from './game/npcController.js';
import { DialogueSystem } from './game/dialogueSystem.js';
import { TutorialManager } from './tutorial/tutorialManager.js';
import { MapManager } from './map/mapManager.js';
import { SettingsManager } from './settings/settingsManager.js';
import { PauseManager } from './pause/pauseManager.js';
import { SaveManager } from './save/saveManager.js';
import { BackpackManager } from './backpack/backpackManager.js';
import { Level1Manager } from './level1/level1Manager.js';

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

        // UI 模块
        TutorialManager.init();
        MapManager.init();
        BackpackManager.init();
        SettingsManager.init();
        PauseManager.init();

        // 第一关
        Level1Manager.init();

        console.log('匠灵 · 所有模块初始化完成 ✅');
    } catch (err) {
        console.error('匠灵 · 初始化失败:', err);
    }
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
