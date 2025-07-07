
'use client'

import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('./Editor'), { ssr: false })

const ClientEditorWrapper = () => {
  return <Editor />
}

export default ClientEditorWrapper
