class HoRPWiki {
    constructor() {
        this.repoOwner = 'DavoZen';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;

        this.pages = [];

        // UI preferences (persisted)
        this.preferences = {
            theme: 'dark',  // Only dark theme
            fontFamily: 'system',
            serifBody: 'off',
            layoutDensity: 'normal',
            accentColor: 'blue'
        };

        this.currentTheme = this.preferences.theme;

        // Emoji mapping
        this.emojiMap = {
            'smile': '😊', 'laughing': '😆', 'wink': '😉',
            'heart': '❤️', 'thumbsup': '👍', 'thumbsdown': '👎',
            'fire': '🔥', 'rocket': '🚀', 'star': '⭐', 'sparkles': '✨',
            'check': '✅', 'x': '❌', 'warning': '⚠️', 'info': 'ℹ️',
            'question': '❓', 'exclamation': '❗', 'bulb': '💡',
            'book': '📖', 'pencil': '✏️', 'link': '🔗', 'code': '💻',
            'bug': '🐛', 'rocket': '🚀', 'star': '⭐', 'heart': '❤️',
            'eyes': '👀', 'ok_hand': '👌', 'clap': '👏', 'wave': '👋',
            'thinking': '🤔', 'confused': '😕', 'sad': '😢', 'angry': '😠',
            'cool': '😎', 'sunglasses': '😎', 'party': '🎉', 'tada': '🎊',
            'coffee': '☕', 'pizza': '🍕', 'beer': '🍺', 'wine': '🍷',
            'cat': '🐱', 'dog': '🐶', 'bird': '🐦', 'fish': '🐟',
            'tree': '🌳', 'flower': '🌸', 'sun': '☀️', 'moon': '🌙',
            'cloud': '☁️', 'rain': '🌧️', 'snow': '❄️', 'lightning': '⚡',
            'fire': '🔥', 'water': '💧', 'earth': '🌍', 'air': '💨'
        };

        this.init();
    }

