// Storage utility for Drexel-Ai chats and projects
const CHATS_STORAGE_KEY = 'drexel_chats';
const PROJECTS_STORAGE_KEY = 'drexel_projects';

// Default standalone chats for demonstration
const DEFAULT_CHATS = [
  {
    id: 'chat-react-hook',
    title: 'useDebounce Custom Hook',
    createdAt: 'Today, 2:15 PM',
    updatedAt: Date.now() - 1000 * 60 * 30,
    messages: [
      {
        type: 'user',
        text: 'Can you show me an example of a useDebounce hook in React with explanation and usage?',
      },
      {
        type: 'assistant',
        text: `Here is a production-ready \`useDebounce\` custom hook for React. It delays updating the debounced value until after the specified delay has passed without new updates.

\`\`\`jsx
import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a rapidly changing value.
 * @param {any} value - The input value to debounce
 * @param {number} delay - Delay in milliseconds (default 300ms)
 * @returns {any} debouncedValue
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
\`\`\`

### Example Usage in a Search Input:

\`\`\`jsx
import React, { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export default function SearchUsers() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      console.log('Fetching search results for:', debouncedQuery);
      // Call your search API here
    }
  }, [debouncedQuery]);

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
      />
      <p className="mt-2 text-sm text-gray-500">
        Debounced query: <strong>{debouncedQuery || 'None'}</strong>
      </p>
    </div>
  );
}
\`\`\`

**Key Points:**
- Efficiently prevents redundant API queries during rapid typing.
- Automatically cleans up pending timers on unmount to prevent memory leaks.`,
      },
    ],
  },
  {
    id: 'chat-tailwind-grid',
    title: 'Tailwind 4 Grid Layout',
    createdAt: 'Yesterday',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    messages: [
      {
        type: 'user',
        text: 'How do I create a responsive auto-fit grid in Tailwind CSS?',
      },
      {
        type: 'assistant',
        text: `You can create a responsive auto-fit grid with Tailwind using either arbitrary values or standard grid classes:

\`\`\`html
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  <div className="bg-card p-6 rounded-2xl border border-line">Card 1</div>
  <div className="bg-card p-6 rounded-2xl border border-line">Card 2</div>
  <div className="bg-card p-6 rounded-2xl border border-line">Card 3</div>
  <div className="bg-card p-6 rounded-2xl border border-line">Card 4</div>
</div>
\`\`\`

Alternatively, with CSS Grid \`repeat(auto-fit, minmax(...))\`:

\`\`\`jsx
<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
  {items.map((item) => (
    <div key={item.id} className="p-4 rounded-xl border bg-surface">
      {item.title}
    </div>
  ))}
</div>
\`\`\``,
      },
    ],
  },
];

// Initial projects with their files and chat history
const INITIAL_PROJECTS = [
  {
    id: 'proj-1',
    name: 'E-Commerce Storefront',
    updated: 'Updated 2 hours ago',
    created: 'Created Oct 12, 2026',
    hasGeneratedCode: true,
    messages: [
      {
        type: 'user',
        text: 'Build an e-commerce storefront for developer workspace accessories.',
      },
      {
        type: 'planner',
        plan: {
          summary: 'Architected project structure and established component hierarchy',
          steps: [
            'Initialize layout framework with Header and ProductCard',
            'Configure catalog grid and state management',
            'Review responsiveness and theme integration',
          ],
          files: [
            '/src/App.jsx',
            '/src/components/Header.jsx',
            '/src/components/ProductCard.jsx',
          ],
        },
      },
      { type: 'switch' },
      {
        type: 'coder',
        summary:
          'Synthesized components, setup layout grid, and configured Tailwind tokens.',
        files: ['/src/App.jsx', '/package.json'],
        status: 'Code generated and verified.',
      },
    ],
    files: {
      '/src/App.jsx': `import React from 'react';\nimport Header from './components/Header';\nimport ProductCard from './components/ProductCard';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-page text-ink">\n      <Header />\n      <main className="max-w-5xl mx-auto p-6">\n        <h1 className="text-2xl font-bold mb-4">Workspace Storefront</h1>\n        <ProductCard name="Keypad" price="$89.00" />\n      </main>\n    </div>\n  );\n}`,
      '/src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
      '/src/components/Header.jsx': `import React from 'react';\n\nexport default function Header() {\n  return (\n    <header className="h-16 border-b border-line px-6 flex items-center justify-between bg-card">\n      <div className="font-bold text-lg text-ink">AcmeStore</div>\n      <nav className="flex gap-4 text-sm text-muted">\n        <a href="#products" className="hover:text-ink">Products</a>\n        <a href="#cart" className="hover:text-ink">Cart (3)</a>\n      </nav>\n    </header>\n  );\n}`,
      '/src/components/ProductCard.jsx': `import React from 'react';\n\nexport default function ProductCard({ name, price }) {\n  return (\n    <div className="border border-line rounded-xl p-4 bg-card shadow-sm">\n      <h3 className="font-semibold text-sm text-ink">{name}</h3>\n      <p className="text-muted text-xs mt-1">{price}</p>\n      <button className="mt-3 px-3 py-1.5 bg-[#0099FF] text-white rounded-lg text-xs font-medium cursor-pointer hover:opacity-90">\n        Add to cart\n      </button>\n    </div>\n  );\n}`,
      '/package.json': `{\n  "name": "acme-store",\n  "private": true,\n  "version": "0.1.0",\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1"\n  }\n}`,
    },
  },
  {
    id: 'proj-2',
    name: 'SaaS Analytics Dashboard',
    updated: 'Updated 5 hours ago',
    created: 'Created Oct 10, 2026',
    hasGeneratedCode: false,
    messages: [],
    files: {},
  },
  {
    id: 'proj-3',
    name: 'AI Persona Chatbot',
    updated: 'Updated 1 day ago',
    created: 'Created Oct 08, 2026',
    hasGeneratedCode: false,
    messages: [],
    files: {},
  },
];

// --- Chat Helpers ---
export function getSavedChats() {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(DEFAULT_CHATS));
      return DEFAULT_CHATS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CHATS;
  }
}

export function saveChat(chat) {
  const chats = getSavedChats();
  const index = chats.findIndex((c) => c.id === chat.id);
  let updated;
  if (index >= 0) {
    updated = [...chats];
    updated[index] = { ...updated[index], ...chat, updatedAt: Date.now() };
  } else {
    updated = [chat, ...chats];
  }
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteChat(chatId) {
  const chats = getSavedChats();
  const updated = chats.filter((c) => c.id !== chatId);
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function createNewChat() {
  const newChat = {
    id: 'chat-' + Date.now(),
    title: 'New Conversation',
    createdAt: 'Just now',
    updatedAt: Date.now(),
    messages: [],
  };
  saveChat(newChat);
  return newChat;
}

// --- Project Helpers ---
export function getSavedProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function getProject(projectId) {
  const projects = getSavedProjects();
  return projects.find((p) => p.id === projectId) || null;
}

export function saveProject(project) {
  const projects = getSavedProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  let updated;
  if (index >= 0) {
    updated = [...projects];
    updated[index] = {
      ...updated[index],
      ...project,
      updated: 'Updated just now',
    };
  } else {
    updated = [
      {
        ...project,
        updated: 'Updated just now',
        created: 'Created just now',
      },
      ...projects,
    ];
  }
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteProject(projectId) {
  const projects = getSavedProjects();
  const updated = projects.filter((p) => p.id !== projectId);
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
