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

    // ========== 第一关进度 ==========
    level1: {
        entered: false,
        openingDone: false,
        currentScene: 'gate',        // 当前所在场景
        // 文物收集（1~5）
        artifacts: { 1: false, 2: false, 3: false, 4: false, 5: false },
        // 匠人记忆观看（1~4）
        memories:  { 1: false, 2: false, 3: false, 4: false },
        // 解谜完成
        puzzles: {
            loom: false,        // 织布机走线
            dyeCraft: false,    // 畲山采药·打靛制色
            dyeThread: false,   // 浸染丝线·晾晒
            treeRing: false,    // 古树年轮
            totem: false        // 石壁图腾拼图（终极）
        },
        // 当前区域
        currentArea: 'house',  // house | yard | hall
        completed: false,      // 关卡通关

        // ===== 线性任务阶段 =====
        // 0 = 寻找蓝婆婆中（禁止其他交互）
        // 1 = 对话1完成，任务1已下达（采药制色）
        // 2 = 采药制色完成，材料入背包，待找婆婆触发CG1
        // 3 = CG1+对话2完成，任务2已下达（染线晒线）
        // 4 = 染线晒线完成，五彩线入背包，待找婆婆触发CG2
        // 5 = CG2+对话3完成，任务3已下达（老宅学缝制）
        // 6 = 老宅缝制完成，第一块布入背包，待找婆婆触发CG3+对话4
        // 7 = CG3+对话4完成，终极拼图已解锁
        // 8 = 拼图完成，通关
        taskPhase: 0
    },

    // 暂停状态
    isPaused: false,

    // 场景转场中（禁止移动与相机更新，避免转场窗口内错误计算）
    transitioning: false,

    // 活跃存档槽位（-1 表示未选择）
    activeSlotIndex: -1,

    // 设置面板来源
    settingsSource: null,

    // 游戏配置
    playerSpeed: 10,

    // 音频
    bgmVolume: 0.4,
    sfxVolume: 0.5,
    bgmAudio: null,
    sfxAudio: null,

    // 画面
    fullscreen: false,

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
            playerSpeed: this.playerSpeed,
            bgmVolume: this.bgmVolume,
            sfxVolume: this.sfxVolume,
            fullscreen: this.fullscreen,
            level1: JSON.parse(JSON.stringify(this.level1))
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
        this.playerSpeed = snap.playerSpeed ?? 8;
        this.bgmVolume = snap.bgmVolume ?? 0.4;
        this.sfxVolume = snap.sfxVolume ?? 0.5;
        this.fullscreen = snap.fullscreen ?? false;
        this.isPaused = false;
        this.dialogueActive = false;
        if (snap.level1) {
            this.level1 = Object.assign(this.level1, snap.level1);
        }
    }
};
