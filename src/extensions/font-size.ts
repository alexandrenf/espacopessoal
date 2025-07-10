import { Extension } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// Sanitize font size values to prevent XSS
const sanitizeFontSize = (fontSize: string): string | null => {
  if (!fontSize || typeof fontSize !== "string") return null;

  // Allow only valid CSS font-size values
  // Valid units: px, em, rem, %, pt, pc, ex, ch, vw, vh, vmin, vmax
  // Valid keywords: xx-small, x-small, small, medium, large, x-large, xx-large, smaller, larger
  const validFontSizeRegex =
    /^(xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger|(\d*\.?\d+)(px|em|rem|%|pt|pc|ex|ch|vw|vh|vmin|vmax))$/;

  const trimmedFontSize = fontSize.trim();

  if (validFontSizeRegex.test(trimmedFontSize)) {
    return trimmedFontSize;
  }

  return null;
};

interface FontSizeOptions {
  types: string[];
}

export const FontSizeExtension = Extension.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};

              const sanitizedFontSize = sanitizeFontSize(
                String(attributes.fontSize),
              );
              if (!sanitizedFontSize) return {};

              return {
                style: `font-size: ${sanitizedFontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          // Validate fontSize before applying
          const sanitizedFontSize = sanitizeFontSize(fontSize);
          if (!sanitizedFontSize) {
            // If fontSize is invalid, don't apply the style
            console.warn(`Invalid font size value: ${fontSize}`);
            return false;
          }

          return chain()
            .setMark("textStyle", { fontSize: sanitizedFontSize })
            .run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).run();
        },
    };
  },
});
