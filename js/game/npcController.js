// ========== NPC 交互控制器 ==========

import { gameState } from '../common/gameState.js';
import { DialogueSystem } from './dialogueSystem.js';

export const NpcController = {
    npcPrompt: null,

    /**
     * 初始化 NPC 控制器
     */
    init() {
        this.npcPrompt = document.getElementById('npc-prompt');

        // 监听玩家移动事件，检查距离
        document.addEventListener('playerMoved', () => this.checkProximity());

        // 交互按键（使用可配置按键绑定）
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (gameState.isPaused || gameState.dialogueActive) return;

            if (gameState.keyBindings.interact.keys.includes(key)) {
                this.tryInteract();
            }
        });

        console.log('NpcController: 初始化完成');
    },

    /**
     * 检查玩家与 NPC 的距离
     */
    checkProximity() {
        const npcPosPercent = 15 + 200 / window.innerWidth * 100;
        const distance = Math.abs(gameState.playerPosPercent - npcPosPercent);

        if (distance < 6 && !gameState.hasMap) {
            this.npcPrompt.style.display = 'block';
        } else {
            this.npcPrompt.style.display = 'none';
        }
    },

    /**
     * 尝试交互
     */
    tryInteract() {
        if (this.npcPrompt.style.display === 'block' && !gameState.hasMap) {
            DialogueSystem.start();
        }
    }
};
