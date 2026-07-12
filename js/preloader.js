// ========== 资源预加载器 ==========
// 开局加载所有图片资源，视频/音频保持按需加载

/**
 * 需要预加载的图片资源清单
 * 来源：CSS background、HTML img、JS 动态引用
 * 视频体积过大（~160MB），保持按需加载，不在此预加载
 */
const IMAGE_LIST = [
    // ===== 主菜单 / UI =====
    'assets/images/background/main-menu-bg.png',
    'assets/images/ui/bamboo-panel.png',
    'assets/images/ui/slot-bg.png',
    'assets/images/ui/square-panel.png',
    'assets/images/ui/delete-icon-clean.png',

    // ===== 角色 =====
    'assets/images/protagonist_stand/character1.png',
    'assets/images/image_npc/old_man_sprite.png',
    'assets/images/image_npc/old_man_portrait.png',
    'assets/images/image_npc/granny_lan_sprite.png',
    'assets/images/image_npc/granny_lan_portrait.png',

    // ===== 第一关场景背景 =====
    'assets/images/scences/level1/bg.png',
    'assets/images/scences/level1/ground1.png',
    'assets/images/scences/level1/gate_structure.png',
    'assets/images/scences/level1/fg_tree.png',
    'assets/images/scences/level1/fg_fence.png',
    'assets/images/scences/level1/fg_bush.png',
    'assets/images/scences/level1/fg_lantern.png',
    'assets/images/scences/level1/stage.png',
    'assets/images/scences/level1/hall.png',
    'assets/images/scences/level1/ethnic embroidery house.png',
    'assets/images/scences/level1/houses/house_01.png',
    'assets/images/scences/level1/houses/house_03.png',
    'assets/images/scences/level1/traditional Chinese village stage.png',

    // ===== 文物（背包） =====
    'assets/images/Cultural relic/relic_embroidery_frame.png',
    'assets/images/Cultural relic/relic_thread_bundle.png',
    'assets/images/Cultural relic/relic_pattern_manuscript.png',
    'assets/images/Cultural relic/relic_plant_dye_pack.png',
    'assets/images/Cultural relic/relic_phoenix_crown.png',

    // ===== 六边拼图 =====
    'assets/images/game/last1_square.png',
];

// 主角行走动画帧 00~29
for (let i = 0; i < 30; i++) {
    IMAGE_LIST.push(
        `assets/images/protagonist_move/protagonist_move_${String(i).padStart(2, '0')}_clean.png`
    );
}

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
        // onload / onerror 都 resolve，避免单个资源失败阻塞整体
        img.onload = () => resolve({ src, ok: true });
        img.onerror = () => resolve({ src, ok: false });
        img.src = src;
    });
}

/**
 * 并发加载所有资源（限制并发数，避免浏览器连接数耗尽）
 * @param {(loaded:number, total:number, hint:string)=>void} onProgress 进度回调
 * @returns {Promise<{loaded:number, failed:number[]}>}
 */
async function loadAll(onProgress) {
    const total = IMAGE_LIST.length;
    let loaded = 0;
    const failed = [];
    const CONCURRENCY = 8;
    let hintIndex = 0;

    const updateProgress = () => {
        const hint = HINTS[hintIndex % HINTS.length];
        // 每加载 ~20% 切换一次提示
        if (loaded % Math.ceil(total / HINTS.length) === 0 && loaded > 0) {
            hintIndex++;
        }
        if (onProgress) onProgress(loaded, total, hint);
    };

    updateProgress();

    // 分批并发
    for (let i = 0; i < IMAGE_LIST.length; i += CONCURRENCY) {
        const batch = IMAGE_LIST.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(loadImage));
        for (const r of results) {
            loaded++;
            if (!r.ok) failed.push(r.src);
        }
        updateProgress();
    }

    return { loaded, failed };
}

export const Preloader = {
    IMAGE_LIST,
    loadAll,
};
