
import { Editor } from '@tiptap/react'

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-md">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-2 rounded-md text-sm font-medium ${editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-2 rounded-md text-sm font-medium ${editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-2 rounded-md text-sm font-medium ${editor.isActive('strike') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Strike
        </button>
      </div>
    </div>
  )
}

export default MenuBar
