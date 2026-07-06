// ========== 全局游戏状态 ==========
// 所有模块通过此对象共享游戏状态，避免全局变量污染

export const gameState = {
    // 玩家状态
    playerX: 0,
    playerPosPercent: 15,

    // 进度
    hasMap: false,
    tutorialShown: false,
    dialogueActive: false,
    currentDialogueIndex: 0,

    // 暂停状态
    isPaused: false,

    // 设置面板来源（关闭设置后返回的位置：'main-menu' | 'pause' | null）
    settingsSource: null,

    // 游戏配置
    playerSpeed: 5,

    // 按键绑定（默认值，可通过设置面板修改）
    keyBindings: {
        moveLeft:  { keys: ['arrowleft', 'a'], label: '向左移动' },
        moveRight: { keys: ['arrowright', 'd'], label: '向右移动' },
        interact:  { keys: ['e'],             label: '交互' },
        openMap:   { keys: ['m'],             label: '打开地图' },
        pause:     { keys: ['escape'],        label: '暂停' }
    },

    /**
     * 检查某个按键是否匹配指定操作
     * @param {string} action - 操作名称（如 'moveLeft'）
     * @param {string} key - 按下的键（e.key.toLowerCase()）
     * @returns {boolean}
     */
    isActionKey(action, key) {
        const binding = this.keyBindings[action];
        if (!binding) return false;
        return binding.keys.includes(key);
    }
};