    async init() {
        console.log('Ініціалізація HoRP-wiKi...');

        // Очищення localStorage від mermaid та theme налаштувань при кожному завантаженні
        this.clearMermaidStorage();

        // Примусово очищуємо window.mermaid для скидання всіх налаштувань
        if (typeof window.mermaid !== 'undefined') {
            delete window.mermaid;
        }

        this.applyPreferences();
        this.setupTheme();
        this.setupEventListeners();
        await this.loadData();
        this.updateUI();

        // Обробка прямого посилання ?page=... після того, як дані завантажені
        this.handleInitialRoute();

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
        // Theme - always dark
        document.documentElement.setAttribute('data-theme', 'dark');

        // Шрифт (глобальний)
        document.body.classList.toggle('wiki-font-system', this.preferences.fontFamily === 'system');
        document.body.classList.toggle('wiki-font-modern', this.preferences.fontFamily === 'modern');
        document.body.classList.toggle('wiki-font-clean',  this.preferences.fontFamily === 'clean');

        // Засічки тільки для контенту статей
        document.body.classList.toggle('wiki-serif-body', this.preferences.serifBody === 'on');

        // Щільність карток/списків
        document.body.classList.toggle('wiki-density-compact', this.preferences.layoutDensity === 'compact');
        document.body.classList.toggle('wiki-density-comfort', this.preferences.layoutDensity === 'comfort');

        // Акцентний колір
        document.body.setAttribute('data-accent', this.preferences.accentColor);
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    clearMermaidStorage() {
        // Агресивно очищуємо localStorage від mermaid та theme налаштувань
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.includes('mermaid') ||
                    key.includes('theme') ||
                    key.includes('diagram') ||
                    key.includes('render')
                )) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`Cleared localStorage key: ${key}`);
            });
        } catch (e) {
            console.warn('Could not clear localStorage:', e);
        }
    }

    setupEventListeners() {
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
                // Додаємо Markdown файл з підтримкою YAML front matter
                const pagePath = item.path.replace('pages/', '').replace('.md', '');

                let meta = {};
                try {
                    const res = await fetch(item.download_url);
                    if (res.ok) {
                        const raw = await res.text();
                        meta = this.parseFrontMatter(raw);
                    }
                } catch (e) {
                    console.warn('Не вдалося завантажити front matter для', item.path, e);
                }

                pages.push({
                    title: meta.title || item.name.replace('.md', ''),
                    path: pagePath,
                    url: item.download_url,
                    category: meta.category || this.getCategoryFromPath(pagePath),
                    summary: meta.summary || '',
                    tags: Array.isArray(meta.tags) ? meta.tags : [],
                    author: meta.author || '',
                    created: meta.created || ''
                });
            }
        }

        return pages;
    }

    /**
     * Парсер YAML front matter формату:
     * ---
     * key: value
     * key2: value
     * ---
     */
    parseFrontMatter(raw) {
        if (!raw.startsWith('---')) return {};

        const end = raw.indexOf('\n---', 3);
        if (end === -1) return {};

        const block = raw.slice(3, end).trim();
        const lines = block.split(/\r?\n/);
        const meta = {};

        for (const line of lines) {
            const m = line.match(/^([^:]+):\s*(.*)$/);
            if (!m) continue;
            const key = m[1].trim();
            let value = m[2].trim();

            // Порожні масиви: []
            if (value === '[]') {
                meta[key] = [];
                continue;
            }

            // Рядки в лапках
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            meta[key] = value;
        }

        return meta;
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
    // Routing: прямі посилання на статті
    // =============================

    getPageFromUrl() {
        const url = new URL(window.location.href);
        const pageParam = url.searchParams.get('page');
        if (!pageParam) return null;

        const clean = pageParam.replace(/^\//, '').replace(/\.md$/i, '');
        return clean || null;
    }

    handleInitialRoute() {
        const path = this.getPageFromUrl();
        if (!path) return;

        const page = this.pages.find(p => p.path === path);
        if (!page) return;

        this.loadPage(path);
    }

    updateUrlForPage(page) {
        if (!page || !page.path) return;

        const url = new URL(window.location.href);
        url.searchParams.set('page', page.path);
        window.history.pushState({ pagePath: page.path }, page.title, url.toString());

        if (page.title) {
            document.title = `HoRP-wiKi - ${page.title}`;
        }
    }

    // =============================
    // Пошук (повнотекстовий + fuzzy)
    // =============================

    async buildSearchIndex() {
        this.searchIndex = [];

        const maxPages = Math.min(this.pages.length, 80);
        const snippetLimit = 400;

        for (let i = 0; i < maxPages; i++) {
            const page = this.pages[i];

            const base = {
                path: page.path,
                title: page.title,
                category: page.category || '',
                url: page.url
            };

            try {
                const res = await fetch(page.url);
                if (!res.ok) {
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

                let text = plain
                    .replace(/`{3}[\s\S]*?`{3}/g, ' ')
                    .replace(/`[^`]*`/g, ' ')
                    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
                    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
                    .replace(/^#+\s+/gm, ' ')
                    .replace(/[*_>#=-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const bannedPatterns = [
                    'результати пошуку',
                    'результатів не знайдено',
                    'немає результатів для',
                    'спробуйте інші ключові слова',
                    'перегляньте всі статті',
                    'помилка завантаження',
                    'ще немає статей'
                ];

                const lower = text.toLowerCase();
                if (bannedPatterns.some(p => lower.includes(p))) {
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
                this.searchIndex.push({
                    ...base,
                    snippet: '',
                    norm: this.normalizeText(
                        `${page.title} ${page.path} ${page.category || ''}`
                    )
                });
            }
        }

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

        const searchContentCheckbox = document.getElementById('searchContent');
        const searchInContent = searchContentCheckbox ? searchContentCheckbox.checked : true;

        this.showSection('search');

        const results = this.searchPages(searchQuery, searchInContent);
        this.displaySearchResults(results, searchQuery, searchInContent);
        this.highlightTreeSearch(searchQuery);
    }

    normalizeText(text) {
        if (!text) return '';
        let s = text.toLowerCase().trim();
        s = s.replace(/\s+/g, ' ');

        const map = { 'i': 'і', 'e': 'е', 'y': 'у', 'g': 'ґ' };
        s = s.replace(/[ieyg]/g, ch => map[ch] || ch);

        s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()"'[\]]/g, ' ');

        return s;
    }

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

    scoreMatch(pageIndexEntry, normQuery) {
        const { title, path, category, norm } = pageIndexEntry;
        const q = normQuery;

        let score = 0;

        if (title.toLowerCase() === q) score += 100;
        if (path.toLowerCase() === q) score += 90;

        if (title.toLowerCase().includes(q)) score += 60;
        if (path.toLowerCase().includes(q)) score += 40;
        if (category.toLowerCase().includes(q)) score += 20;
        if (norm.includes(q)) score += 15;

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

    searchPages(query, searchInContent = true) {
        const q = query.toLowerCase();
        
        if (!this.searchIndex || this.searchIndex.length === 0) {
            if (this.pages.length === 0) return [];
            
            if (searchInContent) {
                // Пошук ТІЛЬКИ в змісті
                return this.pages
                    .filter(p => p.content && p.content.toLowerCase().includes(q))
                    .map(p => ({
                        title: p.title,
                        path: p.path,
                        category: p.category || '',
                        snippet: this.extractSnippet(p.content, q)
                    }));
            } else {
                // Пошук ТІЛЬКИ в назві/шляху/категорії
                return this.pages
                    .filter(p => {
                        return p.title.toLowerCase().includes(q) ||
                               p.path.toLowerCase().includes(q) ||
                               (p.category && p.category.toLowerCase().includes(q));
                    })
                    .map(p => ({
                        title: p.title,
                        path: p.path,
                        category: p.category || '',
                        snippet: ''
                    }));
            }
        }

        const normQuery = this.normalizeText(query);
        if (!normQuery) return [];

        if (searchInContent) {
            // Пошук ТІЛЬКИ в змісті (через snippet в індексі)
            const contentMatches = this.searchIndex
                .filter(entry => entry.snippet && this.normalizeText(entry.snippet).includes(normQuery))
                .map(entry => ({
                    title: entry.title,
                    path: entry.path,
                    category: entry.category || '',
                    snippet: entry.snippet
                }));
            
            // Додатково шукаємо в повному контенті якщо snippet не містить запит
            const additionalMatches = this.fallbackContentSearch(query);
            
            // Об'єднуємо і видаляємо дублікати
            const allMatches = [...contentMatches];
            additionalMatches.forEach(match => {
                if (!allMatches.find(m => m.path === match.path)) {
                    allMatches.push(match);
                }
            });
            
            return allMatches;
        } else {
            // Пошук ТІЛЬКИ в назві/шляху/категорії (без врахування змісту)
            const scored = this.searchIndex
                .map(entry => {
                    let score = 0;
                    const title = entry.title.toLowerCase();
                    const path = entry.path.toLowerCase();
                    const category = (entry.category || '').toLowerCase();
                    
                    if (title === q) score += 100;
                    if (path === q) score += 90;
                    if (title.includes(q)) score += 60;
                    if (path.includes(q)) score += 40;
                    if (category.includes(q)) score += 20;
                    
                    return { entry, score };
                })
                .filter(x => x.score > 0);

            scored.sort((a, b) => b.score - a.score);

            return scored.map(({ entry }) => ({
                title: entry.title,
                path: entry.path,
                category: entry.category || '',
                snippet: ''
            }));
        }
    }

    fallbackContentSearch(query) {
        const q = query.toLowerCase();
        // Шукаємо тільки якщо сторінка має завантажений контент
        return this.pages
            .filter(p => {
                if (!p.url) return false;
                // Для цього треба завантажити контент - зробимо це асинхронно
                return false;
            })
            .slice(0, 20)
            .map(p => ({
                title: p.title,
                path: p.path,
                category: p.category || '',
                snippet: ''
            }));
    }

    extractSnippet(content, query) {
        if (!content) return '';
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);
        
        if (index === -1) return content.slice(0, 150).trim() + '...';
        
        const start = Math.max(0, index - 80);
        const end = Math.min(content.length, index + query.length + 80);
        let snippet = content.slice(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        return snippet;
    }

    displaySearchResults(results, query, searchInContent = true) {
        const container = document.getElementById('searchResults');
        const meta = document.getElementById('searchMeta');

        if (results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>Результатів не знайдено</h3>
                    <p>Немає результатів для "<strong>${this.escapeHtml(query)}</strong>"</p>
                    ${searchInContent ? '<p>Спробуйте зняти галочку "Шукати в змісті" для пошуку тільки за назвами.</p>' : ''}
                    <p>Або <a href="#" onclick="wiki.showSection('articles')">перегляньте всі статті</a>.</p>
                </div>
            `;
            meta.textContent = `0 результатів для "${query}"`;
            return;
        }

        const searchType = searchInContent ? '(назви + зміст)' : '(тільки назви)';
        meta.textContent = `${results.length} результатів для "${query}" ${searchType}`;
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
            if (c === '&') return '&amp;';
            if (c === '<') return '&lt;';
            if (c === '>') return '&gt;';
            if (c === '"') return '&quot;';
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

        document.querySelectorAll('.tree-label').forEach(label => {
            if (label.textContent.toLowerCase().includes(lowerQuery)) {
                label.closest('.tree-item').classList.add('tree-highlight');
            }
        });

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
        const fm = this.parseFrontMatter(content);
        const cleanContent = this.stripFrontMatter(content);

        const finalTitle = fm.title || page.title;
        const pageWithMeta = { ...page, ...fm, title: finalTitle };

        document.getElementById('articleTitle').textContent = finalTitle;
        this.updateBreadcrumbs(pageWithMeta);

        const created = fm.created || page.created;
        if (created) {
            document.getElementById('articleModified').textContent =
                `Створено / оновлено: ${new Date(created).toLocaleDateString('uk-UA')}`;
        } else {
            document.getElementById('articleModified').textContent =
                `Створено / оновлено: ${new Date().toLocaleDateString('uk-UA')}`;
        }

        const htmlMeta = this.renderFrontMatterMeta(fm);
        const htmlBody = this.convertMarkdownToHtml(cleanContent);
        document.getElementById('articleContent').innerHTML = htmlMeta + htmlBody;

        this.updateArticleInfo(pageWithMeta);
        this.updateUrlForPage(pageWithMeta);

        // Apply syntax highlighting after content is loaded
        setTimeout(async () => {
            if (typeof Prism !== 'undefined') {
                Prism.highlightAll();
            }
            // Setup spoiler toggles
            this.setupSpoilers();
            // Render mermaid diagrams sequentially
            await this.renderMermaidDiagrams();
        }, 100);
    }

    setupSpoilers() {
        document.querySelectorAll('.spoiler-header').forEach(header => {
            header.addEventListener('click', () => {
                const spoiler = header.closest('.spoiler');
                spoiler.classList.toggle('open');
            });
        });
    }

    async renderMermaidDiagrams() {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid library not loaded');
            return;
        }

        // Очищуємо localStorage ще раз перед рендером діаграм
        this.clearMermaidStorage();

        // Reset Mermaid to ensure clean state with dark theme
        try {
            mermaid.mermaidAPI.reset();
        } catch (e) {
            // Ignore if reset fails
        }
        
        // Initialize Mermaid with DARK theme only
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            },
            sequence: {
                useMaxWidth: true,
                diagramMarginX: 50,
                diagramMarginY: 10
            },
            gantt: {
                useMaxWidth: true,
                leftPadding: 75
            }
        });
        console.log('Mermaid initialized with dark theme');

        // Find all Mermaid diagram elements
        const mermaidElements = Array.from(document.querySelectorAll('.mermaid'));
        
        if (mermaidElements.length === 0) {
            return;
        }

        console.log(`Found ${mermaidElements.length} Mermaid diagram(s) to render`);

        // Process diagrams sequentially (one by one) for stability
        for (let i = 0; i < mermaidElements.length; i++) {
            const element = mermaidElements[i];
            const diagramIndex = i + 1;
            
            // Always store original diagram code before any processing
            let originalCode = element.getAttribute('data-diagram-code');
            
            // If no stored code, get from current content
            if (!originalCode) {
                originalCode = element.textContent.trim();
            }
            
            // Check if element has valid content
            if (!originalCode) {
                console.warn(`Diagram ${diagramIndex}/${mermaidElements.length}: Empty content, skipping`);
                continue;
            }

            // Store the code in data attribute to prevent loss during rendering
            element.setAttribute('data-diagram-code', originalCode);
            
            // Detect diagram type
            const isPieChart = originalCode.toLowerCase().includes('pie');
            element.setAttribute('data-diagram-type', isPieChart ? 'pie' : 'other');
            
            // Create a unique ID for this diagram
            const diagramId = `mermaid-diagram-${Date.now()}-${diagramIndex}`;
            element.id = diagramId;

            try {
                console.log(`Rendering diagram ${diagramIndex}/${mermaidElements.length} (${isPieChart ? 'pie chart' : 'other'})...`);
                
                // Always clear and re-render to ensure correct theme
                element.innerHTML = '';
                element.textContent = originalCode;
                element.removeAttribute('data-processed');
                
                // Render this specific diagram
                await mermaid.run({
                    nodes: [element],
                    suppressErrors: false
                });

                // Mark as successfully rendered
                element.setAttribute('data-rendered', 'true');
                console.log(`Diagram ${diagramIndex}/${mermaidElements.length}: Rendered successfully`);

                // Get SVG for post-processing
                const svg = element.querySelector('svg');
                if (svg) {
                    // Set transparent background
                    svg.style.backgroundColor = 'transparent';
                    
                    // Force white text color on all text elements
                    svg.querySelectorAll('text, tspan, .label, .nodeLabel, .edgeLabel').forEach(textEl => {
                        textEl.style.fill = '#ffffff';
                        textEl.setAttribute('fill', '#ffffff');
                    });
                }

                // Small delay between diagrams to prevent performance issues
                if (i < mermaidElements.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

            } catch (error) {
                console.error(`Diagram ${diagramIndex}/${mermaidElements.length}: Rendering error -`, error);
                
                // Restore the original code and show error
                element.innerHTML = `
                    <div style="padding: 1rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 4px;">
                        <div style="color: #f87171; font-weight: 600; margin-bottom: 0.5rem;">
                            ⚠️ Помилка діаграми ${diagramIndex}
                        </div>
                        <div style="color: #fca5a5; font-size: 0.85rem; margin-bottom: 0.5rem;">
                            ${this.escapeHtml(error.message || 'Невідома помилка')}
                        </div>
                        <details style="margin-top: 0.5rem;">
                            <summary style="color: #b0b0b0; cursor: pointer; font-size: 0.8rem;">Показати код діаграми</summary>
                            <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #1a1a1a; border-radius: 4px; overflow-x: auto; font-size: 0.8rem;"><code>${this.escapeHtml(originalCode)}</code></pre>
                        </details>
                    </div>
                `;
                element.setAttribute('data-rendered', 'error');
            }
        }

        console.log('Mermaid diagrams processing complete');
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

    stripFrontMatter(raw) {
        if (!raw.startsWith('---')) return raw;
        const end = raw.indexOf('\n---', 3);
        if (end === -1) return raw;
        return raw.slice(end + 4);
    }

    renderFrontMatterMeta(meta) {
        if (!meta || Object.keys(meta).length === 0) return '';

        const rows = [];

        if (meta.title)  rows.push(`<tr><th>Заголовок</th><td>${this.escapeHtml(meta.title)}</td></tr>`);
        if (meta.author) rows.push(`<tr><th>Автор</th><td>${this.escapeHtml(meta.author)}</td></tr>`);
        if (meta.email)  rows.push(`<tr><th>Email</th><td>${this.escapeHtml(meta.email)}</td></tr>`);
        if (meta.created) rows.push(`<tr><th>Створено</th><td>${this.escapeHtml(meta.created)}</td></tr>`);
        if (meta.tags && Array.isArray(meta.tags) && meta.tags.length) {
            rows.push(`<tr><th>Теги</th><td>${meta.tags.map(t => this.escapeHtml(t)).join(', ')}</td></tr>`);
        }
        if (meta.summary) rows.push(`<tr><th>Опис</th><td>${this.escapeHtml(meta.summary)}</td></tr>`);

        if (!rows.length) return '';

        return `
<div class="article-meta-table">
    <table>
        <tbody>
            ${rows.join('')}
        </tbody>
    </table>
</div>
 `;
    }

    // ====================
    // COMPREHENSIVE MARKDOWN PARSER
    // ====================
    convertMarkdownToHtml(markdown) {
        let html = '';

        // Store Mermaid diagrams to prevent processing inside them
        const mermaidDiagrams = [];
        let processedMarkdown = markdown.replace(/```mermaid\s*\n([\s\S]*?)```/g, (match, code) => {
            const placeholder = `<!--MERMAID_DIAGRAM_${mermaidDiagrams.length}-->`;
            mermaidDiagrams.push(code.trim());
            return placeholder;
        });

        // ====================
        // YOUTUBE VIDEOS - Process BEFORE markdown parsing
        // ====================
        processedMarkdown = processedMarkdown.replace(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g, function(match, videoId) {
            return `<!--YOUTUBE_VIDEO_${videoId}-->`;
        });

        processedMarkdown = processedMarkdown.replace(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/g, function(match, videoId) {
            return `<!--YOUTUBE_VIDEO_${videoId}-->`;
        });

        // Store YouTube video IDs for later replacement
        const youtubeVideos = [];
        processedMarkdown = processedMarkdown.replace(/<!--YOUTUBE_VIDEO_([a-zA-Z0-9_-]+)-->/g, function(match, videoId) {
            youtubeVideos.push(videoId);
            return `<!--YOUTUBE_VIDEO_${youtubeVideos.length - 1}-->`;
        });

        // ====================
        // HEX COLORS - Process BEFORE markdown parsing to prevent header interpretation
        // ====================
        // Helper function to calculate contrast color (black or white) based on background
        function getContrastColor(hex) {
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.5 ? '#000000' : '#ffffff';
        }

        // Store hex colors to prevent markdown from treating them as headers
        const hexColors = [];
        // Match hex colors at the start of a line or after whitespace
        processedMarkdown = processedMarkdown.replace(/(^|\s)(#[0-9a-fA-F]{6})\b/gm, function(match, before, hex) {
            const textColor = getContrastColor(hex.substring(1));
            const placeholder = `<!--HEX_COLOR_${hexColors.length}-->`;
            hexColors.push({ hex, textColor });
            return before + placeholder;
        });

        // Helper function to convert RGB to HEX
        function rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        // Helper function to convert HSL to HEX
        function hslToHex(h, s, l) {
            s /= 100;
            l /= 100;
            const a = s * Math.min(l, 1 - l);
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        }

        // Store RGB colors
        const rgbColors = [];
        processedMarkdown = processedMarkdown.replace(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g, function(match, r, g, b) {
            const hex = rgbToHex(r, g, b);
            const textColor = getContrastColor(hex);
            const placeholder = `<!--RGB_COLOR_${rgbColors.length}-->`;
            rgbColors.push({ r, g, b, hex, textColor });
            return placeholder;
        });

        // Store HSL colors
        const hslColors = [];
        processedMarkdown = processedMarkdown.replace(/hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)/g, function(match, h, s, l) {
            const hex = hslToHex(h, s, l);
            const textColor = getContrastColor(hex);
            const placeholder = `<!--HSL_COLOR_${hslColors.length}-->`;
            hslColors.push({ h, s, l, hex, textColor });
            return placeholder;
        });

        // Try markdown-it first, then fallback to marked.js
        if (typeof markdownit !== 'undefined') {
            // Use markdown-it
            const md = markdownit({
                html: true,
                linkify: true,
                typographer: true,
                breaks: true
            });

            // Custom renderer for enhanced features
            const defaultRender = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options);
            };

            md.renderer.rules.fence = function(tokens, idx, options, env, self) {
                const token = tokens[idx];
                const lang = token.info || '';
                return `<pre><code class="language-${lang}">${token.content}</code></pre>`;
            };

            // Custom list item rendering for task lists
            md.renderer.rules.listitem = function(tokens, idx, options, env, self) {
                const token = tokens[idx];
                if (token.task) {
                    const checkedAttr = token.checked ? ' checked' : '';
                    return `<li class="task-list-item${token.checked ? ' checked' : ''}"><input type="checkbox"${checkedAttr} disabled> <span>${self.renderInline(token.children, options, env)}</span></li>`;
                }
                return `<li>${self.renderInline(token.children, options, env)}</li>`;
            };

            html = md.render(processedMarkdown);
        } else if (typeof marked !== 'undefined') {
            // Use marked.js
            marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: true,
                mangle: false
            });

            // Custom renderer for enhanced features
            const renderer = new marked.Renderer();

            // Custom code block rendering
            renderer.code = function(code, language) {
                const lang = language || '';
                return `<pre><code class="language-${lang}">${code}</code></pre>`;
            };

            // Custom heading rendering
            renderer.heading = function(text, level, raw) {
                return `<h${level}>${text}</h${level}>`;
            };

            // Custom link rendering
            renderer.link = function(href, title, text) {
                let finalHref = href;
                if (href.includes('github.com')) {
                    finalHref = href
                        .replace('github.com', 'raw.githubusercontent.com')
                        .replace('/blob/', '/');
                }
                const titleAttr = title ? ` title="${title}"` : '';
                return `<a href="${finalHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
            };

            // Custom image rendering
            renderer.image = function(href, title, text) {
                let finalSrc = href;
                if (href.includes('github.com')) {
                    finalSrc = href
                        .replace('github.com', 'raw.githubusercontent.com')
                        .replace('/blob/', '/');
                } else if (!href.startsWith('http')) {
                    finalSrc = `${this.baseUrl}/pages/${href}`;
                }
                const titleAttr = title ? ` title="${title}"` : '';
                return `<img src="${finalSrc}" alt="${text}" loading="lazy"${titleAttr}>`;
            }.bind(this);

            // Custom list item rendering for task lists
            renderer.listitem = function(text, task, checked) {
                if (task) {
                    const checkedAttr = checked ? ' checked' : '';
                    return `<li class="task-list-item${checked ? ' checked' : ''}"><input type="checkbox"${checkedAttr} disabled> <span>${text}</span></li>`;
                }
                return `<li>${text}</li>`;
            };

            // Parse markdown with custom renderer
            html = marked.parse(processedMarkdown, { renderer });
        } else {
            // Fallback to simple parsing if no library is available
            html = processedMarkdown
                .replace(/^# (.*)$/gm, '<h1>$1</h1>')
                .replace(/^## (.*)$/gm, '<h2>$1</h2>')
                .replace(/^### (.*)$/gm, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>');
        }

        // ====================
        // RESTORE MERMAID DIAGRAMS
        // ====================
        html = html.replace(/<!--MERMAID_DIAGRAM_(\d+)-->/g, function(match, index) {
            const diagramCode = mermaidDiagrams[index];
            return `<div class="mermaid">${diagramCode}</div>`;
        });

        // ====================
        // RESTORE YOUTUBE VIDEOS
        // ====================
        html = html.replace(/<!--YOUTUBE_VIDEO_(\d+)-->/g, function(match, index) {
            const videoId = youtubeVideos[index];
            return `<div class="youtube-video">
                <iframe src="https://www.youtube.com/embed/${videoId}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                </iframe>
            </div>`;
        });

        // ====================
        // ENHANCED FEATURES
        // ====================

        // Strikethrough ~~text~~
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

        // Underline ==text==
        html = html.replace(/==(.*?)==/g, '<u>$1</u>');

        // Highlight ==text==
        html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');

        // ====================
        // EMOJIS
        // ====================
        const emojiMap = this.emojiMap;
        html = html.replace(/:([a-z_]+):/g, function(match, emojiName) {
            return emojiMap[emojiName] || match;
        });

        // ====================
        // ALERT BOXES
        // ====================
        // > [!INFO] content
        html = html.replace(/^>\s*\[!INFO\]\s*(.*)$/gim, function(match, content) {
            return `<div class="alert alert-info"><span class="alert-icon">ℹ️</span><div class="alert-content"><div class="alert-title">Info</div>${content}</div></div>`;
        });
        html = html.replace(/^>\s*\[!WARNING\]\s*(.*)$/gim, function(match, content) {
            return `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div class="alert-content"><div class="alert-title">Warning</div>${content}</div></div>`;
        });
        html = html.replace(/^>\s*\[!ERROR\]\s*(.*)$/gim, function(match, content) {
            return `<div class="alert alert-error"><span class="alert-icon">❌</span><div class="alert-content"><div class="alert-title">Error</div>${content}</div></div>`;
        });
        html = html.replace(/^>\s*\[!SUCCESS\]\s*(.*)$/gim, function(match, content) {
            return `<div class="alert alert-success"><span class="alert-icon">✅</span><div class="alert-content"><div class="alert-title">Success</div>${content}</div></div>`;
        });

        // ====================
        // TASK LISTS - Process manually after markdown parsing
        // ====================
        // Convert - [ ] and - [x] to task list items
        html = html.replace(/<li>\s*\[\s*([x\s]*)\s*\]\s*(.*?)\s*<\/li>/g, function(match, checked, text) {
            const isChecked = checked.trim().toLowerCase() === 'x' || checked.includes('x');
            const checkedAttr = isChecked ? ' checked' : '';
            return `<li class="task-list-item${isChecked ? ' checked' : ''}"><input type="checkbox"${checkedAttr} disabled> <span>${text}</span></li>`;
        });

        // ====================
        // SPOILER SECTIONS
        // ====================
        // >! Spoiler content !<
        html = html.replace(/^>!\s*(.*?)\s*!<$/gim, function(match, content) {
            return `<div class="spoiler"><div class="spoiler-header">Spoiler</div><div class="spoiler-content">${content}</div></div>`;
        });

        // ====================
        // MENTIONS
        // ====================
        // User mentions @username
        html = html.replace(/@([a-zA-Z0-9_-]+)/g, '<span class="mention-user">@$1</span>');

        // Issue/PR mentions #123
        html = html.replace(/#(\d+)/g, '<span class="mention-issue">#$1</span>');

        // ====================
        // RESTORE COLORS (must be after Issue/PR mentions to prevent fragmentation)
        // ====================
        // Restore HEX colors
        html = html.replace(/<!--HEX_COLOR_(\d+)-->/g, function(match, index) {
            const colorData = hexColors[index];
            return `<span class="color-box" style="background-color: ${colorData.hex}; color: ${colorData.textColor};">${colorData.hex}</span>`;
        });

        // Restore RGB colors
        html = html.replace(/<!--RGB_COLOR_(\d+)-->/g, function(match, index) {
            const colorData = rgbColors[index];
            return `<span class="color-box" style="background-color: rgb(${colorData.r}, ${colorData.g}, ${colorData.b}); color: ${colorData.textColor};">${colorData.hex}</span>`;
        });

        // Restore HSL colors
        html = html.replace(/<!--HSL_COLOR_(\d+)-->/g, function(match, index) {
            const colorData = hslColors[index];
            return `<span class="color-box" style="background-color: hsl(${colorData.h}, ${colorData.s}%, ${colorData.l}%); color: ${colorData.textColor};">${colorData.hex}</span>`;
        });

        // ====================
        // BADGES
        // ====================
        // ::badge(color)text::
        html = html.replace(/::badge\((blue|green|red|yellow|purple)\)\s*([^:]+)::/g, function(match, color, text) {
            return `<span class="badge badge-${color}">${text}</span>`;
        });

        // ====================
        // MATH LATEX
        // ====================
        // Inline math $E=mc^2$
        html = html.replace(/\$([^$]+)\$/g, '<span class="math">$1</span>');

        // Block math $$...$$
        html = html.replace(/\$\$([\s\S]*?)\$\$/g, function(match, math) {
            return `<div class="math-block">${math}</div>`;
        });

        // ====================
        // FOOTNOTES
        // ====================
        const footnotes = [];
        html = html.replace(/\[\^([^\]]+)\]/g, function(match, id) {
            const index = footnotes.indexOf(id);
            const refIndex = index === -1 ? footnotes.length : index;
            if (index === -1) footnotes.push(id);
            return `<sup class="footnote-ref">[${refIndex + 1}]</sup>`;
        });

        // Add footnotes section if any
        if (footnotes.length > 0) {
            html += `<div class="footnotes"><h4>Footnotes</h4>`;
            footnotes.forEach(function(id, index) {
                html += `<div class="footnote-item"><sup>[${index + 1}]</sup> ${id}</div>`;
            });
            html += '</div>';
        }

        return html;
    }

    processLists(html) {
        const lines = html.split('\n');
        let result = [];
        let inList = false;
        let listType = null;
        let indentLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const listMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
            
            if (listMatch) {
                const indent = listMatch[1].length;
                const marker = listMatch[2];
                const content = listMatch[3];

                if (!inList) {
                    inList = true;
                    listType = marker;
                    result.push('<ul>');
                }

                // Handle nested lists
                if (indent > indentLevel) {
                    result.push('<ul>');
                } else if (indent < indentLevel) {
                    result.push('</ul>');
                }

                indentLevel = indent;
                result.push(`<li>${content}</li>`);
            } else {
                if (inList) {
                    while (indentLevel > 0) {
                        result.push('</ul>');
                        indentLevel -= 2;
                    }
                    result.push('</ul>');
                    inList = false;
                }
                result.push(line);
            }
        }

        if (inList) {
            while (indentLevel > 0) {
                result.push('</ul>');
                indentLevel -= 2;
            }
            result.push('</ul>');
        }

        return result.join('\n');
    }

    processBlockquotes(html) {
        const lines = html.split('\n');
        let result = [];
        let inBlockquote = false;
        let quoteLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const quoteMatch = line.match(/^(\s*)>\s*(.*)$/);

            if (quoteMatch) {
                const indent = quoteMatch[1].length;
                const content = quoteMatch[2];

                if (!inBlockquote) {
                    inBlockquote = true;
                    quoteLevel = 0;
                    result.push('<blockquote>');
                } else if (indent > quoteLevel) {
                    result.push('<blockquote>');
                    quoteLevel = indent;
                } else if (indent < quoteLevel) {
                    result.push('</blockquote>');
                    quoteLevel = indent;
                }

                result.push(content);
            } else {
                if (inBlockquote) {
                    while (quoteLevel > 0) {
                        result.push('</blockquote>');
                        quoteLevel -= 2;
                    }
                    result.push('</blockquote>');
                    inBlockquote = false;
                }
                result.push(line);
            }
        }

        if (inBlockquote) {
            while (quoteLevel > 0) {
                result.push('</blockquote>');
                quoteLevel -= 2;
            }
            result.push('</blockquote>');
        }

        return result.join('\n');
    }

    processTables(html) {
        return html.replace(
            /((?:^\s*\|.*\|\s*$\r?\n?){2,})/gm,
            (block) => {
                const lines = block
                    .trim()
                    .split(/\r?\n/)
                    .map(l => l.trim())
                    .filter(l => l.startsWith('|') && l.endsWith('|'));

                if (lines.length < 2) return block;

                const header = lines[0];
                const separator = lines[1];

                if (!/^\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(separator)) {
                    return block;
                }

                const bodyLines = lines.slice(2);

                const toCells = (row) =>
                    row
                        .slice(1, -1)
                        .split('|')
                        .map(c => c.trim());

                const headerCells = toCells(header);
                const thead = `<thead><tr>${headerCells.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;

                const tbodyRows = bodyLines
                    .map(r => {
                        const cells = toCells(r);
                        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
                    })
                    .join('');

                return `<table>${thead}<tbody>${tbodyRows}</tbody></table>`;
            }
        );
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
            if (!page || !page.path || typeof page.path !== 'string') return;

            const parts = page.path.split('/').filter(Boolean);
            if (parts.length === 0) return;

            let current = tree;

            parts.forEach((part, index) => {
                if (!current[part]) {
                    const isFile = index === parts.length - 1;
                    current[part] = {
                        type: isFile ? 'file' : 'folder',
                        path: parts.slice(0, index + 1).join('/'),
                        title: isFile ? (page.title || part) : part,
                        ...(isFile ? {} : { children: {} })
                    };
                }

                if (index < parts.length - 1) {
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
            const isExpanded = level < 2;

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
