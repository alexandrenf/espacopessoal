import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { type Id } from "./_generated/dataModel";

// Helper function to validate Convex ID format
function isValidConvexId(id: string): boolean {
  // Convex IDs should be non-empty strings with at least 20 characters
  if (!id || typeof id !== "string" || id.length < 20) return false;

  // Check for whitespace
  if (id.includes(" ") || id.trim() !== id) return false;

  // Check for valid characters (base64url: A-Z, a-z, 0-9, hyphens, and underscores)
  const validIdPattern = /^[A-Za-z0-9_-]{20,}$/;
  return validIdPattern.test(id);
}

// Helper function to check if a userId is a server userId (trusted source)
function isServerUserId(userId: string): boolean {
  return (
    userId === "hocus-pocus-server" ||
    (process.env.SERVER_USER_ID !== undefined &&
      userId === process.env.SERVER_USER_ID)
  );
}

// Helper function to validate request body structure
function validateRequestBody(
  body: unknown,
): { isValid: false; error: string } | { isValid: true } {
  if (!body || typeof body !== "object") {
    return { isValid: false, error: "Request body must be a non-null object" };
  }

  return { isValid: true };
}

// Helper function to validate document update request data
function validateUpdateRequest(
  data: unknown,
):
  | { isValid: false; error: string }
  | { isValid: true; documentId: string; content: string; userId?: string } {
  const bodyValidation = validateRequestBody(data);
  if (!bodyValidation.isValid) {
    return { isValid: false, error: bodyValidation.error };
  }

  const { documentId, content, userId } = data as {
    documentId: unknown;
    content: unknown;
    userId?: unknown;
  };

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
    if (typeof userId !== "string") {
      return { isValid: false, error: "userId must be a string" };
    }

    // Allow server userIds or valid Convex IDs
    if (!isServerUserId(userId) && !isValidConvexId(userId)) {
      return {
        isValid: false,
        error: "userId must be a valid Convex ID format",
      };
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
  return (
    userId !== undefined &&
    typeof userId === "string" &&
    (isServerUserId(userId) || isValidConvexId(userId))
  );
}

const updateDocumentContent = httpAction(async (ctx, request) => {
  // Verify the request method
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: unknown;
  try {
    // Parse the request body
    body = (await request.json()) as unknown;
  } catch (parseError) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Validate request body and extract data
    const validation = validateUpdateRequest(body);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { documentId, content, userId } = validation;

    console.log(
      `HTTP updateDocumentContent called with documentId: ${documentId}, content length: ${content?.length ?? 0}, userId: ${userId}`,
    );

    // Check if this is a server update (trusted source)
    const isServerUpdate = userId ? isServerUserId(userId) : false;

    // Require authentication for non-server updates
    if (!isServerUpdate && !userId) {
      return new Response(
        JSON.stringify({
          error: "Authentication required. Please provide a valid userId.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // At this point, all values are validated and guaranteed to be strings
    const validDocumentId = documentId; // Non-null assertion since validation passed
    const validContent = content; // Non-null assertion since validation passed
    const validUserId = userId; // Non-null assertion since we checked above

    // Call the internal mutation to update the document with properly typed IDs
    console.log(
      `Calling updateContentInternal for document: ${validDocumentId}`,
    );
    const result = await ctx.runMutation(
      internal.documents.updateContentInternal,
      {
        id: validDocumentId, // Pass as string - the mutation will handle the conversion
        content: validContent,
        userId: validUserId, // userId is already validated to be defined above
      },
    );

    console.log(
      `updateContentInternal completed successfully for ${documentId}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Document updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error updating document:", error);

    if (error instanceof ConvexError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

const getDocumentContent = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId");

    console.log(
      `HTTP getDocumentContent called with documentId: ${documentId}`,
    );

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate documentId format before passing to query
    if (!isValidConvexId(documentId)) {
      return new Response(
        JSON.stringify({ error: "Invalid documentId format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Call the internal query to get the document with properly typed ID
    console.log(`Calling getByIdInternal for document: ${documentId}`);
    const document = await ctx.runQuery(internal.documents.getByIdInternal, {
      id: documentId, // getByIdInternal accepts string IDs and handles conversion internally
    });

    console.log(
      `getByIdInternal result for ${documentId}:`,
      document ? `Found document "${document.title}"` : "Document not found",
    );

    if (!document) {
      console.log(`Document ${documentId} not found, returning 404`);
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: document._id,
          title: document.title,
          content: document.initialContent ?? "",
          updatedAt: document.updatedAt,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching document:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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

// New endpoints for Y.js binary state management
const updateYjsState = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (parseError) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { documentId, yjsState, userId } = body as {
      documentId: unknown;
      yjsState: unknown;
      userId?: unknown;
    };

    // Validate documentId
    if (!documentId || typeof documentId !== "string") {
      return new Response(
        JSON.stringify({ error: "documentId must be a non-empty string" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!isValidConvexId(documentId)) {
      return new Response(
        JSON.stringify({ error: "documentId has invalid format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate yjsState - should be a base64 encoded string
    if (!yjsState || typeof yjsState !== "string") {
      return new Response(
        JSON.stringify({ error: "yjsState must be a base64 encoded string" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Convert base64 string to bytes
    let yjsStateBytes: ArrayBuffer;
    try {
      yjsStateBytes = Uint8Array.from(atob(yjsState), c => c.charCodeAt(0)).buffer;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid base64 in yjsState" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate userId if provided
    if (userId !== undefined && typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "userId must be a string" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `HTTP updateYjsState called with documentId: ${documentId}, yjsState length: ${yjsStateBytes.byteLength}, userId: ${userId}`,
    );

    // Call the internal mutation
    const result = await ctx.runMutation(
      internal.documents.updateYjsStateInternal,
      {
        id: documentId,
        yjsState: yjsStateBytes,
        userId: userId as string | undefined,
      },
    );

    console.log(`updateYjsStateInternal completed successfully for ${documentId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Y.js state updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error updating Y.js state:", error);

    if (error instanceof ConvexError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

const getYjsState = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId");

    console.log(`HTTP getYjsState called with documentId: ${documentId}`);

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!isValidConvexId(documentId)) {
      return new Response(
        JSON.stringify({ error: "Invalid documentId format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Call the internal query
    console.log(`Calling getYjsStateInternal for document: ${documentId}`);
    const document = await ctx.runQuery(internal.documents.getYjsStateInternal, {
      id: documentId,
    });

    console.log(
      `getYjsStateInternal result for ${documentId}:`,
      document ? `Found document "${document.title}"` : "Document not found",
    );

    if (!document) {
      console.log(`Document ${documentId} not found, returning 404`);
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert Y.js binary state to base64 for JSON transport
    const yjsStateBase64 = document.yjsState 
      ? btoa(String.fromCharCode(...new Uint8Array(document.yjsState)))
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: document._id,
          title: document.title,
          yjsState: yjsStateBase64,
          updatedAt: document.updatedAt,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching Y.js state:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

http.route({
  path: "/updateYjsState",
  method: "POST",
  handler: updateYjsState,
});

http.route({
  path: "/getYjsState",
  method: "GET",
  handler: getYjsState,
});

export default http;
