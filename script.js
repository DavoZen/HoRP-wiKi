class HoRPWiki {
    constructor() {
        this.pages = [];
        this.currentTheme = localStorage.getItem('wiki-theme') || 'light';
        this.init();
    }

    async init() {
        console.log('🏁 Ініціалізація HoRP-wiKi...');
        
        this.setupTheme();
        this.setupEventListeners();
        this.loadTestData(); // Використовуємо тестові дані замість GitHub
        this.updateUI();
        
        console.log('✅ HoRP-wiKi готовий до роботи');
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

    // Тестові дані
    loadTestData() {
        console.log('📝 Завантаження тестових даних...');
        
        this.pages = [
            {
                title: 'Головна сторінка',
                path: 'main',
                content: `# Ласкаво просимо до HoRP-wiKi

## Що таке HoRP-wiKi?

Це вільна енциклопедія, створена спільнотою HoRP. Тут ви можете знайти інформацію про різні аспекти нашого проекту.

## Основні розділи

- **Програмування** - статті про мови програмування
- **Наука** - матеріали з фізики, математики, хімії
- **Історія** - історичні події та факти
- **Мистецтво** - література, музика, живопис

## Як долучитися?

Кожен може редагувати та доповнювати статті. Для цього:
1. Натисніть кнопку "Редагувати" на сторінці статті
2. Внесіть зміни у текст
3. Збережіть зміни

**Приєднуйтесь до нашої спільноти!**`,
                category: 'Основне'
            },
            {
                title: 'Python',
                path: 'programming/python',
                content: `# Python

Python - це інтерпретована, об'єктно-орієнтована мова програмування високого рівня.

## Особливості

- Простий та зрозумілий синтаксис
- Динамічна типізація
- Велика стандартна бібліотека
- Підтримка різних парадигм програмування

## Приклад коду

\`\`\`python
def hello_world():
    print("Привіт, світ!")
    
hello_world()
\`\`\`

## Застосування

- Веб-розробка (Django, Flask)
- Наука про дані
- Машинне навчання
- Автоматизація`,
                category: 'Програмування'
            },
            {
                title: 'Фізика',
                path: 'science/physics',
                content: `# Фізика

Фізика - це природнича наука, що вивчає загальні закони природи.

## Основні розділи

### Механіка
Вивчає рух тіл та взаємодію між ними.

### Термодинаміка
Досліджує теплові явища.

### Електромагнетизм
Вивчає електричні та магнітні явища.

## Важливі закони

- **Закон збереження енергії**
- **Другий закон Ньютона**
- **Закон всесвітнього тяжіння**`,
                category: 'Наука'
            },
            {
                title: 'Україна',
                path: 'history/ukraine',
                content: `# Україна

Україна - держава в Східній Європі.

## Історія

### Київська Русь
Перша східнослов'янська держава з центром у Києві.

### Козацтво
Вільне військове товариство, що існувало в XVI-XVIII століттях.

### Сучасність
Незалежність відновлена 24 серпня 1991 року.

## Географія

- **Площа**: 603,628 км²
- **Населення**: близько 40 мільйонів
- **Столиця**: Київ`,
                category: 'Історія'
            },
            {
                title: 'Математика',
                path: 'science/mathematics',
                content: `# Математика

Математика - наука про кількість, структуру, простір та зміну.

## Основні галузі

### Алгебра
Вивчає операції та відношення.

### Геометрія
Досліджує просторові відношення.

### Аналіз
Занимається пределами, производными и интегралами.

## Важливі поняття

- Числа
- Функції
- Рівняння
- Теореми`,
                category: 'Наука'
            },
            {
                title: 'JavaScript',
                path: 'programming/javascript',
                content: `# JavaScript

JavaScript - мова програмування для створення інтерактивних веб-сторінок.

## Особливості

- Виконується в браузері
- Динамічна типізація
- Подієво-орієнтована
- Асинхронне програмування

## Синтаксис

\`\`\`javascript
// Функція привітання
function greet(name) {
    return 'Привіт, ' + name + '!';
}

console.log(greet('світе'));
\`\`\``,
                category: 'Програмування'
            },
            {
                title: 'Хімія',
                path: 'science/chemistry',
                content: `# Хімія

Хімія - наука про речовини, їх властивості та перетворення.

## Основні розділи

### Органічна хімія
Вивчає сполуки вуглецю.

### Неорганічна хімія
Досліджує інші хімічні елементи.

### Фізична хімія
Застосовує фізичні методи.

## Періодична система

Система хімічних елементів, упорядкована за атомними номерами.`,
                category: 'Наука'
            },
            {
                title: 'Література',
                path: 'art/literature',
                content: `# Література

Література - мистецтво слова, що відображає життя за допомогою мови.

## Жанри

### Поезія
Віршовані твори з ритмом та римою.

### Проза
Оповідні твори без віршованої форми.

### Драма
Твори, призначені для сценічного виконання.

## Українська література

Багата спадщина від "Слова о полку Ігоревім" до сучасних авторів.`,
                category: 'Мистецтво'
            }
        ];

        console.log(`✅ Завантажено ${this.pages.length} тестових сторінок`);
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
        const lowerQuery = query.toLowerCase();
        return this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery) ||
            page.content.toLowerCase().includes(lowerQuery) ||
            page.category.toLowerCase().includes(lowerQuery)
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
                <div class="search-excerpt">${this.generateExcerpt(result.content, query)}</div>
            </div>
        `).join('');
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    generateExcerpt(content, query) {
        const index = content.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return content.substring(0, 150) + '...';
        
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 100);
        let excerpt = content.substring(start, end);
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        excerpt = excerpt.replace(regex, '<mark>$1</mark>');
        
        return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
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
        const popular = this.pages.slice(0, 8);
        
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
        this.showSection('articles');
    }

    // Завантаження статті
    loadPage(pagePath) {
        this.showSection('article');

        const page = this.pages.find(p => p.path === pagePath);
        if (!page) {
            this.showError('Статтю не знайдено', 'articleContent');
            return;
        }

        this.displayArticle(page);
    }

    displayArticle(page) {
        document.getElementById('articleTitle').textContent = page.title;
        this.updateBreadcrumbs(page);
        
        document.getElementById('articleModified').textContent = `Востаннє редагувалося: ${new Date().toLocaleDateString('uk-UA')}`;
        
        const htmlContent = this.convertMarkdownToHtml(page.content);
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
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    updateArticleInfo(page) {
        const categories = document.getElementById('articleCategories');
        categories.innerHTML = `<a href="#" onclick="wiki.showCategory('${page.category}')">${page.category}</a>`;

        const related = this.getRelatedArticles(page);
        const relatedContainer = document.getElementById('relatedArticles');
        relatedContainer.innerHTML = related.map(rel => `
            <div><a href="#" onclick="wiki.loadPage('${rel.path}')">${rel.title}</a></div>
        `).join('');
    }

    getRelatedArticles(page) {
        return this.pages
            .filter(p => p.category === page.category && p.path !== page.path)
            .slice(0, 5);
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
        
        container.innerHTML = categories.map(cat => `
            <a href="#" class="nav-link" onclick="wiki.showCategory('${cat.name}')">
                ${cat.name} <small>(${cat.count})</small>
            </a>
        `).join('');
    }

    // Додаткові функції
    editArticle() {
        alert('Функція редагування буде доступна після підключення до GitHub');
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
    window.location.reload();
}
