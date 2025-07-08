'use client'

import { EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { useEffect, useState, useRef } from 'react'
import MenuBar from './MenuBar'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { HocuspocusProvider } from '@hocuspocus/provider'

const Editor = () => {
  const [status, setStatus] = useState('connecting')
  const editorRef = useRef<TiptapEditor | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    const newYdoc = new Y.Doc()
    const documentName = process.env.NEXT_PUBLIC_DOCUMENT_NAME ?? 'example-document'
    
    // Get WebSocket URL from environment or create secure fallback
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT ?? '3000'
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:${wsPort}`
    
    console.log('🔗 WebSocket URL:', wsUrl)
    console.log('📡 Environment WS URL:', process.env.NEXT_PUBLIC_WS_URL)
    
    new IndexeddbPersistence(documentName, newYdoc)

    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: newYdoc,
    })

    const handleReconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1)
          void newProvider.connect()
        }, Math.pow(2, reconnectAttempts) * 1000) // Exponential backoff
      } else {
        setConnectionError('Unable to establish connection after multiple attempts')
      }
    }

    newProvider.on('status', (event: { status: string }) => {
      console.log('Provider status:', event.status)
      setStatus(event.status)
      if (event.status === 'connected') {
        setConnectionError(null)
        setReconnectAttempts(0)
      }
    })

    newProvider.on('connect', () => {
      console.log('WebSocket connected successfully!')
      setConnectionError(null)
      setReconnectAttempts(0)
    })

    newProvider.on('disconnect', (event: unknown) => {
      console.log('WebSocket disconnected:', event)
      if (reconnectAttempts < maxReconnectAttempts) {
        handleReconnect()
      }
    })

    newProvider.on('close', (event: unknown) => {
      console.log('WebSocket closed:', event)
      if (reconnectAttempts < maxReconnectAttempts) {
        handleReconnect()
      }
    })

    newProvider.on('error', (event: unknown) => {
      console.error('WebSocket error occurred:', event)
      setConnectionError('Connection error occurred. Attempting to reconnect...')
      if (reconnectAttempts < maxReconnectAttempts) {
        handleReconnect()
      }
    })

    const tiptapEditor = new TiptapEditor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: newYdoc,
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-lg focus:outline-none',
        },
      },
    })

    editorRef.current = tiptapEditor
    setEditorReady(true)

    return () => {
      newProvider.destroy()
      newYdoc.destroy()
      if (editorRef.current) {
        editorRef.current.destroy()
      }
    }
  }, [])

  if (!editorReady || !editorRef.current) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing editor...</p>
            {connectionError && (
              <p className="text-red-600 mt-2 text-sm">{connectionError}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Google Docs Clone'

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{appName}</h1>
        <div className={`px-2 py-1 rounded-full text-white ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}>
          {status}
        </div>
      </div>
      <MenuBar editor={editorRef.current} />
      <div className="prose prose-lg max-w-none border rounded-md p-4">
        <EditorContent editor={editorRef.current} />
      </div>
    </div>
  )
}

export default Editor
