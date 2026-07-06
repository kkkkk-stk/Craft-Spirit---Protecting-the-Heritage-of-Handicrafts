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

        // E 键交互
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'e' && !gameState.dialogueActive) {
                this.tryInteract();
            }
        });
    },

    /**
     * 检查玩家与 NPC 的距离
     */
    checkProximity() {
        const npcPosPercent = 15 + 350 / window.innerWidth * 100;
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
