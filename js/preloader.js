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

// ===== 视频资源（后台预加载，解决播放卡顿） =====
const VIDEO_LIST = [
    'assets/cg/1/1.mp4',       // [0] 开局加载（第1个播放：采药完成）
    'assets/cg/3/3.mp4',       // [1] 开局加载（第2个播放：拾取文物1）
    'assets/cg/2/2222222.mp4', // [2] 异步加载（第3个播放：布给蓝婆婆）
    'assets/cg/4/4.mp4',       // [3] 异步加载（第4个播放：进入拼图）
];

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
let _gameLoaded = 0;
let _gameTotal = 0;
let _gameProgressCb = null;

// 阶段3 lazy 缓存（避免重复加载）
const _lazyCache = {};

// 视频预加载状态
let _videoPromise = null;

/**
 * 加载单个视频（loadeddata 时 resolve）
 */
function preloadVideo(src) {
    return new Promise(resolve => {
        const v = document.createElement('video');
        v.preload = 'auto';
        v.muted = true;
        v.src = src;
        v.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(v);

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            v.remove();
            resolve();
        };

        v.addEventListener('loadeddata', finish);
        v.addEventListener('error', finish);
        // 超时保护（120秒，视频较大）
        setTimeout(finish, 120000);
    });
}

/**
 * 后台逐个预加载剩余视频（跳过前两个，已在开局加载）
 * 在游戏场景资源加载完后调用
 */
function preloadVideos() {
    if (_videoPromise) return _videoPromise;

    _videoPromise = (async () => {
        // 跳过前两个CG视频（已在开局加载阶段加载）
        for (let i = 2; i < VIDEO_LIST.length; i++) {
            await preloadVideo(VIDEO_LIST[i]);
        }
        console.log('Preloader: 剩余视频预加载完成');
    })();

    return _videoPromise;
}

export const Preloader = {
    /** 阶段1：加载主菜单资源 + 前两个CG视频（阻塞，带进度回调） */
    loadCritical(onProgress) {
        const totalSteps = CRITICAL_LIST.length + 2; // 图片 + 前两个CG视频
        return loadList(CRITICAL_LIST, (loaded, total, hint) => {
            if (onProgress) onProgress(loaded, totalSteps, hint);
        }).then(({ failed }) => {
            // 图片加载完，继续加载前两个CG视频
            if (onProgress) onProgress(CRITICAL_LIST.length, totalSteps, '正在预载记忆...');
            return preloadVideo(VIDEO_LIST[0]).then(() => {
                if (onProgress) onProgress(CRITICAL_LIST.length + 1, totalSteps, '正在预载记忆...');
                return preloadVideo(VIDEO_LIST[1]).then(() => {
                    if (onProgress) onProgress(totalSteps, totalSteps, '匠灵已唤醒');
                    return { loaded: totalSteps, failed };
                });
            });
        });
    },

    /** 阶段2：后台静默加载游戏场景资源（不阻塞，可重复调用安全） */
    loadGame(onProgress) {
        // 已在加载中：立即用当前进度回调一次，并注册后续进度回调
        if (_gamePromise) {
            if (onProgress) onProgress(_gameLoaded, _gameTotal || GAME_LIST.length);
            _gameProgressCb = onProgress;
            return _gamePromise;
        }
        _gameTotal = GAME_LIST.length;
        _gameProgressCb = onProgress;
        _gamePromise = loadList(GAME_LIST, (loaded, total) => {
            _gameLoaded = loaded;
            _gameTotal = total;
            if (_gameProgressCb) _gameProgressCb(loaded, total);
        }).then(({ failed }) => {
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

    /** 阶段3：按需加载指定分组的资源（带缓存，避免重复加载） */
    loadLazy(key) {
        if (_lazyCache[key]) return _lazyCache[key];
        const list = LAZY_MAP[key] || [];
        _lazyCache[key] = loadList(list);
        return _lazyCache[key];
    },

    /** 后台预加载视频（逐个加载，不阻塞） */
    preloadVideos,
};
