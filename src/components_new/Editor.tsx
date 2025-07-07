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

  useEffect(() => {
    const newYdoc = new Y.Doc()
    const documentName = process.env.NEXT_PUBLIC_DOCUMENT_NAME || 'example-document'
    
    // Get WebSocket URL from environment or create secure fallback
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3000`
    
    console.log('🔗 WebSocket URL:', wsUrl)
    console.log('📡 Environment WS URL:', process.env.NEXT_PUBLIC_WS_URL)
    
    new IndexeddbPersistence(documentName, newYdoc)

    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: newYdoc,
    })

    newProvider.on('status', (event: { status: string }) => {
      console.log('Provider status:', event.status)
      setStatus(event.status)
    })

    newProvider.on('connect', () => {
      console.log('WebSocket connected successfully!')
    })

    newProvider.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    newProvider.on('close', () => {
      console.log('WebSocket closed')
    })

    newProvider.on('error', () => {
      console.error('WebSocket error occurred')
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
    return null
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Google Docs Clone'

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
