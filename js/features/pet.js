// ========== 小团子 — 电子宠物 ==========

const PET_NAME = '小团子'; // 🐾 在这里给你的宠物起名字

let petState = {
    lastFed: null,
    lastPlayed: null,
    mood: 'normal',
    moodUntil: null,
    totalFed: 0,
    totalPlayed: 0,
    activeDays: []
};

const PET_STORAGE_KEY = 'pet_data';

async function loadPetData() {
    if (typeof localforage === 'undefined') return;
    const saved = await localforage.getItem(PET_STORAGE_KEY);
    if (saved && typeof saved === 'object') {
        petState = { ...petState, ...saved };
    }
}

async function savePetData() {
    if (typeof localforage !== 'undefined') {
        await localforage.setItem(PET_STORAGE_KEY, petState);
    }
}

function recordTodayInteraction() {
    const today = new Date().toISOString().slice(0, 10);
    if (!petState.activeDays.includes(today)) {
        petState.activeDays.push(today);
    }
}

function getPetMood() {
    const now = Date.now();
    if (petState.mood === 'happy' && petState.moodUntil && now < petState.moodUntil) {
        return 'happy';
    }
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 8) {
        return 'sleeping';
    }
    const lastInteraction = Math.max(petState.lastFed || 0, petState.lastPlayed || 0);
    if (lastInteraction && (now - lastInteraction) > 6 * 60 * 60 * 1000) {
        return 'lonely';
    }
    if (petState.lastFed && (now - petState.lastFed) > 3 * 60 * 60 * 1000) {
        return 'hungry';
    }
    return 'normal';
}

function updatePetAppearance() {
    const petEl = document.getElementById('pet-emoji');
    const petBubble = document.getElementById('pet-bubble');
    const petBody = document.getElementById('pet-body');
    if (!petEl || !petBody) return;

    const mood = getPetMood();
    petState.mood = mood;

    const moodConfig = {
        happy:   { emoji: '😊', anim: 'pet-bounce', bubble: '', className: 'pet-happy' },
        normal:  { emoji: '🙂', anim: '', bubble: '', className: '' },
        hungry:  { emoji: '😕', anim: '', bubble: '肚子饿了…', className: 'pet-hungry' },
        lonely:  { emoji: '🥺', anim: 'pet-shrink', bubble: '好想你…', className: 'pet-lonely' },
        sleeping:{ emoji: '💤', anim: 'pet-sleep', bubble: '', className: 'pet-sleeping' }
    };

    const config = moodConfig[mood] || moodConfig.normal;

    petEl.textContent = config.emoji;
    petBody.className = 'pet-body ' + config.className;
    petBody.classList.remove('pet-bounce', 'pet-shrink', 'pet-sleep');
    if (config.anim) petBody.classList.add(config.anim);

    if (petBubble) {
        petBubble.textContent = config.bubble;
        petBubble.style.display = config.bubble ? 'block' : 'none';
    }
}

window.feedPet = async function() {
    petState.lastFed = Date.now();
    petState.totalFed++;
    petState.mood = 'happy';
    petState.moodUntil = Date.now() + 30 * 60 * 1000;
    recordTodayInteraction();
    await savePetData();
    updatePetAppearance();
    showPetHeart('🍞');
    if (typeof addMessage === 'function') {
        addMessage({
            id: Date.now(),
            text: '🍞 你喂了' + PET_NAME + '，它很开心~',
            timestamp: new Date(),
            type: 'system',
            sender: 'system'
        });
    }
};

window.playWithPet = async function() {
    petState.lastPlayed = Date.now();
    petState.totalPlayed++;
    petState.mood = 'happy';
    petState.moodUntil = Date.now() + 30 * 60 * 1000;
    recordTodayInteraction();
    await savePetData();
    updatePetAppearance();
    showPetHeart('✨');
    if (typeof addMessage === 'function') {
        addMessage({
            id: Date.now(),
            text: '🎾 你跟' + PET_NAME + '玩了一会儿，它好开心~',
            timestamp: new Date(),
            type: 'system',
            sender: 'system'
        });
    }
};

function showPetHeart(icon) {
    const heart = document.createElement('div');
    heart.className = 'pet-heart';
    heart.textContent = icon;
    document.body.appendChild(heart);
    const petEl = document.getElementById('pet-body');
    if (petEl) {
        const rect = petEl.getBoundingClientRect();
        heart.style.left = rect.left + rect.width / 2 - 15 + 'px';
        heart.style.top = rect.top - 10 + 'px';
    } else {
        heart.style.right = '80px';
        heart.style.top = '120px';
    }
    setTimeout(() => heart.remove(), 1200);
}

