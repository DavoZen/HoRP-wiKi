class WikiEngine {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        this.pages = [];
        this.structure = {};
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('Ініціалізація HoRP-wiKi...');
        
        // Завантаження даних
        await this.loadData();
        
        // Ініціалізація інтерфейсу
        this.initUI();
        
        this.isInitialized = true;
        console.log('HoRP-wiKi готовий до роботи');
    }

    async loadData() {
        try {
            this.showLoading('Завантаження даних...');
            
            // Спроба завантажити з кешу
            if (this.loadFromCache()) {
                this.updateUI();
                return;
            }

            // Завантаження з GitHub
            await this.scanRepository();
            
        } catch (error) {
            console.error('Помилка завантаження:', error);
            this.showError('Помилка завантаження даних');
        }
    }

    async scanRepository() {
        console.log('Сканування репозиторію...');
        
        try {
            const contents = await this.fetchGitHubContents('pages');
            this.structure = await this.buildStructure(contents, 'pages');
            this.pages = this.extractPagesFromStructure(this.structure);
            
            this.cacheData();
            this.updateUI();
            
        } catch (error) {
            console.error('Помилка сканування:', error);
            this.loadFallbackData();
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
                const subContents = await this.fetchGitHubContents(item.path);
                const subNode = await this.buildStructure(subContents, item.path);
                node.children.push(subNode);
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
                    size: node.size
                });
            } else if (node.children) {
                node.children.forEach(traverse);
            }
        }
        
        traverse(structure);
        return pages;
    }

    loadFallbackData() {
        console.log('Використання тестових даних');
        this.pages = [
            { title: 'Головна', path: 'home', url: `${this.baseUrl}/pages/home.md`, size: 1024 },
            { title: 'Python', path: 'programming/python', url: `${this.baseUrl}/pages/programming/python.md`, size: 2048 }
        ];
        this.updateUI();
    }

    // UI Methods
    initUI() {
        this.setupEventListeners();
        this.showSection('main');
    }

    setupEventListeners() {
        // Обробка пошуку
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });
    }

    handleSearchInput(query) {
        if (query.length > 2) {
            this.performSearch(query);
        }
    }

    async performSearch(query = null) {
        const searchQuery = query || document.getElementById('searchInput').value;
        
        if (!searchQuery.trim()) {
            this.showSection('main');
            return;
        }

        this.showSection('search');
        this.showLoading('Пошук...');

        const results = await this.searchPages(searchQuery);
        this.displaySearchResults(results, searchQuery);
    }

    async searchPages(query) {
        const lowerQuery = query.toLowerCase();
        const results = [];

        // Пошук в назвах
        const titleResults = this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery)
        );

        // Пошук в контенті (обмежено для продуктивності)
        for (const page of this.pages.slice(0, 10)) {
            try {
                const response = await fetch(page.url);
                const content = await response.text();
                
                if (content.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        ...page,
                        excerpt: this.generateExcerpt(content, query),
                        matchType: 'content'
                    });
                }
            } catch (error) {
                console.error(`Помилка пошуку в ${page.title}:`, error);
            }
        }

        // Об'єднання результатів
        titleResults.forEach(titleResult => {
            if (!results.some(r => r.path === titleResult.path)) {
                results.push({...titleResult, matchType: 'title', excerpt: ''});
            }
        });

        return results.sort((a, b) => {
            if (a.matchType === 'title' && b.matchType !== 'title') return -1;
            if (a.matchType !== 'title' && b.matchType === 'title') return 1;
            return 0;
        });
    }

    generateExcerpt(content, query) {
        const index = content.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return content.substring(0, 150) + '...';
        
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 100);
        return content.substring(start, end) + '...';
    }

    async loadPage(pagePath) {
        await this.pageTransition();
        
        const page = this.pages.find(p => p.path === pagePath);
        if (!page) {
            this.showError('Сторінку не знайдено');
            return;
        }

        this.showSection('article');
        
        try {
            const response = await fetch(page.url);
            const content = await response.text();
            const html = this.convertMarkdownToHtml(content);
            
            document.getElementById('article-title').textContent = page.title;
            document.getElementById('breadcrumbs').innerHTML = this.generateBreadcrumbs(pagePath);
            document.getElementById('article-content').innerHTML = html;
            
        } catch (error) {
            this.showError('Помилка завантаження сторінки');
        }
    }

    convertMarkdownToHtml(markdown) {
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        return '<p>' + html + '</p>';
    }

    generateBreadcrumbs(pagePath) {
        const parts = pagePath.split('/');
        let breadcrumbs = '<a href="#" onclick="wiki.showSection(\'main\')">Головна</a>';
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            breadcrumbs += ` › <a href="#" onclick="wiki.loadPage('${currentPath}')">${part}</a>`;
        });

        return breadcrumbs;
    }

    // UI Navigation
    showSection(sectionName) {
        // Приховуємо всі секції
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Показуємо потрібну секцію
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Оновлюємо активну навігацію
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
    }

    async pageTransition() {
        const transition = document.querySelector('.page-transition');
        transition.classList.add('active');
        
        await new Promise(resolve => setTimeout(resolve, 400));
        transition.classList.remove('active');
    }

    showLoading(message) {
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            activeSection.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showError(message) {
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            activeSection.innerHTML = `
                <div class="error-container">
                    <h3>Помилка</h3>
                    <p>${message}</p>
                    <button onclick="wiki.showSection('main')">На головну</button>
                </div>
            `;
        }
    }

    updateUI() {
        this.updateStats();
        this.updateCategories();
        this.updateAllPages();
    }

    updateStats() {
        document.getElementById('total-pages').textContent = this.pages.length;
        document.getElementById('total-categories').textContent = this.countCategories();
        document.getElementById('last-update').textContent = 'сьогодні';
    }

    updateCategories() {
        const categories = this.extractCategories();
        const container = document.getElementById('categories-list');
        
        container.innerHTML = categories.map(cat => `
            <div class="category-item" onclick="wiki.showCategory('${cat}')">
                <h4>${cat}</h4>
                <span>${this.countPagesInCategory(cat)} статей</span>
            </div>
        `).join('');
    }

    updateAllPages() {
        const container = document.getElementById('all-pages-list');
        const count = document.getElementById('pages-count');
        
        count.textContent = `${this.pages.length} сторінок`;
        container.innerHTML = this.pages.map(page => `
            <div class="page-item" onclick="wiki.loadPage('${page.path}')">
                <h3>${page.title}</h3>
                <div class="page-path">${page.path}</div>
            </div>
        `).join('');
    }

    displaySearchResults(results, query) {
        const container = document.getElementById('search-results');
        const info = document.getElementById('search-info');
        
        info.textContent = `Знайдено ${results.length} результатів для "${query}"`;
        container.innerHTML = results.map(result => `
            <div class="page-item" onclick="wiki.loadPage('${result.path}')">
                <h3>${result.title}</h3>
                <div class="page-path">${result.path}</div>
                ${result.excerpt ? `<div class="search-excerpt">${result.excerpt}</div>` : ''}
            </div>
        `).join('');
    }

    // Допоміжні методи
    countCategories() {
        const categories = new Set();
        this.pages.forEach(page => {
            const parts = page.path.split('/');
            if (parts.length > 1) {
                categories.add(parts[0]);
            }
        });
        return categories.size;
    }

    extractCategories() {
        const categories = new Set();
        this.pages.forEach(page => {
            const parts = page.path.split('/');
            if (parts.length > 1) {
                categories.add(parts[0]);
            }
        });
        return Array.from(categories);
    }

    countPagesInCategory(category) {
        return this.pages.filter(page => page.path.startsWith(category)).length;
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
                // Перевірка актуальності кешу (1 день)
                if (Date.now() - cache.timestamp < 24 * 60 * 60 * 1000) {
                    this.pages = cache.pages;
                    this.structure = cache.structure;
                    return true;
                }
            } catch (error) {
                console.error('Помилка завантаження кешу:', error);
            }
        }
        return false;
    }
}

// Глобальний екземпляр
const wiki = new WikiEngine();

// Глобальні функції
function showSection(section) {
    wiki.showSection(section);
}

function performSearch() {
    wiki.performSearch();
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function showRandomPage() {
    if (wiki.pages.length > 0) {
        const randomPage = wiki.pages[Math.floor(Math.random() * wiki.pages.length)];
        wiki.loadPage(randomPage.path);
    }
}

function refreshData() {
    wiki.scanRepository();
}
