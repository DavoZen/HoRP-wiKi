class HoRPWiki {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        this.pages = [];
        this.currentTheme = localStorage.getItem('wiki-theme') || 'light';
        this.init();
    }

    async init() {
        console.log('🏁 Ініціалізація HoRP-wiKi...');
        
        this.setupTheme();
        this.setupEventListeners();
        await this.loadData();
        this.updateUI();
        
        console.log(' HoRP-wiKi готовий до роботи');
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
                
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Пошук
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    }

    // Завантаження даних з GitHub
    async loadData() {
        console.log(' Завантаження даних з GitHub...');
        
        try {
            // Спроба завантажити з кешу
            if (this.loadFromCache()) {
                console.log(' Дані завантажено з кешу');
                return;
            }

            // Завантаження з GitHub
            await this.scanRepository();
            this.cacheData();
            
        } catch (error) {
            console.error(' Помилка завантаження:', error);
            this.showError('Не вдалося завантажити дані з GitHub. Перевірте підключення до інтернету.');
        }
    }

    async scanRepository() {
        console.log('🔍 Сканування репозиторію...');
        
        try {
            const contents = await this.fetchGitHubContents('pages');
            this.pages = await this.buildPagesList(contents, 'pages');
            console.log(` Знайдено ${this.pages.length} сторінок`);
            
        } catch (error) {
            console.error(' Помилка сканування:', error);
            
            // Якщо папка pages не існує, спробуємо знайти .md файли в корені
            try {
                console.log(' Спроба знайти файли в корені репозиторію...');
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
                
                console.log(` Знайдено ${this.pages.length} .md файлів у корені`);
                
            } catch (rootError) {
                console.error(' Помилка пошуку в корені:', rootError);
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
                    console.error(` Помилка завантаження папки ${item.path}:`, error);
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
        console.log(' Дані збережено в кеш');
    }

    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                // Перевірка актуальності кешу (12 годин)
                if (Date.now() - cache.timestamp < 12 * 60 * 60 * 1000) {
                    this.pages = cache.pages;
                    return true;
                }
            } catch (error) {
                console.error(' Помилка завантаження кешу:', error);
            }
        }
        return false;
    }

    // Пошук
    handleSearchInput(query) {
        if (query.length < 2) return;
        this.performSearch(query);
    }

    performSearch(query = null) {
        const searchQuery = query || document.getElementById('searchInput').value.trim();
        
        if (!searchQuery) {
            this.showSection('main');
            return;
        }

        this.showSection('search');
        
        const results = this.searchPages(searchQuery);
        this.displaySearchResults(results, searchQuery);
    }

    searchPages(query) {
        if (this.pages.length === 0) return [];
    
        const lowerQuery = query.toLowerCase();

        return this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery) ||
            page.path.toLowerCase().includes(lowerQuery) ||
            page.category.toLowerCase().includes(lowerQuery) ||
            (page.content && page.content.includes(lowerQuery)) // <-- додаємо пошук по тексту
        );
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
            console.log(` Завантаження: ${page.url}`);
            const response = await fetch(page.url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            this.displayArticle(page, content);
            
        } catch (error) {
            console.error(' Помилка завантаження статті:', error);
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
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
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
        const categories = this.getCategoriesWithCounts();
        
        if (categories.length === 0) {
            container.innerHTML = '<div class="no-data">Ще немає категорій</div>';
            return;
        }
        
        container.innerHTML = categories.map(cat => `
            <a href="#" class="nav-link" onclick="wiki.showCategory('${cat.name}')">
                ${cat.name} <small>(${cat.count})</small>
            </a>
        `).join('');
    }

    // Додаткові функції
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


    // Проста наукова міні-калькуляторна функція
    class HoRPCalc {
        constructor() {
            this.input = document.getElementById('calcInput');
            this.btn = document.getElementById('calcBtn');
            this.result = document.getElementById('calcResult');

            if (this.btn && this.input) {
                this.btn.addEventListener('click', () => this.calculate());
                this.input.addEventListener('keypress', e => {
                    if (e.key === 'Enter') this.calculate();
                });
            }
        }

        calculate() {
            let expr = this.input.value.trim();
            if (!expr) return;

            try {
                // Замінюємо кому на крапку
                expr = expr.replace(/,/g, '.');

                // Підтримка базових функцій
                expr = expr
                    .replace(/\bpi\b/gi, 'Math.PI')
                    .replace(/\be\b/gi, 'Math.E')
                    .replace(/\bsin\(/gi, 'Math.sin((')
                    .replace(/\bcos\(/gi, 'Math.cos((')
                    .replace(/\btan\(/gi, 'Math.tan((')
                    .replace(/\bsqrt\(/gi, 'Math.sqrt((')
                    .replace(/\blog\(/gi, 'Math.log10((')
                    .replace(/\bln\(/gi, 'Math.log((')
                    .replace(/\^/g, '**');

                // Виконуємо обчислення без доступу до глобальних об’єктів
                const result = Function(`"use strict"; return (${expr});`)();
                if (isNaN(result)) throw new Error('Некоректне значення');
            
                this.result.textContent = `= ${result.toFixed(6)}`;
            } catch (err) {
                this.result.textContent = 'Помилка: перевірте вираз';
            }
        }
    }

    // ініціалізація калькулятора
    window.addEventListener('DOMContentLoaded', () => new HoRPCalc());


    
    
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
    } else {
        alert('Ще немає статей для перегляду');
    }
}

function refreshData() {
    localStorage.removeItem('wikiCache');
    window.location.reload();
}
