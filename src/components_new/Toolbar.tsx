"use client";

import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { useEditorStore } from "../store/use-editor-store";
import { type Level } from "@tiptap/extension-heading";
import { ChromePicker, type ColorResult } from "react-color";
import { Button } from "../components_new/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components_new/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components_new/ui/dropdown-menu";
import { Input } from "../components_new/ui/input";
import { Separator } from "../components_new/ui/separator";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListCollapse,
  ListTodo,
  type LucideIcon,
  MessageSquarePlus,
  Minus,
  Table,
  Plus,
  Printer,
  Redo2,
  RemoveFormatting,
  Search,
  SpellCheck,
  Strikethrough,
  Underline,
  Undo2,
  Upload,
} from "lucide-react";

function LineHeightButton() {
  const { editor } = useEditorStore();
  const lineHeights = [
    {
      label: "Default",
      value: "normal",
    },
    {
      label: "1",
      value: "1",
    },
    {
      label: "1.15",
      value: "1.15",
    },
    {
      label: "1.5",
      value: "1.5",
    },
    {
      label: "2",
      value: "2",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-y-0.5 overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
          <ListCollapse className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-y-1 p-1">
        {lineHeights.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => editor?.chain().focus().setLineHeight(value).run()}
            className={cn(
              "flex items-center gap-x-2 rounded-sm px-2 py-1 hover:bg-neutral-200/80",
              editor?.getAttributes("paragraph").lineHeight === value &&
                "bg-neutral-200/80",
            )}
          >
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FontSizeButton() {
  const { editor } = useEditorStore();
  const MIN_FONT_SIZE = 8;
  const MAX_FONT_SIZE = 72;

  // Single source of truth: derive font size from editor state
  const currentFontSize = (() => {
    const fontSize = editor?.getAttributes("textStyle")?.fontSize as string;
    if (!fontSize) return "16";
    // Extract numeric value from "16px" format
    const numeric = parseInt(fontSize.replace("px", ""));
    return isNaN(numeric) ? "16" : numeric.toString();
  })();

  const [inputValue, setInputValue] = useState(currentFontSize);
  const [isEditing, setIsEditing] = useState(false);

  // Clamp font size to bounds
  const clampFontSize = (size: number): number => {
    return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
  };

  const updateFontSize = (newSize: string) => {
    const size = parseInt(newSize);
    if (!isNaN(size)) {
      const clampedSize = clampFontSize(size);
      editor?.chain().focus().setFontSize(`${clampedSize}px`).run();
      setInputValue(clampedSize.toString());
      setIsEditing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    updateFontSize(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateFontSize(inputValue);
      editor?.commands.focus();
    }
  };

  const increment = () => {
    const currentSize = parseInt(currentFontSize);
    const newSize = clampFontSize(currentSize + 1);
    updateFontSize(newSize.toString());
  };

  const decrement = () => {
    const currentSize = parseInt(currentFontSize);
    const newSize = clampFontSize(currentSize - 1);
    updateFontSize(newSize.toString());
  };

  return (
    <div className="flex items-center gap-x-0.5">
      <button
        onClick={decrement}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm hover:bg-neutral-200/80"
      >
        <Minus className="size-4" />
      </button>
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="h-7 w-10 shrink-0 rounded-sm border border-neutral-400 bg-transparent text-center text-sm focus:outline-none focus:ring-0"
        />
      ) : (
        <button
          onClick={() => {
            setIsEditing(true);
            setInputValue(currentFontSize);
          }}
          className="h-7 w-10 shrink-0 rounded-sm border border-neutral-400 text-center text-sm hover:bg-neutral-200/80"
        >
          {currentFontSize}
        </button>
      )}
      <button
        onClick={increment}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm hover:bg-neutral-200/80"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function ListButton() {
  const { editor } = useEditorStore();
  const lists = [
    {
      label: "Bullet List",
      icon: List,
      isActive: editor?.isActive("bulletList"),
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered List",
      icon: List,
      isActive: editor?.isActive("orderedList"),
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-y-0.5 overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
          <List className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-y-1 p-1">
        {lists.map(({ label, icon: Icon, onClick, isActive }) => (
          <button
            key={label}
            onClick={onClick}
            className={cn(
              "flex items-center gap-x-2 rounded-sm px-2 py-1 hover:bg-neutral-200/80",
              isActive && "bg-neutral-200/80",
            )}
          >
            <Icon className="size-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AlignButton() {
  const { editor } = useEditorStore();
  const alignments = [
    {
      label: "Left",
      value: "left",
      icon: AlignLeft,
    },
    {
      label: "Center",
      value: "center",
      icon: AlignCenter,
    },
    {
      label: "Right",
      value: "right",
      icon: AlignRight,
    },
    {
      label: "Justify",
      value: "justify",
      icon: AlignJustify,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-y-0.5 overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
          <AlignLeft className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-y-1 p-1">
        {alignments.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => editor?.chain().focus().setTextAlign(value).run()}
            className={cn(
              "flex items-center gap-x-2 rounded-sm px-2 py-1 hover:bg-neutral-200/80",
              editor?.isActive({ textAlign: value }) && "bg-neutral-200/80",
            )}
          >
            <Icon className="size-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ImageButton() {
  const { editor } = useEditorStore();
  const [imageUrl, setImageUrl] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentObjectUrl, setCurrentObjectUrl] = useState<string | null>(null);

  const onChange = (src: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src }).run();
    }
  };

  const onUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Revoke previous object URL to prevent memory leaks
        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
        }

        const imageUrl = URL.createObjectURL(file);
        setCurrentObjectUrl(imageUrl);
        onChange(imageUrl);

        // Don't schedule automatic revocation - let it persist until:
        // 1. A new image is uploaded (handled above)
        // 2. Component unmounts (handled in useEffect cleanup)
        // 3. User manually replaces the image
        // This prevents images from breaking while the user is still viewing/editing
      }
    };
    input.click();
  };

  // Cleanup effect to revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [currentObjectUrl]);

  const handleImageUrlSubmit = () => {
    if (imageUrl) {
      // If user is switching from uploaded image to URL, clean up the object URL
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        setCurrentObjectUrl(null);
      }

      onChange(imageUrl);
      setImageUrl("");
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
            <ImageIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onUpload}>
            <Upload className="mr-2 size-4" />
            Upload
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            <Search className="mr-2 size-4" />
            Paste URL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Image URL</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImageUrlSubmit()}
          />
          <DialogFooter>
            <Button onClick={handleImageUrlSubmit}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LinkButton() {
  const { editor } = useEditorStore();
  const [value, setValue] = useState("");

  const onChange = (href: string) => {
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setValue("");
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          setValue(editor?.getAttributes("link")?.href as string);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
          <Link2 className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex items-center gap-x-2 p-2.5">
        <Input
          placeholder="https://example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button onClick={() => onChange(value)}>Add</Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HighlightColorButton() {
  const { editor } = useEditorStore();
  const value =
    (editor?.getAttributes("highlight")?.color as string) ?? "#FFFFFF";

  const onChange = (color: ColorResult) => {
    editor?.chain().focus().setHighlight({ color: color.hex }).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-y-0.5 overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
          <Highlighter className="size-4" />
          <div className="h-0.5 w-full" style={{ backgroundColor: value }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0">
        <ChromePicker color={value} onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TextColorButton() {
  const { editor } = useEditorStore();
  const value =
    (editor?.getAttributes("textStyle")?.color as string) ?? "#000000";

  const onChange = (color: ColorResult) => {
    editor?.chain().focus().setColor(color.hex).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 shrink-0 flex-col items-center justify-center overflow-hidden rounded-sm px-1.5 hover:bg-neutral-200/80">
          <span className="text-xs">A</span>
          <div className="h-0.5 w-full" style={{ backgroundColor: value }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-0">
        <ChromePicker color={value} onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeadingLevelButton() {
  const { editor } = useEditorStore();
  const headings = [
    {
      label: "Normal text",
      value: 0,
      fontSize: "16px",
    },
    {
      label: "Heading 1",
      value: 1,
      fontSize: "32px",
    },
    {
      label: "Heading 2",
      value: 2,
      fontSize: "24px",
    },
    {
      label: "Heading 3",
      value: 3,
      fontSize: "20px",
    },
    {
      label: "Heading 4",
      value: 4,
      fontSize: "18px",
    },
    {
      label: "Heading 5",
      value: 5,
      fontSize: "16px",
    },
  ];

  const getCurrentHeading = () => {
    for (const heading of headings) {
      if (
        heading.value > 0 &&
        editor?.isActive("heading", { level: heading.value })
      ) {
        return `Heading ${heading.value}`;
      }
    }
    return "Normal text";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 min-w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm px-1.5 text-sm hover:bg-neutral-200/80">
          <span className="truncate">{getCurrentHeading()}</span>
          <ChevronDown className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-y-1 p-1">
        {headings.map(({ label, value, fontSize }) => (
          <button
            key={value}
            style={{ fontSize }}
            className={cn(
              "flex items-center gap-x-2 rounded-sm px-2 py-1 hover:bg-neutral-200/80",
              (value === 0 && !editor?.isActive("heading")) ||
                (editor?.isActive("heading", { level: value }) &&
                  "bg-neutral-200/80"),
            )}
            onClick={() => {
              if (value === 0) {
                editor?.chain().focus().setParagraph().run();
              } else {
                editor
                  ?.chain()
                  .focus()
                  .toggleHeading({ level: value as Level })
                  .run();
              }
            }}
          >
            {label}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FontFamilyButton() {
  const { editor } = useEditorStore();
  const fonts = [
    { label: "Arial", value: "Arial" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Courier New", value: "Courier New" },
    { label: "Verdana", value: "Verdana" },
    { label: "Georgia", value: "Georgia" },
  ];

  const currentFont =
    (editor?.getAttributes("textStyle")?.fontFamily as string) ?? "Arial";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-[120px] shrink-0 items-center justify-between overflow-hidden rounded-sm px-1.5 text-sm hover:bg-neutral-200/80">
          <span className="truncate">{currentFont}</span>
          <ChevronDown className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col gap-y-1 p-1">
        {fonts.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => editor?.chain().focus().setFontFamily(value).run()}
            className={cn(
              "flex items-center gap-x-2 rounded-sm px-2 py-1 text-left hover:bg-neutral-200/80",
              editor?.getAttributes("textStyle")?.fontFamily === value &&
                "bg-neutral-200/80",
            )}
            style={{ fontFamily: value }}
          >
            {label}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  icon: Icon,
}: {
  onClick?: () => void;
  isActive?: boolean;
  icon: LucideIcon;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center rounded-sm text-sm hover:bg-neutral-200/80",
        isActive && "bg-neutral-200/80",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function Toolbar() {
  const { editor, undoManager } = useEditorStore();

  const sections: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    isActive?: boolean;
  }[][] = [
    [
      {
        label: "Undo",
        icon: Undo2,
        onClick: () => {
          if (undoManager?.canUndo()) {
            undoManager.undo();
          }
        },
      },
      {
        label: "Redo",
        icon: Redo2,
        onClick: () => {
          if (undoManager?.canRedo()) {
            undoManager.redo();
          }
        },
      },
    ],
    [
      {
        label: "Bold",
        icon: Bold,
        isActive: editor?.isActive("bold"),
        onClick: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        label: "Italic",
        icon: Italic,
        isActive: editor?.isActive("italic"),
        onClick: () => editor?.chain().focus().toggleItalic().run(),
      },
      {
        label: "Underline",
        icon: Underline,
        isActive: editor?.isActive("underline"),
        onClick: () => editor?.chain().focus().toggleUnderline().run(),
      },
      {
        label: "Strikethrough",
        icon: Strikethrough,
        isActive: editor?.isActive("strike"),
        onClick: () => editor?.chain().focus().toggleStrike().run(),
      },
      {
        label: "Code",
        icon: Code,
        isActive: editor?.isActive("code"),
        onClick: () => editor?.chain().focus().toggleCode().run(),
      },
    ],
    [
      {
        label: "List Todo",
        icon: ListTodo,
        onClick: () => editor?.chain().focus().toggleTaskList().run(),
        isActive: editor?.isActive("taskList"),
      },
      {
        label: "Insert Table",
        icon: Table,
        onClick: () =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        isActive: editor?.isActive("table"),
      },
      {
        label: "Remove Formatting",
        icon: RemoveFormatting,
        onClick: () => editor?.chain().focus().unsetAllMarks().run(),
      },
    ],
  ];

  return (
    <div className="flex min-h-[40px] items-center gap-x-0.5 overflow-x-auto rounded-sm border bg-[#F1F4F9] px-2.5 py-0.5">
      {sections[0]?.map((button, index) => (
        <ToolbarButton key={index} {...button} />
      ))}
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <FontFamilyButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <HeadingLevelButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <FontSizeButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      {sections[1]?.map((button, index) => (
        <ToolbarButton key={index} {...button} />
      ))}
      <TextColorButton />
      <HighlightColorButton />
      <Separator orientation="vertical" className="h-6 bg-neutral-300" />
      <LinkButton />
      <ImageButton />
      <AlignButton />
      <LineHeightButton />
      <ListButton />
      {sections[2]?.map((button, index) => (
        <ToolbarButton key={index} {...button} />
      ))}
    </div>
  );
}
