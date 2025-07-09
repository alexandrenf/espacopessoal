import React, { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { Folder, Check, Save } from "lucide-react";
import { motion } from "framer-motion";

const PASTEL_COLORS = [
  { hex: "#FF8A94", name: "Darker Pastel Pink" },
  { hex: "#8AE6A1", name: "Darker Pastel Green" },
  { hex: "#8AC4FF", name: "Darker Pastel Blue" },
  { hex: "#FFE566", name: "Darker Pastel Yellow" },
  { hex: "#FFA5B5", name: "Darker Light Pink" },
  { hex: "#A5E6A5", name: "Darker Light Green" },
  { hex: "#8FB8D9", name: "Darker Light Blue" },
  { hex: "#FFC966", name: "Darker Pastel Orange" },
  { hex: "#B38FB3", name: "Darker Pastel Purple" },
  { hex: "#A5D8FF", name: "Darker Light Sky Blue" },
];

interface FolderEditorProps {
  folder: {
    id: number;
    content: string;
    isFolder: boolean;
  };
  onUpdate: (content: string) => void;
  isSaving: boolean;
}

export default function FolderEditor({
  folder,
  onUpdate,
  isSaving,
}: FolderEditorProps) {
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState(
    PASTEL_COLORS[0]?.hex ?? "#FFB3BA",
  );

  useEffect(() => {
    // Parse the folder content to get title and color
    const lines = folder.content.split("\n");
    const firstLine = lines[0]?.trim() ?? "Untitled Folder";
    const colorLine = lines.find((line) => line.startsWith("!color:"));
    const color = colorLine
      ? colorLine.replace("!color:", "").trim()
      : PASTEL_COLORS[0]?.hex;

    setTitle(firstLine);
    setSelectedColor(color ?? PASTEL_COLORS[0]?.hex ?? "#FFB3BA");
  }, [folder.content]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    // Update the folder content with new title but keep the color
    const lines = folder.content.split("\n");
    const colorLine = lines.find((line) => line.startsWith("!color:"));
    const newContent = [newTitle, colorLine].filter(Boolean).join("\n");
    onUpdate(newContent);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);

    // Update the folder content with new color but keep the title
    const lines = folder.content.split("\n");
    const titleLine = lines[0];
    const newContent = [titleLine, `!color:${color}`].join("\n");
    onUpdate(newContent);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Folder
            className="h-8 w-8 text-gray-600 transition-colors duration-200"
            style={{ color: selectedColor }}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="title" className="text-sm font-medium text-gray-700">
            Folder Name
          </Label>
          <div className="relative mt-1">
            <Input
              id="title"
              value={title}
              onChange={handleTitleChange}
              className="pr-8"
              placeholder="Enter folder name"
              disabled={isSaving}
            />
          </div>
        </div>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 shadow-sm"
          >
            <Save className="h-4 w-4 animate-pulse text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Salvando...
            </span>
          </motion.div>
        )}
      </div>

      <div>
        <Label className="mb-2 block text-sm font-medium text-gray-700">
          Folder Color
        </Label>
        <div className="flex flex-wrap gap-2">
          {PASTEL_COLORS.map((color) => (
            <button
              key={color.hex}
              onClick={() => handleColorChange(color.hex)}
              className={cn(
                "relative h-8 w-8 rounded-full transition-all duration-200",
                "hover:scale-110 hover:shadow-md",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                selectedColor === color.hex &&
                  "ring-2 ring-blue-500 ring-offset-2",
              )}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {selectedColor === color.hex && (
                <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
