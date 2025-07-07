import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

const updateDocumentContent = httpAction(async (ctx, request) => {
  // Verify the request method
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { documentId, content, userId } = body;

    console.log(`HTTP updateDocumentContent called with documentId: ${documentId}, content length: ${content?.length || 0}`);

    if (!documentId || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentId and content" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Call the internal mutation to update the document
    console.log(`Calling updateContentInternal for document: ${documentId}`);
    const result = await ctx.runMutation(internal.documents.updateContentInternal, {
      id: documentId,
      content,
      userId: userId || "demo-user",
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

    // Call the internal query to get the document
    console.log(`Calling getByIdInternal for document: ${documentId}`);
    const document = await ctx.runQuery(internal.documents.getByIdInternal, {
      id: documentId,
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
          content: document.initialContent || "",
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