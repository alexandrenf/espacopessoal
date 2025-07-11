import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { storageId: string } }
) {
  try {
    const { storageId } = params;
    
    // Update access time for this profile picture
    await convex.mutation(api.users.updateProfilePictureAccess, {
      storageId: storageId as any,
    });

    // Get the actual file from Convex storage
    const imageUrl = await convex.query(api.users.getStorageUrl, {
      storageId: storageId as any,
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
    
    // Get profile picture metadata for proper headers
    const profilePicture = await convex.query(api.users.getProfilePictureByStorageId, {
      storageId: storageId as any,
    });

    // Set appropriate headers for caching and content type
    const headers = new Headers({
      "Content-Type": profilePicture?.mimeType || "image/webp",
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