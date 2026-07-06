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

    // 游戏配置
    playerSpeed: 5
};