function initPetDOM() {
    if (document.getElementById('pet-container')) return;
    const petHTML = `
        <div id="pet-container" style="
            position:fixed; top:140px; right:12px; z-index:100;
            display:flex; flex-direction:column; align-items:center;
            gap:4px; cursor:pointer;
            user-select:none; -webkit-tap-highlight-color:transparent;
        " onclick="togglePetMenu()">
            <div id="pet-bubble" style="
                display:none;
                background:var(--secondary-bg); color:var(--text-primary);
                padding:5px 10px; border-radius:12px;
                font-size:11px; white-space:nowrap;
                box-shadow:0 2px 8px rgba(0,0,0,0.1);
                border:1px solid var(--border-color);
                position:absolute; top:-28px;
                animation:pet-bubble-in 0.3s ease;
            "></div>
            <div id="pet-body" class="pet-body" style="
                width:52px; height:52px; border-radius:50%;
                background:linear-gradient(135deg, #ffe0c0, #ffc8a0);
                display:flex; align-items:center; justify-content:center;
                box-shadow:0 3px 12px rgba(0,0,0,0.15);
                transition:transform 0.3s, box-shadow 0.3s;
            ">
                <span id="pet-emoji" style="font-size:28px;">🙂</span>
            </div>
        </div>
        <div id="pet-menu" style="
            display:none; position:fixed; top:200px; right:12px; z-index:101;
            background:var(--secondary-bg); border-radius:14px;
            padding:8px; border:1px solid var(--border-color);
            box-shadow:0 4px 16px rgba(0,0,0,0.12);
            flex-direction:column; gap:4px;
        ">
            <button onclick="feedPet();togglePetMenu();" style="
                padding:8px 14px; border:none; border-radius:10px;
                background:var(--primary-bg); color:var(--text-primary);
                cursor:pointer; font-size:13px; font-family:var(--font-family);
                display:flex; align-items:center; gap:6px; white-space:nowrap;
            ">🍞 喂食</button>
            <button onclick="playWithPet();togglePetMenu();" style="
                padding:8px 14px; border:none; border-radius:10px;
                background:var(--primary-bg); color:var(--text-primary);
                cursor:pointer; font-size:13px; font-family:var(--font-family);
                display:flex; align-items:center; gap:6px; white-space:nowrap;
            ">🎾 玩耍</button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', petHTML);
}

window.togglePetMenu = function() {
    const menu = document.getElementById('pet-menu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
};

document.addEventListener('click', function(e) {
    const menu = document.getElementById('pet-menu');
    const container = document.getElementById('pet-container');
    if (menu && container && !container.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

window.openPetPanel = async function() {
    await loadPetData();
    const advModal = document.getElementById('advanced-modal');
    if (advModal && typeof hideModal === 'function') hideModal(advModal);
    const today = new Date().toISOString().slice(0, 10);
    const totalDays = petState.activeDays.length;
    const fedToday = petState.lastFed && new Date(petState.lastFed).toISOString().slice(0, 10) === today;
    const playedToday = petState.lastPlayed && new Date(petState.lastPlayed).toISOString().slice(0, 10) === today;
    const mood = getPetMood();
    const moodNames = { happy:'开心', normal:'普通', hungry:'饿了', lonely:'孤独', sleeping:'睡着了' };
    let panel = document.getElementById('pet-info-modal');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'pet-info-modal';
        panel.className = 'modal';
        panel.style.display = 'none';
        document.body.appendChild(panel);
    }
    panel.innerHTML = `
        <div class="modal-content" style="max-width:360px;text-align:center;">
            <div class="modal-title">
                <span style="font-size:40px;display:block;margin-bottom:4px;">🙂</span>
                <span>${PET_NAME}</span>
            </div>
            <div style="font-size:24px;margin-bottom:8px;">${moodNames[mood] || '普通'}</div>
            <div style="display:flex;justify-content:center;gap:20px;margin:12px 0;font-size:13px;color:var(--text-secondary);">
                <div>🍞 累计喂食<br><strong style="color:var(--text-primary);">${petState.totalFed}</strong></div>
                <div>🎾 累计玩耍<br><strong style="color:var(--text-primary);">${petState.totalPlayed}</strong></div>
                <div>📅 互动天数<br><strong style="color:var(--text-primary);">${totalDays}</strong></div>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">
                今天：${fedToday ? '✅ 已喂食' : '— 还没喂食'} · ${playedToday ? '✅ 已玩耍' : '— 还没玩耍'}
            </div>
            <div class="modal-buttons" style="margin-top:16px;justify-content:center;">
                <button class="modal-btn modal-btn-secondary" onclick="hideModal(document.getElementById('pet-info-modal'))">关闭</button>
            </div>
        </div>
    `;
    if (typeof showModal === 'function') showModal(panel);
};

setInterval(updatePetAppearance, 60000);

async function initPet() {
    initPetDOM();
    await loadPetData();
    updatePetAppearance();
    const entryName = document.getElementById('pet-entry-name');
    if (entryName) entryName.textContent = '🐣 ' + PET_NAME;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPet);
} else {
    initPet();
}