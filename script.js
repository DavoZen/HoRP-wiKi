class HoRPWiki {
    constructor() {
        this.repoOwner = 'DavoZen';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;

        this.pages = [];

        // UI preferences (persisted)
        // Корисні, реально працюючі налаштування
        this.preferences = {
            theme:         this.getPreference('theme', 'light'),        // тема
            fontFamily:    this.getPreference('fontFamily', 'system'),  // шрифт
            serifBody:     this.getPreference('serifBody', 'off'),      // засічки для статей
            layoutDensity: this.getPreference('layoutDensity', 'normal'),// щільність
            accentColor:   this.getPreference('accentColor', 'blue')    // акцентний колір
        };

        this.currentTheme = this.preferences.theme;

        this.init();
    }

    async init() {
        console.log('Ініціалізація HoRP-wiKi...');

        this.applyPreferences();
        this.setupTheme();
        this.setupEventListeners();
        await this.loadData();
        this.updateUI();

        console.log('HoRP-wiKi готовий до роботи');
    }

    // -----------------------------
    // Preferences & theme (cookies)
    // -----------------------------
    getPreference(key, fallback) {
        try {
            const fromStorage = localStorage.getItem(`wiki-pref-${key}`);
            if (fromStorage !== null) return fromStorage;
        } catch (e) {}

        const cookieMatch = document.cookie.match(new RegExp('(?:^|; )wiki_' + key + '=([^;]*)'));
        if (cookieMatch) {
            try { return decodeURIComponent(cookieMatch[1]); } catch (e) {}
        }
        return fallback;
    }

    setPreference(key, value) {
        this.preferences[key] = value;
        try {
            localStorage.setItem(`wiki-pref-${key}`, value);
        } catch (e) {}
        document.cookie = `wiki_${key}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 365}`;
    }

    applyPreferences() {
        // Theme
        document.documentElement.setAttribute('data-theme', this.preferences.theme);

        // Тема
        document.documentElement.setAttribute('data-theme', this.preferences.theme);

        // Шрифт (глобальний)
        document.body.classList.toggle('wiki-font-system', this.preferences.fontFamily === 'system');
        document.body.classList.toggle('wiki-font-modern', this.preferences.fontFamily === 'modern');
        document.body.classList.toggle('wiki-font-clean',  this.preferences.fontFamily === 'clean');

        // Засічки тільки для контенту статей
        document.body.classList.toggle('wiki-serif-body', this.preferences.serifBody === 'on');

        // Щільність карток/списків
        document.body.classList.toggle('wiki-density-compact', this.preferences.layoutDensity === 'compact');
        document.body.classList.toggle('wiki-density-comfort', this.preferences.layoutDensity === 'comfort');

        // Акцентний колір (використовується в CSS через data-accent)
        document.body.setAttribute('data-accent', this.preferences.accentColor);
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });
    }

    setupEventListeners() {
        // Перемикачі теми
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.currentTheme = theme;
                this.setPreference('theme', theme);
                this.setupTheme();
            });
        });

        // Панель налаштувань вигляду (відкриття)
        const openSettingsBtn = document.getElementById('openSettingsBtn');
        if (openSettingsBtn) {
            openSettingsBtn.addEventListener('click', () => {
                this.openAppearancePanel();
            });
        }

        // Навігація
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);

                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Пошук
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
            // Clear highlights when search is cleared
            if (!e.target.value.trim()) {
                this.clearTreeHighlights();
            }
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    }

    // Завантаження даних з GitHub
    async loadData() {
        console.log('Завантаження даних з GitHub...');
        
        try {
            // Спроба завантажити з кешу
            if (this.loadFromCache()) {
                console.log('Дані завантажено з кешу');
                return;
            }

            // Завантаження з GitHub
            await this.scanRepository();
            this.cacheData();
            
        } catch (error) {
            console.error('Помилка завантаження:', error);
            this.showError('Не вдалося завантажити дані з GitHub. Перевірте підключення до інтернету.');
        }
    }

    async scanRepository() {
        console.log('Сканування репозиторію...');
        
        try {
            const contents = await this.fetchGitHubContents('pages');
            this.pages = await this.buildPagesList(contents, 'pages');
            await this.buildSearchIndex();
            console.log(`Знайдено ${this.pages.length} сторінок`);
            
        } catch (error) {
            console.error('Помилка сканування:', error);
            
            // Якщо папка pages не існує, спробуємо знайти .md файли в корені
            try {
                console.log('Спроба знайти файли в корені репозиторію...');
                const rootContents = await this.fetchGitHubContents('');
                const mdFiles = rootContents.filter(item =>
                    item.type === 'file' && item.name.endsWith('.md') && item.name !== 'README.md'
                );
                
                this.pages = mdFiles.map(file => ({
                    title: file.name.replace('.md', ''),
                    path: file.name.replace('.md', ''),
                    url: file.download_url,
                    category: 'Основне'
                }));

                await this.buildSearchIndex();
                
                console.log(`Знайдено ${this.pages.length} .md файлів у корені`);
                
            } catch (rootError) {
                console.error('Помилка пошуку в корені:', rootError);
                throw new Error('Не вдалося знайти жодної сторінки у репозиторії');
            }
        }
    }

    async fetchGitHubContents(path) {
        const response = await fetch(`${this.apiBaseUrl}/${path}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Папка pages не знайдена у репозиторії');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    async buildPagesList(contents, currentPath) {
        const pages = [];

        for (const item of contents) {
            if (item.type === 'dir') {
                // Рекурсивно обробляємо підпапку
                try {
                    const subContents = await this.fetchGitHubContents(item.path);
                    const subPages = await this.buildPagesList(subContents, item.path);
                    pages.push(...subPages);
                } catch (error) {
                    console.error(`Помилка завантаження папки ${item.path}:`, error);
                }
            } else if (item.type === 'file' && item.name.endsWith('.md')) {
                // Додаємо Markdown файл
                const pagePath = item.path.replace('pages/', '').replace('.md', '');
                pages.push({
                    title: item.name.replace('.md', ''),
                    path: pagePath,
                    url: item.download_url,
                    category: this.getCategoryFromPath(pagePath)
                });
            }
        }

        return pages;
    }

    getCategoryFromPath(path) {
        const parts = path.split('/');
        return parts.length > 1 ? parts[0] : 'Основне';
    }

    // Кешування
    cacheData() {
        const cache = {
            pages: this.pages,
            timestamp: Date.now()
        };
        localStorage.setItem('wikiCache', JSON.stringify(cache));
        console.log('Дані збережено в кеш');
    }

    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                // Перевірка актуальності кешу (12 годин)
                if (Date.now() - cache.timestamp < 12 * 60 * 60 * 1000) {
                    // Додаткова нормалізація структури для сумісності з новою buildFolderTree()
                    this.pages = (cache.pages || []).map(p => ({
                        ...p,
                        path: String(p.path || '').trim(),
                        title: p.title || (p.path ? String(p.path).split('/').pop() : 'Untitled'),
                        category: p.category || this.getCategoryFromPath(p.path || '')
                    })).filter(p => p.path);

                    return true;
                }
            } catch (error) {
                console.error('Помилка завантаження кешу:', error);
            }
        }
        return false;
    }

    // =============================
    // Пошук (повнотекстовий + fuzzy)
    // =============================

    // Побудова легкого індексу для швидкого пошуку:
    // - title, path, category
    // - перші рядки контенту (snippet)
    async buildSearchIndex() {
        // Формуємо чистий індекс тільки з даних сторінок, без DOM і службових текстів
        this.searchIndex = [];

        // Максимум проіндексованих сторінок для snippet (для продуктивності)
        const maxPages = Math.min(this.pages.length, 80);
        const snippetLimit = 400;

        for (let i = 0; i < maxPages; i++) {
            const page = this.pages[i];

            // Базові поля (тільки з моделі, а не з DOM)
            const base = {
                path: page.path,
                title: page.title,
                category: page.category || '',
                url: page.url
            };

            try {
                const res = await fetch(page.url);
                if (!res.ok) {
                    // Якщо контент не завантажився — індексуємо тільки метадані
                    this.searchIndex.push({
                        ...base,
                        snippet: '',
                        norm: this.normalizeText(
                            `${page.title} ${page.path} ${page.category || ''}`
                        )
                    });
                    continue;
                }

                const raw = await res.text();
                const plain = raw.replace(/\r/g, '');

                // Легкий markdown-strip: видаляємо заголовки/розмітку, залишаємо текст
                let text = plain
                    .replace(/`{3}[\s\S]*?`{3}/g, ' ') // код-блоки
                    .replace(/`[^`]*`/g, ' ')          // інлайн-код
                    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ') // зображення
                    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')  // посилання
                    .replace(/^#+\s+/gm, ' ')          // заголовки
                    .replace(/[*_>#=-]/g, ' ')         // маркери
                    .replace(/\s+/g, ' ')
                    .trim();

                // Фільтруємо службові фрази, які не мають індексуватися
                const bannedPatterns = [
                    'результати пошуку',
                    'результатів не знайдено',
                    'немає результатів для',
                    'спробуйте інші ключові слова',
                    'перегляньте всі статті',
                    'помилка завантаження',
                    'щє немає статей',
                    'ще немає статей',
                    'ще немає категорій'
                ];

                const lower = text.toLowerCase();
                if (bannedPatterns.some(p => lower.includes(p))) {
                    // Якщо сторінка — технічна або містить виключно службові тексти,
                    // індексуємо тільки метадані, без snippet.
                    this.searchIndex.push({
                        ...base,
                        snippet: '',
                        norm: this.normalizeText(
                            `${page.title} ${page.path} ${page.category || ''}`
                        )
                    });
                    continue;
                }

                const snippet = text.slice(0, snippetLimit).trim();

                this.searchIndex.push({
                    ...base,
                    snippet,
                    norm: this.normalizeText(
                        `${page.title} ${page.path} ${page.category || ''} ${snippet}`
                    )
                });

            } catch {
                // Будь-яка помилка: тільки чисті метадані
                this.searchIndex.push({
                    ...base,
                    snippet: '',
                    norm: this.normalizeText(
                        `${page.title} ${page.path} ${page.category || ''}`
                    )
                });
            }
        }

        // Для сторінок за межами maxPages — індекс тільки з метаданих
        for (let i = maxPages; i < this.pages.length; i++) {
            const page = this.pages[i];
            this.searchIndex.push({
                path: page.path,
                title: page.title,
                category: page.category || '',
                url: page.url,
                snippet: '',
                norm: this.normalizeText(
                    `${page.title} ${page.path} ${page.category || ''}`
                )
            });
        }

        console.log(`Пошуковий індекс побудовано для ${this.searchIndex.length} сторінок`);
    }

    handleSearchInput(query) {
        if (query.trim().length < 2) return;
        this.performSearch(query);
    }

    performSearch(query = null) {
        const raw = query || document.getElementById('searchInput').value;
        const searchQuery = raw.trim();
        
        if (!searchQuery) {
            this.showSection('main');
            return;
        }

        this.showSection('search');

        const results = this.searchPages(searchQuery);
        this.displaySearchResults(results, searchQuery);
        this.highlightTreeSearch(searchQuery);
    }

    // Нормалізація: lower, trim, базова чистка.
    // ВАЖЛИВО: працюємо ТІЛЬКИ з текстом з індексу, а не з DOM.
    normalizeText(text) {
        if (!text) return '';
        let s = text.toLowerCase().trim();
        s = s.replace(/\s+/g, ' ');

        // Легка уніфікація для лат/укр (мінімально, без агресивних замін)
        const map = { 'i': 'і', 'e': 'е', 'y': 'у', 'g': 'ґ' };
        s = s.replace(/[ieyg]/g, ch => map[ch] || ch);

        // видаляємо пунктуацію
        s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()"'[\]]/g, ' ');

        return s;
    }

    // Легка реалізація Levenshtein distance для fuzzy-матчу коротких слів
    levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length || !b.length) return Math.max(a.length, b.length);
        const dp = Array(b.length + 1).fill(0).map((_, i) => i);
        for (let i = 1; i <= a.length; i++) {
            let prev = i;
            for (let j = 1; j <= b.length; j++) {
                const tmp = dp[j];
                if (a[i - 1] === b[j - 1]) {
                    dp[j] = prev;
                } else {
                    dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
                }
                prev = tmp;
            }
        }
        return dp[b.length];
    }

    // Оцінка релевантності:
    //  - великий бонус за точний збіг у title/path
    //  - менший за частковий збіг
    //  - fuzzy (по нормалізованим токенам) для друкарських помилок
    scoreMatch(pageIndexEntry, normQuery) {
        const { title, path, category, norm } = pageIndexEntry;
        const q = normQuery;

        let score = 0;

        // Точний збіг по title/path
        if (title.toLowerCase() === q) score += 100;
        if (path.toLowerCase() === q) score += 90;

        // Часткові збіги
        if (title.toLowerCase().includes(q)) score += 60;
        if (path.toLowerCase().includes(q)) score += 40;
        if (category.toLowerCase().includes(q)) score += 20;
        if (norm.includes(q)) score += 15;

        // Fuzzy: якщо запит короткий — менш строгий поріг
        const tokens = norm.split(' ').filter(Boolean);
        const qt = q.split(' ').filter(Boolean)[0] || q;
        let best = Infinity;
        for (const t of tokens) {
            if (!t) continue;
            const dist = this.levenshtein(qt, t.slice(0, qt.length + 2));
            if (dist < best) best = dist;
        }
        if (best === 1) score += 15;
        else if (best === 2) score += 8;

        return score;
    }

    searchPages(query) {
        if (!this.searchIndex || this.searchIndex.length === 0) {
            if (this.pages.length === 0) return [];
            const q = query.toLowerCase();
            return this.pages
                .filter(p =>
                    p.title.toLowerCase().includes(q) ||
                    p.path.toLowerCase().includes(q) ||
                    (p.category && p.category.toLowerCase().includes(q))
                )
                .map(p => ({
                    title: p.title,
                    path: p.path,
                    category: p.category || '',
                    snippet: ''
                }));
        }

        const normQuery = this.normalizeText(query);
        if (!normQuery) return [];

        // Рахуємо score тільки по індексу сторінок (title/path/category/snippet),
        // НЕ скануємо DOM, НЕ чіпаємо службові блоки.
        const scored = this.searchIndex
            .map(entry => {
                const score = this.scoreMatch(entry, normQuery);
                return { entry, score };
            })
            .filter(x => x.score > 0);

        if (scored.length === 0) {
            return [];
        }

        scored.sort((a, b) => b.score - a.score);

        return scored.map(({ entry }) => ({
            title: entry.title,
            path: entry.path,
            category: entry.category || '',
            snippet: entry.snippet || ''
        }));
    }

    displaySearchResults(results, query) {
        const container = document.getElementById('searchResults');
        const meta = document.getElementById('searchMeta');

        if (results.length === 0) {
            // Акуратне повідомлення, яке НЕ потрапляє в індекс:
            container.innerHTML = `
                <div class="no-results">
                    <h3>Результатів не знайдено</h3>
                    <p>Немає результатів для "<strong>${this.escapeHtml(query)}</strong>"</p>
                    <p>Спробуйте інші ключові слова або <a href="#" onclick="wiki.showSection('articles')">перегляньте всі статті</a>.</p>
                </div>
            `;
            meta.textContent = `0 результатів для "${query}"`;
            return;
        }

        meta.textContent = `${results.length} результатів для "${query}"`;
        container.innerHTML = results.map(result => `
            <div class="search-result" onclick="wiki.loadPage('${result.path}')">
                <h3>${this.highlightText(result.title, query)}</h3>
                <div class="search-path">${result.path}</div>
                <div class="search-category">Категорія: ${result.category || ''}</div>
                ${result.snippet ? `<div class="search-excerpt">${this.highlightText(result.snippet, query)}</div>` : ''}
            </div>
        `).join('');
    }

    highlightText(text, query) {
        if (!text || !query) return this.escapeHtml(text || '');
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (c) {
            if (c === '&') return '&';
            if (c === '<') return '<';
            if (c === '>') return '>';
            if (c === '"') return '"';
            if (c === "'") return '&#39;';
            return c;
        });
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Навігація
    showSection(sectionName) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.updateSectionContent(sectionName);
        }
    }

    updateSectionContent(sectionName) {
        switch (sectionName) {
            case 'main':
                this.updateMainPage();
                break;
            case 'articles':
                this.updateArticlesPage();
                break;
            case 'categories':
                this.updateCategoriesPage();
                break;
        }
    }

    updateMainPage() {
        this.updatePopularArticles();
        this.updateMainCategories();
    }

    updatePopularArticles() {
        const container = document.getElementById('popularArticles');
        
        if (this.pages.length === 0) {
            container.innerHTML = '<div class="no-data">Ще немає статей</div>';
            return;
        }
        
        const popular = this.pages.slice(0, 8);
        container.innerHTML = popular.map(page => `
            <a href="#" class="article-link" onclick="wiki.loadPage('${page.path}')">${page.title}</a>
        `).join('');
    }

    updateMainCategories() {
        const container = document.getElementById('mainCategories');
        const categories = this.getCategoriesWithCounts().slice(0, 8);
        
        if (categories.length === 0) {
            container.innerHTML = '<div class="no-data">Ще немає категорій</div>';
            return;
        }
        
        container.innerHTML = categories.map(cat => `
            <a href="#" class="category-link" onclick="wiki.showCategory('${cat.name}')">${cat.name} (${cat.count})</a>
        `).join('');
    }

    updateArticlesPage() {
        const container = document.getElementById('articlesList');
        const count = document.getElementById('articlesCount');
        
        if (this.pages.length === 0) {
            count.textContent = '0 статей';
            container.innerHTML = '<div class="no-data">Ще немає статей. Додайте першу статтю до репозиторію!</div>';
            return;
        }
        
        count.textContent = `${this.pages.length} статей`;
        container.innerHTML = this.pages.map(page => `
            <div class="article-card" onclick="wiki.loadPage('${page.path}')">
                <h3>${page.title}</h3>
                <div class="article-path">${page.path}</div>
                <div class="article-category">Категорія: ${page.category}</div>
            </div>
        `).join('');
    }

    highlightTreeSearch(query) {
        this.clearTreeHighlights();

        if (!query) return;

        const lowerQuery = query.toLowerCase();

        // Highlight matching items in tree
        document.querySelectorAll('.tree-label').forEach(label => {
            if (label.textContent.toLowerCase().includes(lowerQuery)) {
                label.closest('.tree-item').classList.add('tree-highlight');
            }
        });

        // Expand folders containing matches
        document.querySelectorAll('.tree-highlight').forEach(item => {
            let parent = item.closest('.tree-folder');
            while (parent) {
                parent.classList.add('expanded');
                const children = parent.querySelector('.tree-children');
                if (children) children.classList.remove('collapsed');
                parent = parent.parentElement.closest('.tree-folder');
            }
        });
    }

    clearTreeHighlights() {
        document.querySelectorAll('.tree-highlight').forEach(el => {
            el.classList.remove('tree-highlight');
        });
    }

    // -----------------------------
    // Appearance panel (UI)
    // -----------------------------
    openAppearancePanel() {
        let panel = document.getElementById('appearancePanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'appearancePanel';
            panel.className = 'appearance-panel';
            panel.innerHTML = `
                <div class="appearance-header">
                    <div class="appearance-title">Налаштування вигляду</div>
                    <button class="appearance-close" id="appearanceCloseBtn">
                        <span class="icon icon-close"></span>
                    </button>
                </div>
                <div class="appearance-body">
                    <div class="appearance-group">
                        <div class="appearance-label">Шрифт</div>
                        <div class="appearance-options">
                            <button data-font="system">Системний</button>
                            <button data-font="modern">Modern Sans</button>
                            <button data-font="clean">Чистий читабельний</button>
                        </div>
                    </div>
                    <div class="appearance-group">
                        <div class="appearance-label">Засічки для статей</div>
                        <div class="appearance-options">
                            <button data-serif="off">Вимк.</button>
                            <button data-serif="on">Як у Вікі</button>
                        </div>
                    </div>
                    <div class="appearance-group">
                        <div class="appearance-label">Щільність</div>
                        <div class="appearance-options">
                            <button data-density="normal">Стандарт</button>
                            <button data-density="comfort">Трошки щільніше</button>
                            <button data-density="compact">Макс. щільно</button>
                        </div>
                    </div>
                    <div class="appearance-group">
                        <div class="appearance-label">Акцентний колір</div>
                        <div class="appearance-options">
                            <button data-accent="blue">Синій</button>
                            <button data-accent="violet">Фіолетовий</button>
                            <button data-accent="teal">Бірюзовий</button>
                            <button data-accent="amber">Бурштин</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);

            // Density
            panel.querySelectorAll('[data-density]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-density');
                    this.setPreference('layoutDensity', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-density]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Serif
            panel.querySelectorAll('[data-serif]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-serif');
                    this.setPreference('serifBody', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-serif]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Font family
            panel.querySelectorAll('[data-font]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-font');
                    this.setPreference('fontFamily', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Accent color
            panel.querySelectorAll('[data-accent]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-accent');
                    this.setPreference('accentColor', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-accent]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Corners
            panel.querySelectorAll('[data-corner]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-corner');
                    this.setPreference('cornerStyle', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-corner]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Max width
            panel.querySelectorAll('[data-maxwidth]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-maxwidth');
                    this.setPreference('maxWidth', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-maxwidth]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Grid lines
            panel.querySelectorAll('[data-grid]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-grid');
                    this.setPreference('showGridLines', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-grid]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Sidebar style
            panel.querySelectorAll('[data-sidebar]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-sidebar');
                    this.setPreference('sidebarStyle', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-sidebar]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Shadows
            panel.querySelectorAll('[data-shadows]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-shadows');
                    this.setPreference('shadows', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-shadows]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Transitions
            panel.querySelectorAll('[data-transitions]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-transitions');
                    this.setPreference('transitions', value);
                    this.applyPreferences();
                    panel.querySelectorAll('[data-transitions]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });


            // Close
            panel.querySelector('#appearanceCloseBtn').addEventListener('click', () => {
                panel.classList.remove('visible');
            });
        }

        // Sync active states
        panel.querySelectorAll('[data-density]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-density') === this.preferences.layoutDensity);
        });
        panel.querySelectorAll('[data-serif]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-serif') === this.preferences.serifBody);
        });
        panel.querySelectorAll('[data-font]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-font') === this.preferences.fontFamily);
        });
        panel.querySelectorAll('[data-font]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-font') === this.preferences.fontFamily);
        });
        panel.querySelectorAll('[data-serif]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-serif') === this.preferences.serifBody);
        });
        panel.querySelectorAll('[data-density]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-density') === this.preferences.layoutDensity);
        });
        panel.querySelectorAll('[data-accent]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-accent') === this.preferences.accentColor);
        });

        panel.classList.add('visible');
    }

    updateCategoriesPage() {
        const container = document.getElementById('categoriesGrid');
        const categories = this.getCategoriesWithCounts();
        
        if (categories.length === 0) {
            container.innerHTML = '<div class="no-data">Ще немає категорій</div>';
            return;
        }
        
        container.innerHTML = categories.map(cat => `
            <div class="category-card" onclick="wiki.showCategory('${cat.name}')">
                <h3>${cat.name}</h3>
                <div class="category-stats">${cat.count} статей</div>
                <div class="category-preview">
                    ${this.getCategoryPreview(cat.name).map(page => `
                        <div><a href="#" onclick="wiki.loadPage('${page.path}')">${page.title}</a></div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    getCategoriesWithCounts() {
        if (this.pages.length === 0) return [];
        
        const categories = {};
        
        this.pages.forEach(page => {
            categories[page.category] = (categories[page.category] || 0) + 1;
        });

        return Object.entries(categories)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    getCategoryPreview(categoryName) {
        return this.pages
            .filter(page => page.category === categoryName)
            .slice(0, 5);
    }

    showCategory(categoryName) {
        const categoryPages = this.pages.filter(page => page.category === categoryName);
        
        // Показати сторінку статей з фільтром по категорії
        this.showSection('articles');
        
        const container = document.getElementById('articlesList');
        const count = document.getElementById('articlesCount');
        
        count.textContent = `${categoryPages.length} статей у категорії "${categoryName}"`;
        container.innerHTML = categoryPages.map(page => `
            <div class="article-card" onclick="wiki.loadPage('${page.path}')">
                <h3>${page.title}</h3>
                <div class="article-path">${page.path}</div>
                <div class="article-category">Категорія: ${page.category}</div>
            </div>
        `).join('');
    }

    // Завантаження статті
    async loadPage(pagePath) {
        this.showSection('article');
        this.showLoading('Завантаження статті...', 'articleContent');

        const page = this.pages.find(p => p.path === pagePath);
        if (!page) {
            this.showError('Статтю не знайдено', 'articleContent');
            return;
        }

        try {
            console.log(`Завантаження: ${page.url}`);
            const response = await fetch(page.url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            this.displayArticle(page, content);
            
        } catch (error) {
            console.error('Помилка завантаження статті:', error);
            this.showError('Помилка завантаження статті', 'articleContent');
        }
    }

    displayArticle(page, content) {
        document.getElementById('articleTitle').textContent = page.title;
        this.updateBreadcrumbs(page);

        document.getElementById('articleModified').textContent = `Востаннє редагувалося: ${new Date().toLocaleDateString('uk-UA')}`;

        const htmlContent = this.convertMarkdownToHtml(content);
        document.getElementById('articleContent').innerHTML = htmlContent;

        this.updateArticleInfo(page);

        // Apply syntax highlighting after content is loaded
        setTimeout(() => {
            if (typeof Prism !== 'undefined') {
                Prism.highlightAll();
            }
        }, 100);
    }

    updateBreadcrumbs(page) {
        const parts = page.path.split('/');
        let breadcrumbs = '<a href="#" onclick="wiki.showSection(\'main\')">Головна</a>';
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === parts.length - 1;
            
            if (isLast) {
                breadcrumbs += ` › <span>${part}</span>`;
            } else {
                breadcrumbs += ` › <a href="#" onclick="wiki.loadPage('${currentPath}')">${part}</a>`;
            }
        });

        document.getElementById('breadcrumbs').innerHTML = breadcrumbs;
    }

    convertMarkdownToHtml(markdown) {
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                const language = lang ? ` class="language-${lang}"` : '';
                return `<pre><code${language}>${code.trim()}</code></pre>`;
            })
            .replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
                // Якщо GitHub blob, конвертуємо у raw
                if (src.includes('github.com')) {
                    src = src.replace('github.com', 'raw.githubusercontent.com')
                              .replace('/blob/', '/');
                } else if (!src.startsWith('http')) {
                    // Відносний шлях до pages
                    src = `${this.baseUrl}/pages/${src}`;
                }
                return `<img src="${src}" alt="${alt}" loading="lazy">`;
            })
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    updateArticleInfo(page) {
        const categories = document.getElementById('articleCategories');
        categories.innerHTML = `<a href="#" onclick="wiki.showCategory('${page.category}')">${page.category}</a>`;

        const related = this.getRelatedArticles(page);
        const relatedContainer = document.getElementById('relatedArticles');
        
        if (related.length === 0) {
            relatedContainer.innerHTML = '<div>Немає пов\'язаних статей</div>';
        } else {
            relatedContainer.innerHTML = related.map(rel => `
                <div><a href="#" onclick="wiki.loadPage('${rel.path}')">${rel.title}</a></div>
            `).join('');
        }
    }

    getRelatedArticles(page) {
        return this.pages
            .filter(p => p.category === page.category && p.path !== page.path)
            .slice(0, 5);
    }

    showLoading(message, elementId = null) {
        const target = elementId ? document.getElementById(elementId) : 
            document.querySelector('.content-section.active');
        
        if (target) {
            target.innerHTML = `<div class="loading">${message}</div>`;
        }
    }

    showError(message, elementId = null) {
        const target = elementId ? document.getElementById(elementId) : 
            document.querySelector('.content-section.active');
        
        if (target) {
            target.innerHTML = `
                <div class="error">
                    <h3>Помилка</h3>
                    <p>${message}</p>
                    <button onclick="wiki.showSection('main')" class="action-btn">На головну</button>
                </div>
            `;
        }
    }

    updateUI() {
        this.updateStats();
        this.updateSidebar();
        this.updateMainPage();
    }

    updateStats() {
        document.getElementById('statArticles').textContent = this.pages.length;
        document.getElementById('statCategories').textContent = this.getCategoriesWithCounts().length;
        document.getElementById('statUpdated').textContent = 'сьогодні';
        
        document.getElementById('footerArticles').textContent = `${this.pages.length} статей`;
        document.getElementById('footerCategories').textContent = `${this.getCategoriesWithCounts().length} категорій`;
    }

    updateSidebar() {
        const container = document.getElementById('sidebarNav');
        const tree = this.buildFolderTree();

        if (!container) return;

        if (Object.keys(tree).length === 0) {
            container.innerHTML = '<div class="no-data">Ще немає сторінок</div>';
            return;
        }

        container.innerHTML = this.renderTree(tree);
    }

    buildFolderTree() {
        const tree = {};

        this.pages.forEach(page => {
            // Захист від некоректних записів у кеші
            if (!page || !page.path || typeof page.path !== 'string') return;

            const parts = page.path.split('/').filter(Boolean);
            if (parts.length === 0) return;

            let current = tree;

            parts.forEach((part, index) => {
                // Якщо вузол не існує — створюємо
                if (!current[part]) {
                    const isFile = index === parts.length - 1;
                    current[part] = {
                        type: isFile ? 'file' : 'folder',
                        path: parts.slice(0, index + 1).join('/'),
                        title: isFile ? (page.title || part) : part,
                        // ВАЖЛИВО: для файлів не зберігаємо children зовсім,
                        // щоб не ламати Object.keys(...) на null / "fff" з застарілого кешу
                        ...(isFile ? {} : { children: {} })
                    };
                }

                // Рухаємось вглиб тільки для тек
                if (index < parts.length - 1) {
                    // Якщо з якогось старого кешу children був зіпсований (null / рядок / "fff") —
                    // примусово замінюємо на порожній об'єкт
                    if (!current[part].children || typeof current[part].children !== 'object') {
                        current[part].children = {};
                    }
                    current = current[part].children;
                }
            });
        });

        return tree;
    }

    renderTree(tree, level = 0) {
        let html = '';

        Object.entries(tree).forEach(([key, item]) => {
            const isExpanded = level < 2; // Auto-expand first two levels

            if (item.type === 'folder') {
                const childrenTree = item.children || {};
                const childrenCount = Object.keys(childrenTree).length;

                html += `
                    <div class="tree-folder ${isExpanded ? 'expanded' : ''}" data-path="${item.path}">
                        <div class="tree-item folder-item" onclick="wiki.toggleFolder('${item.path}')">
                            <span class="tree-icon tree-icon-folder"></span>
                            <span class="tree-label">${key}</span>
                            <span class="tree-count">(${childrenCount})</span>
                        </div>
                        <div class="tree-children ${isExpanded ? '' : 'collapsed'}">
                            ${this.renderTree(childrenTree, level + 1)}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="tree-item file-item" onclick="wiki.loadPage('${item.path}')">
                        <span class="tree-icon tree-icon-file"></span>
                        <span class="tree-label">${item.title}</span>
                    </div>
                `;
            }
        });

        return html;
    }

    toggleFolder(path) {
        const folder = document.querySelector(`[data-path="${path}"]`);
        if (folder) {
            folder.classList.toggle('expanded');
            const children = folder.querySelector('.tree-children');
            const icon = folder.querySelector('.tree-icon');

            if (folder.classList.contains('expanded')) {
                children.classList.remove('collapsed');
                folder.classList.add('expanded');
            } else {
                children.classList.add('collapsed');
            }
        }
    }

    highlightTreeSearch(query) {
        this.clearTreeHighlights();

        if (!query) return;

        const lowerQuery = query.toLowerCase();

        // Highlight matching items in tree
        document.querySelectorAll('.tree-label').forEach(label => {
            if (label.textContent.toLowerCase().includes(lowerQuery)) {
                label.closest('.tree-item').classList.add('tree-highlight');
            }
        });

        // Expand folders containing matches
        document.querySelectorAll('.tree-highlight').forEach(item => {
            let parent = item.closest('.tree-folder');
            while (parent) {
                parent.classList.add('expanded');
                const children = parent.querySelector('.tree-children');
                const icon = parent.querySelector('.tree-icon');
                if (children) children.classList.remove('collapsed');
                if (icon) icon.textContent = '📁';
                parent = parent.parentElement.closest('.tree-folder');
            }
        });
    }

    clearTreeHighlights() {
        document.querySelectorAll('.tree-highlight').forEach(el => {
            el.classList.remove('tree-highlight');
        });
    }

    // ================================
    // Додаткові функції
    // ================================
    editArticle() {
        const currentTitle = document.getElementById('articleTitle').textContent;
        const currentPage = this.pages.find(p => p.title === currentTitle);
        
        if (currentPage) {
            const editUrl = `https://github.com/${this.repoOwner}/${this.repoName}/edit/main/pages/${currentPage.path}.md`;
            window.open(editUrl, '_blank');
        } else {
            alert('Не вдалося знайти сторінку для редагування');
        }
    }

    shareArticle() {
        const title = document.getElementById('articleTitle').textContent;
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            alert('Посилання скопійовано в буфер обміну!');
        }
    }
}

// Глобальний екземпляр
const wiki = new HoRPWiki();

// Глобальні функції для HTML
function performSearch() {
    wiki.performSearch();
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function showSection(section) {
    wiki.showSection(section);
}

function showRandomPage() {
    if (wiki.pages.length > 0) {
        const randomIndex = Math.floor(Math.random() * wiki.pages.length);
        const randomPage = wiki.pages[randomIndex];
        if (randomPage) {
            wiki.loadPage(randomPage.path);
        }
    } else {
        alert('Ще немає статей для перегляду');
    }
}

function refreshData() {
    localStorage.removeItem('wikiCache');
    window.location.reload();
}
