---
title: Тест Mermaid діаграм
category: Тестування
summary: Демонстрація можливостей Mermaid діаграм у HoRP-wiKi
author: System
created: 2025-11-16
tags: [mermaid, діаграми, тест]
---

# Тест Mermaid діаграм

Ця сторінка демонструє можливості використання Mermaid діаграм у HoRP-wiKi.

## Блок-схема (Flowchart)

```mermaid
graph TD
    A[Початок] --> B{Умова?}
    B -->|Так| C[Дія 1]
    B -->|Ні| D[Дія 2]
    C --> E[Кінець]
    D --> E
```

## Діаграма послідовності (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Користувач
    participant Система
    participant БазаДаних
    
    Користувач->>Система: Запит даних
    Система->>БазаДаних: Отримати дані
    БазаДаних-->>Система: Повернути дані
    Система-->>Користувач: Показати результат
```

## Діаграма класів (Class Diagram)

```mermaid
classDiagram
    class HoRPWiki {
        +pages[]
        +preferences
        +init()
        +loadPage()
        +renderMermaidDiagrams()
    }
    
    class Page {
        +title
        +path
        +category
        +content
    }
    
    HoRPWiki "1" --> "*" Page : contains
```

## Діаграма станів (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Завантаження
    Завантаження --> Готово
    Готово --> Перегляд
    Перегляд --> Редагування
    Редагування --> Збереження
    Збереження --> Готово
    Готово --> [*]
```

## Діаграма Ганта (Gantt Chart)

```mermaid
gantt
    title Розробка HoRP-wiKi
    dateFormat  YYYY-MM-DD
    section Фаза 1
    Базова структура       :done, 2025-01-01, 2025-01-15
    Markdown парсер        :done, 2025-01-10, 2025-01-25
    section Фаза 2
    Mermaid інтеграція     :active, 2025-11-16, 7d
    Тестування             :2025-11-23, 5d
```

## Діаграма сутностей (Entity Relationship)

```mermaid
erDiagram
    WIKI ||--o{ PAGE : contains
    PAGE ||--o{ CATEGORY : belongs-to
    PAGE {
        string title
        string path
        string content
        date created
    }
    CATEGORY {
        string name
        int count
    }
```

## Pie Chart (Кругова діаграма)

```mermaid
pie title Розподіл статей за категоріями
    "HoRP-версій" : 45
    "Основне" : 30
    "Тестування" : 15
    "Інше" : 10
```

## Використання

Щоб додати Mermaid діаграму до вашої статті, використовуйте наступний синтаксис:

\`\`\`mermaid
graph LR
    A[Ваш текст] --> B[Інший текст]
\`\`\`

Mermaid підтримує багато типів діаграм. Детальну документацію можна знайти на [офіційному сайті Mermaid](https://mermaid.js.org/).
