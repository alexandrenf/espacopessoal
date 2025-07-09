import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// Mock next/dynamic
jest.mock('next/dynamic', () => (fn) => {
  const Component = fn();
  return Component;
});

// Note: rc-tree mock removed to allow real drag-and-drop testing

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

// Mock react-icons
jest.mock('react-icons/im', () => ({
  ImSpinner8: () => <div data-testid="spinner">Loading...</div>,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left">←</div>,
  X: () => <div data-testid="x">×</div>,
  FilePlus: () => <div data-testid="file-plus">+</div>,
  FolderPlus: () => <div data-testid="folder-plus">📁+</div>,
  Folder: () => <div data-testid="folder">📁</div>,
  MoreVertical: () => <div data-testid="more-vertical">⋮</div>,
  Trash2: () => <div data-testid="trash">🗑️</div>,
  ChevronDown: () => <div data-testid="chevron-down">⌄</div>,
  ChevronRight: () => <div data-testid="chevron-right">⌄</div>,
}));

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => []),
  useMutation: jest.fn(() => jest.fn()),
  useConvexAuth: jest.fn(() => ({ isAuthenticated: true, isLoading: false })),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Global test setup
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})); 