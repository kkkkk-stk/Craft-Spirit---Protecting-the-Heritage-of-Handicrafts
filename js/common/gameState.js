// ========== 全局游戏状态 ==========
// 所有模块通过此对象共享游戏状态，避免全局变量污染

// 章节名称映射
const CHAPTER_NAMES = {
    'prologue': '序章 · 新手村',
    'level1':   '第一章 · 丽水畲寨',
    'level2':   '第二章 · 东阳古村',
    'level3':   '第三章 · 乐清渔港'
};

export const gameState = {
    // 玩家状态
    playerX: 0,
    playerPosPercent: 15,
    playerDirection: 'right',  // 'left' | 'right'
    playerMoving: false,

    // 进度
    hasMap: false,
    tutorialShown: false,
    dialogueActive: false,
    currentDialogueIndex: 0,

    // 背包
    inventory: ['jade_token'],   // 初始拥有匠人玉牌

    // 章节追踪
    currentChapter: 'prologue',  // prologue | level1 | level2 | level3

    // 暂停状态
    isPaused: false,

    // 活跃存档槽位（-1 表示未选择）
    activeSlotIndex: -1,

    // 设置面板来源
    settingsSource: null,

    // 游戏配置
    playerSpeed: 16,

    // 按键绑定
    keyBindings: {
        moveLeft:  { keys: ['arrowleft', 'a'], label: '向左移动' },
        moveRight: { keys: ['arrowright', 'd'], label: '向右移动' },
        interact:  { keys: ['e'],             label: '交互' },
        openMap:   { keys: ['m'],             label: '打开地图' },
        openBackpack: { keys: ['b'],          label: '打开背包' },
        pause:     { keys: ['escape'],        label: '暂停' }
    },

    // ========== 辅助方法 ==========

    /**
     * 获取章节显示名称
     */
    getChapterName() {
        return CHAPTER_NAMES[this.currentChapter] || this.currentChapter;
    },

    /**
     * 检查按键是否匹配指定操作
     */
    isActionKey(action, key) {
        const binding = this.keyBindings[action];
        if (!binding) return false;
        return binding.keys.includes(key);
    },

    /**
     * 获取可序列化的存档快照
     */
    getSaveSnapshot() {
        return {
            playerPosPercent: this.playerPosPercent,
            playerDirection: this.playerDirection,
            inventory: [...this.inventory],
            hasMap: this.hasMap,
            tutorialShown: this.tutorialShown,
            currentChapter: this.currentChapter,
            currentDialogueIndex: this.currentDialogueIndex,
            playerSpeed: this.playerSpeed
        };
    },

    /**
     * 从存档快照恢复状态
     */
    loadSnapshot(snap) {
        if (!snap) return;
        this.playerPosPercent = snap.playerPosPercent ?? 15;
        this.playerDirection = snap.playerDirection ?? 'right';
        if (snap.inventory) this.inventory = [...snap.inventory];
        this.hasMap = snap.hasMap ?? false;
        this.tutorialShown = snap.tutorialShown ?? false;
        this.currentChapter = snap.currentChapter ?? 'prologue';
        this.currentDialogueIndex = snap.currentDialogueIndex ?? 0;
        this.playerSpeed = snap.playerSpeed ?? 5;
        this.isPaused = false;
        this.dialogueActive = false;
    }
};
