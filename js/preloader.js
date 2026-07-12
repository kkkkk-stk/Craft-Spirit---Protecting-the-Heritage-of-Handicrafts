// ========== 资源预加载器（分阶段加载） ==========
// 阶段1 critical: 主菜单必需资源，开局立即加载（~100KB，秒加载）
// 阶段2 game:     游戏场景资源，进入主菜单后后台静默加载（~2MB）
// 阶段3 lazy:     文物/拼图等，按需加载
// 视频体积过大（~160MB），保持按需加载，不在此预加载

// ===== 阶段1：主菜单 / UI =====
const CRITICAL_LIST = [
    'assets/images/background/main-menu-bg.webp',
    'assets/images/ui/bamboo-panel.webp',
    'assets/images/ui/slot-bg.webp',
    'assets/images/ui/square-panel.webp',
    'assets/images/ui/delete-icon-clean.webp',
];

// ===== 阶段2：游戏场景（角色 + 第一关背景 + 行走帧） =====
const GAME_LIST = [
    // 角色
    'assets/images/protagonist_stand/character1.webp',
    'assets/images/image_npc/old_man_sprite.webp',
    'assets/images/image_npc/old_man_portrait.webp',
    'assets/images/image_npc/granny_lan_sprite.webp',
    'assets/images/image_npc/granny_lan_portrait.webp',
    // 第一关场景
    'assets/images/scences/level1/bg.webp',
    'assets/images/scences/level1/ground1.webp',
    'assets/images/scences/level1/gate_structure.webp',
    'assets/images/scences/level1/fg_tree.webp',
    'assets/images/scences/level1/fg_fence.webp',
    'assets/images/scences/level1/fg_bush.webp',
    'assets/images/scences/level1/fg_lantern.webp',
    'assets/images/scences/level1/stage.webp',
    'assets/images/scences/level1/hall.webp',
    'assets/images/scences/level1/ethnic embroidery house.webp',
    'assets/images/scences/level1/houses/house_01.webp',
    'assets/images/scences/level1/houses/house_03.webp',
    'assets/images/scences/level1/traditional Chinese village stage.webp',
];

// 主角行走动画帧 00~29
for (let i = 0; i < 30; i++) {
    GAME_LIST.push(
        `assets/images/protagonist_move/protagonist_move_${String(i).padStart(2, '0')}_clean.webp`
    );
}

// ===== 阶段3：按需加载 =====
const LAZY_MAP = {
    backpack: [
        'assets/images/Cultural relic/relic_embroidery_frame.webp',
        'assets/images/Cultural relic/relic_thread_bundle.webp',
        'assets/images/Cultural relic/relic_pattern_manuscript.webp',
        'assets/images/Cultural relic/relic_plant_dye_pack.webp',
        'assets/images/Cultural relic/relic_phoenix_crown.webp',
    ],
    hexPuzzle: [
        'assets/images/game/last1_square.webp',
    ],
};

// 加载提示文案（轮换显示）
const HINTS = [
    '正在唤醒沉睡的匠灵...',
    '正在编织畲族彩线...',
    '正在研磨天然染料...',
    '正在复原古老图谱...',
    '正在点亮传承之路...',
];

/**
 * 预加载单张图片
 */
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ src, ok: true });
        img.onerror = () => resolve({ src, ok: false });
        img.src = src;
    });
}

/**
 * 并发加载资源列表（限制并发数）
 */
async function loadList(list, onProgress) {
    const total = list.length;
    let loaded = 0;
    const failed = [];
    const CONCURRENCY = 8;
    let hintIndex = 0;

    const updateProgress = () => {
        const hint = HINTS[hintIndex % HINTS.length];
        if (loaded % Math.ceil(total / HINTS.length) === 0 && loaded > 0) {
            hintIndex++;
        }
        if (onProgress) onProgress(loaded, total, hint);
    };

    updateProgress();

    for (let i = 0; i < list.length; i += CONCURRENCY) {
        const batch = list.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(loadImage));
        for (const r of results) {
            loaded++;
            if (!r.ok) failed.push(r.src);
        }
        updateProgress();
    }

    return { loaded, failed };
}

// 阶段2状态追踪
let _gameReady = false;
let _gamePromise = null;

export const Preloader = {
    /** 阶段1：加载主菜单必需资源（阻塞，带进度回调） */
    loadCritical(onProgress) {
        return loadList(CRITICAL_LIST, onProgress);
    },

    /** 阶段2：后台静默加载游戏场景资源（不阻塞，可重复调用安全） */
    loadGame() {
        if (_gamePromise) return _gamePromise;
        _gamePromise = loadList(GAME_LIST).then(({ failed }) => {
            _gameReady = true;
            if (failed.length) {
                console.warn('游戏场景资源加载失败（' + failed.length + ' 项）:', failed);
            }
        });
        return _gamePromise;
    },

    /** 游戏场景资源是否已加载完毕 */
    isGameReady() {
        return _gameReady;
    },

    /** 等待游戏场景资源加载完毕（返回 Promise） */
    waitForGame() {
        return _gamePromise || Promise.resolve();
    },

    /** 阶段3：按需加载指定分组的资源 */
    loadLazy(key) {
        const list = LAZY_MAP[key] || [];
        return loadList(list);
    },
};
