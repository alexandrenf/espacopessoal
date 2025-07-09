
import { type Editor } from '@tiptap/react'

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-md">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          aria-pressed={editor.isActive('bold')}
          aria-label="Toggle bold formatting"
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          aria-pressed={editor.isActive('italic')}
          aria-label="Toggle italic formatting"
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${editor.isActive('strike') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          aria-pressed={editor.isActive('strike')}
          aria-label="Toggle strikethrough formatting"
        >
          Strike
        </button>
      </div>
    </div>
  )
}

export default MenuBar
