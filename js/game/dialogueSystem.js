// ========== 对话系统 ==========

import { gameState } from '../common/gameState.js';

// 对话数据（后续可扩展为外部 JSON 配置）
const dialogues = [
    {
        speaker: "???",
        text: "这位旅人，你看起来像是远道而来..."
    },
    {
        speaker: "???",
        text: "我是这里的守村人，也是这片土地的引路人。"
    },
    {
        speaker: "???",
        text: "浙江的山水之间，藏着无数匠人的心血与记忆。"
    },
    {
        speaker: "???",
        text: "畲族刺绣的针线、东阳木雕的刻刀、乐清龙船灯的纸花...每一门手艺，都有一位匠灵守护。"
    },
    {
        speaker: "???",
        text: "但如今黑雾笼罩，匠灵被封印，这些珍贵的非遗技艺正面临失传的危险。"
    },
    {
        speaker: "???",
        text: "你手中那块玉牌...是寻访者的信物吧？"
    },
    {
        speaker: "???",
        text: "...很好，看来你正是我们要找的人。"
    },
    {
        speaker: "老匠人",
        text: "我是这片土地的守望者。这卷地图送给你，它会指引你找到三处被黑雾笼罩的古村落——\n\n丽水畲寨、东阳木雕古村、乐清渔港。"
    },
    {
        speaker: "老匠人",
        text: "去吧，唤醒沉睡的匠灵，让浙江的手艺重新绽放光芒！\n\n按 M 键可以查看地图。"
    },
    {
        speaker: "",
        text: "[获得了 浙江匠灵地图]"
    }
];

export const DialogueSystem = {
    dialogueBox: null,
    speakerEl: null,
    textEl: null,
    portraitEl: null,
    _currentDialogues: null,
    _onEnd: null,

    /**
     * 初始化对话系统
     */
    init() {
        this.dialogueBox = document.getElementById('dialogue-box');
        this.speakerEl = document.getElementById('dialogue-speaker');
        this.textEl = document.getElementById('dialogue-text');
        this.portraitEl = document.getElementById('dialogue-portrait');

        // 点击对话框继续
        this.dialogueBox.addEventListener('click', () => {
            if (!gameState.dialogueActive) return;
            this.next();
        });
    },

    /**
     * 开始对话（默认 NPC 对话）
     */
    start() {
        if (gameState.dialogueActive) return;
        this._currentDialogues = dialogues;
        gameState.dialogueActive = true;
        gameState.currentDialogueIndex = 0;
        this.showContent();
    },

    /**
     * 开始自定义对话
     * @param {Array} customDialogues - [{speaker, text}, ...]
     * @param {Function} onEnd - 对话结束回调
     */
    startCustom(customDialogues, onEnd) {
        if (gameState.dialogueActive) return;
        this._currentDialogues = customDialogues;
        this._onEnd = onEnd || null;
        gameState.dialogueActive = true;
        gameState.currentDialogueIndex = 0;
        this.showContent();
    },

    /**
     * 显示当前对话内容
     */
    showContent() {
        const list = this._currentDialogues || dialogues;
        if (gameState.currentDialogueIndex >= list.length) {
            this.end();
            return;
        }

        const dialogue = list[gameState.currentDialogueIndex];
        this.speakerEl.textContent = dialogue.speaker || '旁白';
        this.textEl.innerHTML = dialogue.text.replace(/\n/g, '<br>');
        this.dialogueBox.style.display = 'block';

        // 更新对话立绘
        this._updatePortrait(dialogue.speaker);

        // 如果是获得地图
        if (dialogue.text.includes('获得')) {
            gameState.hasMap = true;
            if (!gameState.inventory.includes('map')) {
                gameState.inventory.push('map');
            }
        }
    },

    /**
     * 下一条对话
     */
    next() {
        gameState.currentDialogueIndex++;
        this.showContent();
    },

    /**
     * 更新对话立绘
     */
    _updatePortrait(speaker) {
        if (!this.portraitEl) return;
        const name = speaker?.trim();
        if (name === '老匠人') {
            this.portraitEl.style.backgroundImage = "url('assets/images/image_npc/old_man_portrait.png')";
            this.portraitEl.classList.add('visible');
        } else {
            this.portraitEl.classList.remove('visible');
            this.portraitEl.style.backgroundImage = '';
        }
    },

    /**
     * 结束对话
     */
    end() {
        this.dialogueBox.style.display = 'none';
        if (this.portraitEl) {
            this.portraitEl.classList.remove('visible');
            this.portraitEl.style.backgroundImage = '';
        }
        gameState.dialogueActive = false;
        if (this._onEnd) {
            const cb = this._onEnd;
            this._onEnd = null;
            cb();
        }
    }
};
