"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { templates } from "../constants/templates";
import { cn } from "../lib/utils";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useConvexUser } from "../hooks/use-convex-user";

export function TemplatesGallery() {
  const router = useRouter();
  const create = useMutation(api.documents.create);
  const [isCreating, setIsCreating] = useState(false);

  // Get authenticated user
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const userIdString = convexUserId;

  const onTemplateClick = (title: string, initialContent: string) => {
    if (isUserLoading) {
      toast.error("Please wait for authentication to complete");
      return;
    }

    if (!userIdString) {
      toast.error("User authentication required to create documents");
      return;
    }

    setIsCreating(true);
    create({ title, initialContent, userId: userIdString })
      .then((documentId) => {
        toast.success("Document created successfully!");
        router.push(`/documents/${documentId}`);
      })
      .catch(() => toast.error("Failed to create document."))
      .finally(() => {
        setIsCreating(false);
      });
  };

  return (
    <div className="bg-[#F1F3F4]">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-y-4 px-16 py-6">
        <h3 className="font-medium">Start a new document</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className={cn(
                "flex aspect-[3/4] w-32 flex-shrink-0 flex-col gap-y-2.5",
                (isCreating || isUserLoading) &&
                  "pointer-events-none opacity-50",
              )}
            >
              <button
                disabled={isCreating || isUserLoading}
                onClick={() =>
                  onTemplateClick(template.label, template.initialContent)
                }
                aria-label={`Create new document using ${template.label} template`}
                style={{
                  backgroundImage: `url(${template.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
                className="flex size-full flex-col items-center justify-center gap-y-4 rounded-sm border bg-white transition hover:border-blue-500 hover:bg-blue-50"
              />
              <p className="truncate text-sm font-medium">{template.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
