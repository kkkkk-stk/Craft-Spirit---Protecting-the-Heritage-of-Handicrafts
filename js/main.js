// ========== 游戏入口 ==========
// 统一初始化所有模块

import { MainMenu } from './menu/mainMenu.js';
import { IntroController } from './intro/introController.js';
import { PlayerController } from './game/playerController.js';
import { NpcController } from './game/npcController.js';
import { DialogueSystem } from './game/dialogueSystem.js';
import { TutorialManager } from './tutorial/tutorialManager.js';
import { MapManager } from './map/mapManager.js';

/**
 * 初始化所有模块
 */
function init() {
    // 主界面
    MainMenu.init();

    // 前情提要（监听开始事件）
    document.addEventListener('startIntro', () => {
        IntroController.start();
    });

    // 游戏场景
    DialogueSystem.init();
    NpcController.init();
    PlayerController.init();

    // UI 模块
    TutorialManager.init();
    MapManager.init();

    console.log('匠灵 · 所有模块初始化完成');
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
