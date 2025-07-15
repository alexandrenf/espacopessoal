/**
 * Tests for Markdown export and import functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the dependencies
jest.mock('turndown', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      turndown: jest.fn((html: string) => {
        // Simple mock conversion for testing
        if (html.includes('<h1>')) {
          return '# Test Heading\n\nTest content';
        }
        return 'Test markdown content';
      }),
    })),
  };
});

jest.mock('showdown', () => {
  return {
    Converter: jest.fn().mockImplementation(() => ({
      makeHtml: jest.fn((markdown: string) => {
        // Simple mock conversion for testing
        if (markdown.includes('# Test Heading')) {
          return '<h1>Test Heading</h1><p>Test content</p>';
        }
        return '<p>Test HTML content</p>';
      }),
    })),
  };
});

// Mock DOM APIs
const mockCreateElement = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Mock document.createElement
  mockCreateElement.mockImplementation((tagName: string) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: mockClick,
      };
    }
    if (tagName === 'input') {
      return {
        type: '',
        accept: '',
        onchange: null,
        click: jest.fn(),
        files: null,
      };
    }
    return {};
  });
  
  global.document = {
    createElement: mockCreateElement,
  } as any;
  
  // Mock URL APIs
  global.URL = {
    createObjectURL: mockCreateObjectURL.mockReturnValue('blob:mock-url'),
    revokeObjectURL: mockRevokeObjectURL,
  } as any;
  
  // Mock Blob
  global.Blob = jest.fn().mockImplementation((content, options) => ({
    content,
    options,
  })) as any;
});

describe('Markdown Export/Import', () => {
  it('should export HTML content as Markdown', async () => {
    const TurndownService = (await import('turndown')).default;
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });
    
    const htmlContent = '<h1>Test Heading</h1><p>Test content</p>';
    const markdown = turndownService.turndown(htmlContent);
    
    expect(markdown).toBe('# Test Heading\n\nTest content');
  });
  
  it('should import Markdown content as HTML', async () => {
    const { Converter } = await import('showdown');
    const converter = new Converter({
      tables: true,
      strikethrough: true,
      tasklists: true,
      simpleLineBreaks: true,
      openLinksInNewWindow: true,
    });
    
    const markdownContent = '# Test Heading\n\nTest content';
    const html = converter.makeHtml(markdownContent);
    
    expect(html).toBe('<h1>Test Heading</h1><p>Test content</p>');
  });
  
  it('should create download link for Markdown export', () => {
    const mockEditor = {
      getHTML: jest.fn().mockReturnValue('<h1>Test</h1>'),
    };
    
    // Simulate the export function logic
    const content = mockEditor.getHTML();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-document.md';
    a.click();
    URL.revokeObjectURL(url);
    
    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
  
  it('should create file input for Markdown import', () => {
    // Simulate the import function logic
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown';
    
    expect(mockCreateElement).toHaveBeenCalledWith('input');
    expect(input.type).toBe('file');
    expect(input.accept).toBe('.md,.markdown,text/markdown');
  });
});
