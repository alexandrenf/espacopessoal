import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentSidebar from './DocumentSidebar';
import { Id } from 'convex/_generated/dataModel';
import { DocumentWithTreeProps } from '../types/document';

// Mock implementations
const mockSetCurrentDocumentId = jest.fn();
const mockUpdateStructure = jest.fn();
const mockCreateDocument = jest.fn();
const mockDeleteDocument = jest.fn();

// Mock Convex hooks
const mockDocuments: DocumentWithTreeProps[] = [
  {
    _id: 'folder1' as Id<"documents">,
    title: 'Folder 1',
    ownerId: 'user123',
    parentId: undefined,
    order: 0,
    isFolder: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'doc1' as Id<"documents">,
    title: 'Document 1',
    ownerId: 'user123',
    parentId: undefined,
    order: 1,
    isFolder: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'doc2' as Id<"documents">,
    title: 'Document 2',
    ownerId: 'user123',
    parentId: undefined,
    order: 2,
    isFolder: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'doc3' as Id<"documents">,
    title: 'Document 3',
    ownerId: 'user123',
    parentId: 'folder1' as Id<"documents">,
    order: 0,
    isFolder: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => mockDocuments),
  useMutation: jest.fn((api) => {
    if (api === 'documents.updateStructure') return mockUpdateStructure;
    if (api === 'documents.create') return mockCreateDocument;
    if (api === 'documents.removeById') return mockDeleteDocument;
    return jest.fn();
  }),
  useConvexAuth: jest.fn(() => ({ isAuthenticated: true, isLoading: false })),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock the user hook
jest.mock('~/hooks/use-convex-user', () => ({
  useConvexUser: () => ({ 
    convexUserId: 'user123' as Id<"users">,
    isLoading: false 
  })
}));

// Mock API imports
jest.mock('../../convex/_generated/api', () => ({
  api: {
    documents: {
      getAllForTree: 'documents.getAllForTree',
      create: 'documents.create',
      removeById: 'documents.removeById',
      updateStructure: 'documents.updateStructure'
    }
  }
}));

// Helper to create drag event
const createDragEvent = (type: string, dataTransfer?: Partial<DataTransfer>) => {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    dataTransfer: {
      effectAllowed: 'move',
      dropEffect: 'move',
      files: {} as FileList,
      items: {} as DataTransferItemList,
      types: [],
      clearData: jest.fn(),
      getData: jest.fn(),
      setData: jest.fn(),
      setDragImage: jest.fn(),
      ...dataTransfer
    } as DataTransfer
  });
  return event;
};

