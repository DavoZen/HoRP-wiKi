class HoRPWiki {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        
        this.pages = [];
        this.structure = {};
        this.currentTheme = localStorage.getItem('wiki-theme') || 'light';
        this.searchIndex = [];
        
        this.init();
    }

    async init() {
        console.log('🏁 Ініціалізація HoRP-wiKi...');
        
        this.setupTheme();
        this.setupEventListeners();
        await this.loadData();
        this.updateUI();
        
        console.log('✅ HoRP-wiKi готовий до роботи');
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Оновлюємо активні кнопки теми
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });
        
        // Автоматична тема
        if (this.currentTheme === 'auto') {
            this.applyAutoTheme();
        }
    }

    applyAutoTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    setupEventListeners() {
        // Перемикачі теми
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTheme = e.target.dataset.theme;
                localStorage.setItem('wiki-theme', this.currentTheme);
                this.setupTheme();
            });
        });

        // Навігація
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
                
                // Оновлюємо активний стан
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Пошук
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        searchInput.addEventListener('focus', () => this.showSearchSuggestions());
        searchInput.addEventListener('blur', () => {
            setTimeout(() => this.hideSearchSuggestions(), 200);
        });

        // Media query для автоматичної теми
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === 'auto') {
                this.applyAutoTheme();
            }
        });
    }

    async loadData() {
        try {
            this.showLoading('Завантаження даних...');
            
            // Спроба завантажити з кешу
            if (this.loadFromCache()) {
                console.log('📂 Дані завантажено з кешу');
                return;
            }

            // Завантаження з GitHub
            await this.scanRepository();
            this.cacheData();
            
        } catch (error) {
            console.error('❌ Помилка завантаження:', error);
            this.loadFallbackData();
        }
    }

    async scanRepository() {
        console.log('🔍 Сканування репозиторію...');
        
        try {
            const contents = await this.fetchGitHubContents('pages');
            this.structure = await this.buildStructure(contents, 'pages');
            this.pages = this.extractPagesFromStructure(this.structure);
            this.buildSearchIndex();
            
            console.log(`✅ Знайдено ${this.pages.length} сторінок`);
            
        } catch (error) {
            console.error('❌ Помилка сканування:', error);
            throw error;
        }
    }

    async fetchGitHubContents(path) {
        const response = await fetch(`${this.apiBaseUrl}/${path}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    async buildStructure(contents, currentPath) {
        const node = {
            name: currentPath.split('/').pop() || 'pages',
            path: currentPath,
            type: 'folder',
            children: []
        };

        for (const item of contents) {
            if (item.type === 'dir') {
                try {
                    const subContents = await this.fetchGitHubContents(item.path);
                    const subNode = await this.buildStructure(subContents, item.path);
                    node.children.push(subNode);
                } catch (error) {
                    console.error(`❌ Помилка завантаження папки ${item.path}:`, error);
                }
            } else if (item.type === 'file' && item.name.endsWith('.md')) {
                node.children.push({
                    name: item.name.replace('.md', ''),
                    path: item.path,
                    type: 'file',
                    url: item.download_url,
                    size: item.size
                });
            }
        }

        return node;
    }

    extractPagesFromStructure(structure) {
        const pages = [];
        
        function traverse(node) {
            if (node.type === 'file') {
                const pagePath = node.path.replace('pages/', '').replace('.md', '');
                pages.push({
                    title: node.name,
                    path: pagePath,
                    url: node.url,
                    size: node.size,
                    category: this.getCategoryFromPath(pagePath)
                });
            } else if (node.children) {
                node.children.forEach(traverse.bind(this));
            }
        }
        
        traverse.call(this, structure);
        return pages;
    }

    getCategoryFromPath(path) {
        const parts = path.split('/');
        return parts.length > 1 ? parts[0] : 'Інше';
    }

    buildSearchIndex() {
        this.searchIndex = this.pages.map(page => ({
            title: page.title.toLowerCase(),
            path: page.path.toLowerCase(),
            category: page.category.toLowerCase(),
            page: page
        }));
    }

    // Пошук
    handleSearchInput(query) {
        if (query.length === 0) {
            this.hideSearchSuggestions();
            return;
        }

        if (query.length < 2) {
            this.showSearchSuggestions(['Введіть щонайменше 2 символи...']);
            return;
        }

        const suggestions = this.searchPages(query, 5);
        this.showSearchSuggestions(suggestions);
    }

    searchPages(query, limit = 50) {
        const lowerQuery = query.toLowerCase();
        const results = [];

        // Пошук в назвах (вищий пріоритет)
        const titleResults = this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery)
        ).slice(0, limit);

        // Пошук в шляхах
        const pathResults = this.pages.filter(page => 
            page.path.toLowerCase().includes(lowerQuery) &&
            !titleResults.includes(page)
        ).slice(0, limit - titleResults.length);

        // Пошук в категоріях
        const categoryResults = this.pages.filter(page => 
            page.category.toLowerCase().includes(lowerQuery) &&
            !titleResults.includes(page) &&
            !pathResults.includes(page)
        ).slice(0, limit - titleResults.length - pathResults.length);

        // Об'єднання результатів
        return [...titleResults, ...pathResults, ...categoryResults];
    }

    async performSearch(query = null) {
        const searchQuery = query || document.getElementById('searchInput').value.trim();
        
        if (!searchQuery) {
            this.showSection('main');
            return;
        }

        this.showSection('search');
        this.showLoading('Пошук...', 'searchResults');

        // Імітація затримки пошуку
        await new Promise(resolve => setTimeout(resolve, 300));

        const results = this.searchPages(searchQuery);
        this.displaySearchResults(results, searchQuery);
    }

    displaySearchResults(results, query) {
        const container = document.getElementById('searchResults');
        const meta = document.getElementById('searchMeta');

        if (results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>Результатів не знайдено</h3>
                    <p>Немає результатів для "<strong>${query}</strong>"</p>
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
                <div class="search-category">Категорія: ${result.category}</div>
            </div>
        `).join('');
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showSearchSuggestions(suggestions) {
        const container = document.getElementById('searchSuggestions');
        
        if (!suggestions || suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        if (typeof suggestions[0] === 'string') {
            container.innerHTML = `<div class="search-suggestion">${suggestions[0]}</div>`;
        } else {
            container.innerHTML = suggestions.map(page => `
                <div class="search-suggestion" onclick="wiki.loadPage('${page.path}')">
                    ${page.title} <small>(${page.category})</small>
                </div>
            `).join('');
        }
        
        container.style.display = 'block';
    }

    hideSearchSuggestions() {
        const container = document.getElementById('searchSuggestions');
        container.style.display = 'none';
    }

    // Навігація
    showSection(sectionName) {
        // Приховуємо всі секції
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Показуємо потрібну секцію
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
            case 'search':
                // Контент оновлюється при пошуку
                break;
        }
    }

    updateMainPage() {
        this.updatePopularArticles();
        this.updateMainCategories();
    }

    updatePopularArticles() {
        const container = document.getElementById('popularArticles');
        const popular = this.pages.slice(0, 8); // Перші 8 як популярні
        
        container.innerHTML = popular.map(page => `
            <a href="#" class="article-link" onclick="wiki.loadPage('${page.path}')">${page.title}</a>
        `).join('');
    }

    updateMainCategories() {
        const container = document.getElementById('mainCategories');
        const categories = this.getCategoriesWithCounts().slice(0, 8);
        
        container.innerHTML = categories.map(cat => `
            <a href="#" class="category-link" onclick="wiki.showCategory('${cat.name}')">${cat.name} (${cat.count})</a>
        `).join('');
    }

    updateArticlesPage() {
        const container = document.getElementById('articlesList');
        const count = document.getElementById('articlesCount');
        
        count.textContent = `${this.pages.length} статей`;
        container.innerHTML = this.pages.map(page => `
            <div class="article-card" onclick="wiki.loadPage('${page.path}')">
                <h3>${page.title}</h3>
                <div class="article-path">${page.path}</div>
                <div class="article-category">Категорія: ${page.category}</div>
            </div>
        `).join('');
    }

    updateCategoriesPage() {
        const container = document.getElementById('categoriesGrid');
        const categories = this.getCategoriesWithCounts();
        
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
        // Можна реалізувати сторінку категорії
        this.showSection('articles');
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
            const response = await fetch(page.url);
            if (!response.ok) throw new Error('Не вдалося завантажити статтю');
            
            const content = await response.text();
            this.displayArticle(page, content);
            
        } catch (error) {
            console.error('❌ Помилка завантаження статті:', error);
            this.showError('Помилка завантаження статті', 'articleContent');
        }
    }

    displayArticle(page, content) {
        // Оновлюємо заголовок
        document.getElementById('articleTitle').textContent = page.title;
        
        // Оновлюємо хлібні крихти
        this.updateBreadcrumbs(page);
        
        // Оновлюємо мета-інформацію
        document.getElementById('articleModified').textContent = `Востаннє редагувалося: ${new Date().toLocaleDateString('uk-UA')}`;
        
        // Конвертуємо та відображаємо контент
        const htmlContent = this.convertMarkdownToHtml(content);
        document.getElementById('articleContent').innerHTML = htmlContent;
        
        // Оновлюємо додаткову інформацію
        this.updateArticleInfo(page);
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
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" loading="lazy">')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\[\[(.*?)\]\]/g, (match, pageName) => {
                const foundPage = this.pages.find(p => p.title === pageName || p.path === pageName);
                return foundPage ? 
                    `<a href="#" onclick="wiki.loadPage('${foundPage.path}')">${pageName}</a>` :
                    `<span class="broken-link" title="Стаття не знайдена">${pageName}</span>`;
            })
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    updateArticleInfo(page) {
        // Категорії
        const categories = document.getElementById('articleCategories');
        categories.innerHTML = `<a href="#" onclick="wiki.showCategory('${page.category}')">${page.category}</a>`;

        // Пов'язані статті
        const related = this.getRelatedArticles(page);
        const relatedContainer = document.getElementById('relatedArticles');
        relatedContainer.innerHTML = related.map(rel => `
            <div><a href="#" onclick="wiki.loadPage('${rel.path}')">${rel.title}</a></div>
        `).join('');
    }

    getRelatedArticles(page) {
        // Спрощена логіка для пов'язаних статей
        return this.pages
            .filter(p => p.category === page.category && p.path !== page.path)
            .slice(0, 5);
    }

    // Допоміжні методи
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
        
        // Футер
        document.getElementById('footerArticles').textContent = `${this.pages.length} статей`;
        document.getElementById('footerCategories').textContent = `${this.getCategoriesWithCounts().length} категорій`;
    }

    updateSidebar() {
        const container = document.getElementById('sidebarNav');
        container.innerHTML = this.buildSidebarNavigation();
    }

    buildSidebarNavigation() {
        // Спрощена навігація по категоріям
        const categories = this.getCategoriesWithCounts();
        
        return categories.map(cat => `
            <a href="#" class="nav-link" onclick="wiki.showCategory('${cat.name}')">
                ${cat.name} <small>(${cat.count})</small>
            </a>
        `).join('');
    }

    // Кешування
    cacheData() {
        const cache = {
            pages: this.pages,
            structure: this.structure,
            timestamp: Date.now()
        };
        localStorage.setItem('wikiCache', JSON.stringify(cache));
    }

    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                // Перевірка актуальності кешу (12 годин)
                if (Date.now() - cache.timestamp < 12 * 60 * 60 * 1000) {
                    this.pages = cache.pages;
                    this.structure = cache.structure;
                    this.buildSearchIndex();
                    return true;
                }
            } catch (error) {
                console.error('❌ Помилка завантаження кешу:', error);
            }
        }
        return false;
    }

    loadFallbackData() {
        console.log('🔄 Завантаження тестових даних...');
        this.pages = [
            {
                title: 'Головна сторінка',
                path: 'main',
                url: `${this.baseUrl}/pages/main.md`,
                size: 1024,
                category: 'Основне'
            },
            {
                title: 'Python програмування',
                path: 'programming/python',
                url: `${this.baseUrl}/pages/programming/python.md`,
                size: 2048,
                category: 'Програмування'
            },
            {
                title: 'Фізика для початківців',
                path: 'science/physics',
                url: `${this.baseUrl}/pages/science/physics.md`,
                size: 1536,
                category: 'Наука'
            }
        ];
        this.buildSearchIndex();
        this.updateUI();
    }

    // Додаткові функції
    editArticle() {
        const currentPage = this.pages.find(p => p.title === document.getElementById('articleTitle').textContent);
        if (currentPage) {
            window.open(`https://github.com/${this.repoOwner}/${this.repoName}/edit/main/pages/${currentPage.path}.md`, '_blank');
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
        const randomPage = wiki.pages[Math.floor(Math.random() * wiki.pages.length)];
        wiki.loadPage(randomPage.path);
    }
}

function refreshData() {
    localStorage.removeItem('wikiCache');
    window.location.reload();
}
