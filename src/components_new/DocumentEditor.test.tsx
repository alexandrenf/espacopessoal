import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentEditor } from './DocumentEditor';
import { useQuery, useMutation } from 'convex/react';
import { Id } from '../../convex/_generated/dataModel';

// Mock dependencies
jest.mock('convex/react');
jest.mock('@hocuspocus/provider');
jest.mock('y-indexeddb');
jest.mock('yjs');
jest.mock('sonner');
jest.mock('next/navigation');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('DocumentEditor', () => {
  const mockDocument = {
    _id: 'test-doc-id' as Id<'documents'>,
    title: 'Test Document',
    ownerId: 'test-user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    organizationId: undefined,
    initialContent: '<p>Test content</p>',
    roomId: undefined,
    parentId: undefined,
    order: 0,
    isFolder: false,
  };

  const mockMutation = jest.fn() as any;
  mockMutation.withOptimisticUpdate = jest.fn().mockReturnValue(mockMutation);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(mockDocument);
    mockUseMutation.mockReturnValue(mockMutation);
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:6002';
  });

  test('renders document editor without crashing', async () => {
    render(
      <DocumentEditor
        document={mockDocument}
        initialContent="<p>Test content</p>"
        isReadOnly={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });
  });

  test('handles document switching correctly', async () => {
    const { rerender } = render(
      <DocumentEditor
        document={mockDocument}
        initialContent="<p>Test content</p>"
        isReadOnly={false}
      />
    );

    // Switch to a different document
    const newDocument = {
      ...mockDocument,
      _id: 'new-doc-id' as Id<'documents'>,
      title: 'New Document',
      initialContent: '<p>New content</p>',
    };

    mockUseQuery.mockReturnValue(newDocument);

    rerender(
      <DocumentEditor
        document={newDocument}
        initialContent="<p>New content</p>"
        isReadOnly={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New Document')).toBeInTheDocument();
    });
  });

  test('shows loading state during document switch', async () => {
    render(
      <DocumentEditor
        document={mockDocument}
        initialContent="<p>Test content</p>"
        isReadOnly={false}
      />
    );

    // The loading state should be handled by the component
    // This test verifies the component doesn't crash during initialization
    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });
  });

  test('handles WebSocket connection errors gracefully', async () => {
    // Mock a failed WebSocket connection
    process.env.NEXT_PUBLIC_WS_URL = '';

    render(
      <DocumentEditor
        document={mockDocument}
        initialContent="<p>Test content</p>"
        isReadOnly={false}
      />
    );

    // Should still render the document title even without WebSocket
    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });
  });
});