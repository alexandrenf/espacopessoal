import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storageId: string }> }
) {
  const { storageId } = await params;
  try {
    // Check if profile picture exists in database first
    const profilePicture = await convex.query(api.users.getProfilePictureByStorageId, {
      storageId: storageId as Id<"_storage">,
    });

    if (!profilePicture) {
      return new NextResponse("Profile picture not found", { status: 404 });
    }

    // Update access time for this profile picture
    await convex.mutation(api.users.updateProfilePictureAccess, {
      storageId: storageId as Id<"_storage">,
    });

    // Get the actual file from Convex storage
    const imageUrl = await convex.query(api.users.getStorageUrl, {
      storageId: storageId as Id<"_storage">,
    });

    if (!imageUrl) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Fetch the image from Convex storage
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return new NextResponse("Failed to fetch image", { status: 500 });
    }

    // Get the image data
    const imageData = await imageResponse.arrayBuffer();

    // Set appropriate headers for caching and content type
    const headers = new Headers({
      "Content-Type": profilePicture.mimeType || "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
      "Content-Length": imageData.byteLength.toString(),
    });

    return new NextResponse(imageData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving profile image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}