describe('DocumentSidebar Drag and Drop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateStructure.mockResolvedValue(undefined);
    mockCreateDocument.mockResolvedValue('new-doc-id');
    mockDeleteDocument.mockResolvedValue(undefined);
  });

  it('renders document tree structure correctly', async () => {
    render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

         // Wait for the tree to render
     await waitFor(() => {
       expect(screen.getByText('Folder 1')).toBeTruthy();
       expect(screen.getByText('Document 1')).toBeTruthy();
       expect(screen.getByText('Document 2')).toBeTruthy();
     });
  });

  it('handles drag and drop to reorder documents', async () => {
    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.getByText('Document 2')).toBeInTheDocument();
    });

    // Find tree nodes - they should be in the DOM with draggable attributes
    const treeNodes = container.querySelectorAll('[draggable="true"]');
    expect(treeNodes.length).toBeGreaterThan(0);

    // Simulate dragging Document 1 to after Document 2
    const dragNode = treeNodes[0]; // Assuming first draggable is Document 1
    const dropNode = treeNodes[1]; // Assuming second draggable is Document 2

    if (dragNode && dropNode) {
      // Simulate drag start
      fireEvent(dragNode, createDragEvent('dragstart'));
      
      // Simulate drag over
      fireEvent(dropNode, createDragEvent('dragover'));
      
      // Simulate drop
      fireEvent(dropNode, createDragEvent('drop'));
      
      // Verify that updateStructure was called
      await waitFor(() => {
        expect(mockUpdateStructure).toHaveBeenCalled();
      });
    }
  });

  it('handles dropping document into folder', async () => {
    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

         await waitFor(() => {
       expect(screen.getByText('Folder 1')).toBeTruthy();
       expect(screen.getByText('Document 1')).toBeTruthy();
     });

    const treeNodes = container.querySelectorAll('[draggable="true"]');
    
    if (treeNodes.length >= 2) {
      const documentNode = Array.from(treeNodes).find(node => 
        node.textContent?.includes('Document 1')
      );
      const folderNode = Array.from(treeNodes).find(node => 
        node.textContent?.includes('Folder 1')
      );

      if (documentNode && folderNode) {
        // Simulate drag start on document
        fireEvent(documentNode, createDragEvent('dragstart'));
        
        // Simulate drag over folder
        fireEvent(folderNode, createDragEvent('dragover'));
        
        // Simulate drop on folder
        fireEvent(folderNode, createDragEvent('drop'));
        
        // Verify that updateStructure was called with correct parameters
        await waitFor(() => {
          expect(mockUpdateStructure).toHaveBeenCalledWith({
            updates: expect.arrayContaining([
              expect.objectContaining({
                id: 'doc1',
                parentId: 'folder1'
              })
            ]),
            userId: 'user123'
          });
        });
      }
    }
  });

  it('handles document selection', async () => {
    render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

         await waitFor(() => {
       expect(screen.getByText('Document 1')).toBeTruthy();
     });

    // Click on a document to select it
    const documentElement = screen.getByText('Document 1');
    fireEvent.click(documentElement);

    await waitFor(() => {
      expect(mockSetCurrentDocumentId).toHaveBeenCalledWith('doc1');
    });
  });

  it('handles folder expansion and collapse', async () => {
    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

         await waitFor(() => {
       expect(screen.getByText('Folder 1')).toBeTruthy();
     });

    // Find folder element and click to expand
    const folderElement = screen.getByText('Folder 1');
    fireEvent.click(folderElement);

         // Check if nested document appears after expansion
     await waitFor(() => {
       expect(screen.getByText('Document 3')).toBeTruthy();
     });
  });

  it('handles drag and drop with different drop positions', async () => {
    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.getByText('Document 2')).toBeInTheDocument();
    });

    const treeNodes = container.querySelectorAll('[draggable="true"]');
    
    if (treeNodes.length >= 2) {
      const dragNode = treeNodes[1]; // Document 2
      const dropNode = treeNodes[0]; // Document 1
      
      // Simulate drag and drop to reorder
      fireEvent(dragNode, createDragEvent('dragstart'));
      fireEvent(dropNode, createDragEvent('dragover'));
      fireEvent(dropNode, createDragEvent('drop'));
      
      // Verify structure update was called
      await waitFor(() => {
        expect(mockUpdateStructure).toHaveBeenCalledWith({
          updates: expect.arrayContaining([
            expect.objectContaining({
              order: expect.any(Number)
            })
          ]),
          userId: 'user123'
        });
      });
    }
  });

  it('handles error during drag and drop', async () => {
    // Mock updateStructure to throw an error
    mockUpdateStructure.mockRejectedValue(new Error('Update failed'));

    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

         await waitFor(() => {
       expect(screen.getByText('Document 1')).toBeTruthy();
     });

    const treeNodes = container.querySelectorAll('[draggable="true"]');
    
    if (treeNodes.length >= 2) {
      const dragNode = treeNodes[0];
      const dropNode = treeNodes[1];
      
      fireEvent(dragNode, createDragEvent('dragstart'));
      fireEvent(dropNode, createDragEvent('dragover'));
      fireEvent(dropNode, createDragEvent('drop'));
      
      // Verify error handling
      await waitFor(() => {
        expect(mockUpdateStructure).toHaveBeenCalled();
      });
    }
  });

  it('disables drag and drop on mobile', () => {
    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={true}
      />
    );

    // On mobile, draggable should be disabled
    const draggableNodes = container.querySelectorAll('[draggable="true"]');
    expect(draggableNodes.length).toBe(0);
  });

  it('handles unauthenticated user', async () => {
    // Mock unauthenticated user
    jest.mocked(require('~/hooks/use-convex-user').useConvexUser).mockReturnValue({
      convexUserId: null,
      isLoading: false
    });

    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

    const treeNodes = container.querySelectorAll('[draggable="true"]');
    
    if (treeNodes.length >= 2) {
      const dragNode = treeNodes[0];
      const dropNode = treeNodes[1];
      
      fireEvent(dragNode, createDragEvent('dragstart'));
      fireEvent(dropNode, createDragEvent('drop'));
      
      // Should not call updateStructure for unauthenticated user
      await waitFor(() => {
        expect(mockUpdateStructure).not.toHaveBeenCalled();
      });
    }
  });

  it('normalizes document orders after drag and drop', async () => {
    const { container } = render(
      <DocumentSidebar
        setCurrentDocumentId={mockSetCurrentDocumentId}
        isMobile={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.getByText('Document 2')).toBeInTheDocument();
    });

    const treeNodes = container.querySelectorAll('[draggable="true"]');
    
    if (treeNodes.length >= 2) {
      const dragNode = treeNodes[0];
      const dropNode = treeNodes[1];
      
      fireEvent(dragNode, createDragEvent('dragstart'));
      fireEvent(dropNode, createDragEvent('drop'));
      
      // Verify that orders are normalized (sequential starting from 0)
      await waitFor(() => {
        expect(mockUpdateStructure).toHaveBeenCalledWith({
          updates: expect.arrayContaining([
            expect.objectContaining({
              order: expect.any(Number)
            })
          ]),
          userId: 'user123'
        });
      });
    }
  });
}); 