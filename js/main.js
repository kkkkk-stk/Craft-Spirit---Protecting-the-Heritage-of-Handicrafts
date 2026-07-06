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

/**
 * 初始化所有模块
 */
function init() {
    console.log('匠灵 · 开始初始化...');

    try {
        // 主界面（必须先初始化，绑定按钮事件）
        MainMenu.init();

        // 前情提要（监听开始事件 + 返回主菜单时重置）
        IntroController.init();
        document.addEventListener('startIntro', () => {
            console.log('main: 收到 startIntro 事件');
            IntroController.start();
        });

        // 设置面板（监听打开事件）
        document.addEventListener('openSettings', (e) => {
            const source = e.detail?.source || 'main-menu';
            SettingsManager.open(source);
        });

        // 设置关闭后恢复暂停面板
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
        SettingsManager.init();
        PauseManager.init();

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
