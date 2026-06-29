// ============================================
// РЕНДЕР И ЛОГИКА
// ============================================

const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const searchWrapper = document.getElementById('searchWrapper');
const navButtons = document.querySelectorAll('.nav-btn');
const themeToggle = document.getElementById('themeToggle');

let currentProduct = null;

// ---------- ТЕМА ----------
function initTheme() {
    const saved = localStorage.getItem('theme');
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateMetaTheme(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateMetaTheme(newTheme);
}

function updateMetaTheme(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.content = theme === 'light' ? '#ffffff' : '#141414';
    }
}

themeToggle.addEventListener('click', toggleTheme);
initTheme();

// ---------- ПРОВЕРКА СРОКА (7 ДНЕЙ) ----------
function isExpired(createdAt) {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays > 7;
}

// ---------- СОРТИРОВКА: ТОП ПЕРВЫМИ ----------
function getSortedProducts() {
    return [...PRODUCTS]
        .filter(p => !isExpired(p.createdAt)) // скрываем старые
        .sort((a, b) => {
            if (a.promoted && !b.promoted) return -1;
            if (!a.promoted && b.promoted) return 1;
            return 0;
        });
}

function getActiveAds() {
    return (ADS || []).filter(ad => !isExpired(ad.createdAt));
}

// ---------- РЕНДЕР КАРТОЧЕК ----------
function renderProducts(filter = '') {
    const sorted = getSortedProducts();
    const activeAds = getActiveAds();
    const q = filter.trim().toLowerCase();
    
    const filtered = q
        ? sorted.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q))
        : sorted;

    productsGrid.innerHTML = '';
    
    if (filtered.length === 0 && activeAds.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    // Реклама в начале (если нет поиска)
    if (!q) {
        activeAds.forEach(ad => {
            const card = document.createElement('div');
            card.className = 'ad-card';
            card.innerHTML = `
                <div class="ad-badge">Реклама</div>
                <img class="thumb" src="${ad.banner}" alt="Реклама" loading="eager">
            `;
            card.addEventListener('click', () => {
                window.open(ad.link, '_blank', 'noopener');
            });
            productsGrid.appendChild(card);
        });
    }

    // Товары
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        // Убрал блок с ТОП бейджем, теперь чисто фото и инфо
        card.innerHTML = `
            <img class="thumb" src="${p.banner}" alt="${escapeHtml(p.title)}" loading="eager">
            <div class="info">
                <div class="title">${escapeHtml(p.title)}</div>
                <div class="price-row">
                    <span class="price">${p.price} ₽</span>
                    ${p.oldPrice ? `<span class="old-price">${p.oldPrice} ₽</span>` : ''}
                </div>
            </div>
        `;
        card.addEventListener('click', () => openProduct(p));
        productsGrid.appendChild(card);
    });
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

// ---------- ПОИСК ----------
searchInput.addEventListener('input', e => renderProducts(e.target.value));

// ---------- STICKY ПОИСК ----------
window.addEventListener('scroll', () => {
    if (window.scrollY > 10) searchWrapper.classList.add('scrolled');
    else searchWrapper.classList.remove('scrolled');
});

// ---------- МОДАЛКИ ----------
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => {
        if (e.target === m || e.target.hasAttribute('data-close')) {
            closeModal(m);
            if (m.id === 'placeModal' || m.id === 'promoModal') {
                setActiveTab('home');
            }
        }
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.open');
        openModals.forEach(m => {
            closeModal(m);
            if (m.id === 'placeModal' || m.id === 'promoModal') {
                setActiveTab('home');
            }
        });
    }
});

function setActiveTab(tabName) {
    navButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabName);
    });
}

// ---------- ОТКРЫТИЕ ТОВАРА ----------
function openProduct(p) {
    currentProduct = p;
    document.getElementById('modalBanner').src = p.banner;
    document.getElementById('modalTitle').textContent = p.title;
    document.getElementById('modalPrice').textContent = p.price + ' ₽';
    const oldEl = document.getElementById('modalOldPrice');
    if (p.oldPrice) {
        oldEl.textContent = p.oldPrice + ' ₽';
        oldEl.style.display = 'inline';
    } else {
        oldEl.style.display = 'none';
    }
    document.getElementById('modalDescription').textContent = p.description;

    const gallery = document.getElementById('modalGallery');
    gallery.innerHTML = '';
    (p.images || []).forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'eager';
        img.addEventListener('click', () => window.open(src, '_blank'));
        gallery.appendChild(img);
    });

    openModal('productModal');
}

// ---------- РЕНДЕР КОНТАКТОВ (БЕЗ ИКОНОК) ----------
function renderContacts(containerId, contacts) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const phone = contacts.phone ? String(contacts.phone).trim() : '';
    const tg = contacts.telegram ? String(contacts.telegram).trim().replace(/^@+/, '') : '';
    const vk = contacts.vk ? String(contacts.vk).trim() : '';
    const max = contacts.max ? String(contacts.max).trim() : '';

    const items = [];

    if (phone) {
        const cleanPhone = phone.replace(/[^\d+]/g, '+7 904 958-42-82');
        items.push({
            label: ' Позвонить',
            value: phone,
            href: `tel:${cleanPhone}`,
            local: true
        });
    }
    if (vk) {
        const vkHref = vk.startsWith('http') ? vk : `https://vk.com/theme_67`;
        items.push({
            label: ' ВКонтакте',
            value: vk,
            href: vkHref
        });
    }


    items.forEach(it => {
        const a = document.createElement('a');
        a.className = 'contact-item';
        a.href = it.href;
        a.rel = 'noopener';
        if (!it.local) a.target = '_blank';
        a.innerHTML = `
            <div>
                <div class="label">${it.label}</div>
                <div class="value">${escapeHtml(it.value)}</div>
            </div>
        `;
        container.appendChild(a);
    });
}

// ---------- КНОПКА "КУПИТЬ" ----------
document.getElementById('buyBtn').addEventListener('click', () => {
    if (!currentProduct) return;
    renderContacts('sellerContacts', currentProduct.contacts);
    closeModal(document.getElementById('productModal'));
    setTimeout(() => openModal('contactsModal'), 200);
});

// ---------- НИЖНЕЕ МЕНЮ ----------
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setActiveTab(btn.dataset.tab);
        const tab = btn.dataset.tab;
        if (tab === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (tab === 'place') {
            renderContacts('ownerContacts', OWNER_CONTACTS);
            openModal('placeModal');
        }
    });
});

// ---------- ПРОДВИЖЕНИЕ ----------
document.getElementById('promoBtn').addEventListener('click', () => {
    renderContacts('promoContacts', OWNER_CONTACTS);
    closeModal(document.getElementById('placeModal'));
    setTimeout(() => openModal('promoModal'), 200);
});

// ---------- КНОПКА ИНФОРМАЦИИ ----------
document.getElementById('infoBtn').addEventListener('click', () => {
    openModal('infoModal');
});

// ---------- СТАРТ ----------
renderProducts();