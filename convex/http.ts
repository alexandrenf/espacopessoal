import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { type Id } from "./_generated/dataModel";

// Helper function to validate Convex ID format
function isValidConvexId(id: string): boolean {
  // Convex IDs should be non-empty strings with alphanumeric characters, underscores, and dashes
  if (!id || typeof id !== "string") return false;
  
  // Check for whitespace
  if (id.includes(" ") || id.trim() !== id) return false;
  
  // Check for valid characters (alphanumeric, underscores, dashes)
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  return validIdPattern.test(id);
}

// Helper function to validate request body structure
function validateRequestBody(body: unknown): 
  | { isValid: false; error: string }
  | { isValid: true } {
  if (!body || typeof body !== "object") {
    return { isValid: false, error: "Request body must be a non-null object" };
  }
  
  return { isValid: true };
}

// Helper function to validate document update request data
function validateUpdateRequest(data: unknown): 
  | { isValid: false; error: string }
  | { isValid: true; documentId: string; content: string; userId?: string } {
  const bodyValidation = validateRequestBody(data);
  if (!bodyValidation.isValid) {
    return { isValid: false, error: bodyValidation.error };
  }

  const { documentId, content, userId } = data as { documentId: unknown; content: unknown; userId?: unknown };

  // Validate documentId
  if (!documentId || typeof documentId !== "string") {
    return { isValid: false, error: "documentId must be a non-empty string" };
  }
  
  if (!isValidConvexId(documentId)) {
    return { isValid: false, error: "documentId has invalid format" };
  }

  // Validate content
  if (typeof content !== "string") {
    return { isValid: false, error: "content must be a string" };
  }

  // At this point, documentId and content are guaranteed to be strings
  const validatedDocumentId: string = documentId;
  const validatedContent: string = content;

  // Validate userId if provided
  if (userId !== undefined) {
    if (typeof userId !== "string" || !isValidConvexId(userId)) {
      return { isValid: false, error: "userId must be a valid Convex ID format" };
    }
    return { 
      isValid: true, 
      documentId: validatedDocumentId, 
      content: validatedContent, 
      userId: userId,
    };
  }

  return { 
    isValid: true, 
    documentId: validatedDocumentId, 
    content: validatedContent, 
    userId: undefined,
  };
}

// Helper function to validate that userId is required and valid for update operations
function validateRequiredUserId(userId: string | undefined): userId is string {
  return userId !== undefined && typeof userId === "string" && isValidConvexId(userId);
}

const updateDocumentContent = httpAction(async (ctx, request) => {
  // Verify the request method
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: unknown;
  try {
    // Parse the request body
    body = await request.json() as unknown;
  } catch (parseError) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    // Validate request body and extract data
    const validation = validateUpdateRequest(body);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const { documentId, content, userId } = validation;

    console.log(`HTTP updateDocumentContent called with documentId: ${documentId}, content length: ${content?.length ?? 0}`);

    // Require authentication for document updates
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please provide a valid userId." }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // At this point, all values are validated and guaranteed to be strings
    const validDocumentId = documentId; // Non-null assertion since validation passed
    const validContent = content; // Non-null assertion since validation passed
    const validUserId = userId; // Non-null assertion since we checked above

    // Call the internal mutation to update the document with properly typed IDs
    console.log(`Calling updateContentInternal for document: ${validDocumentId}`);
    const result = await ctx.runMutation(internal.documents.updateContentInternal, {
      id: validDocumentId, // Pass as string - the mutation will handle the conversion
      content: validContent,
      userId: validUserId, // userId is already validated to be defined above
    });

    console.log(`updateContentInternal completed successfully for ${documentId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Document updated successfully" }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error updating document:", error);
    
    if (error instanceof ConvexError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

const getDocumentContent = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId");

    console.log(`HTTP getDocumentContent called with documentId: ${documentId}`);

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId parameter" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Validate documentId format before passing to query
    if (!isValidConvexId(documentId)) {
      return new Response(
        JSON.stringify({ error: "Invalid documentId format" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Call the internal query to get the document with properly typed ID
    console.log(`Calling getByIdInternal for document: ${documentId}`);
    const document = await ctx.runQuery(internal.documents.getByIdInternal, {
      id: documentId as Id<"documents">,
    });
    
    console.log(`getByIdInternal result for ${documentId}:`, document ? `Found document "${document.title}"` : 'Document not found');

    if (!document) {
      console.log(`Document ${documentId} not found, returning 404`);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: {
          id: document._id,
          title: document.title,
          content: document.initialContent ?? "",
          updatedAt: document.updatedAt
        }
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error fetching document:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

const http = httpRouter();

http.route({
  path: "/updateDocumentContent",
  method: "POST",
  handler: updateDocumentContent,
});

http.route({
  path: "/getDocumentContent",
  method: "GET", 
  handler: getDocumentContent,
});

export default http;