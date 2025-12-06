import { NextResponse } from "next/server";
import { withCors } from "@/lib/cors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WORKFLOW_ID = process.env.OPENAI_WORKFLOW_ID;

export const OPTIONS = withCors(async function OPTIONS(req: Request) {
    return new Response(null, { status: 204 }); // No body, just headers
});

export const POST = withCors(async function POST(req: Request) {
    if (!OPENAI_API_KEY || !WORKFLOW_ID) {
        return NextResponse.json(
            { error: "Server not configured (missing API key or workflow ID)" },
            { status: 500 }
        );
    }

    try {
        // Parse frontend request body
        const body = await req.json();
        const {
            user,
            state_variables = {},     // optional: frontend can pass a state object
            metadata = {},  // optional: frontend can pass metadata object
        } = body;

        // Default fallback user if not provided
        const resolvedUser = user ?? { id: `user_${Date.now().toString(36)}` };

        // Create ChatKit session
        const payload = {
            workflow: {
                id: WORKFLOW_ID,
                state_variables,
            },

            user: typeof resolvedUser === "string"
                ? resolvedUser
                : resolvedUser.id ?? "local-user",

            // metadata,

            // ⭐ REQUIRED: Enable file uploads during session creation
            chatkit_configuration: {
                file_upload: {
                    enabled: true,       // ⭐ REQUIRED for file attachments
                    // max_size_mb: 25,     // ⭐ optional: allow uploads up to 25MB
                    // allowed_mime_types: [
                    //     "image/*",
                    //     "application/pdf",
                    //     "text/plain",
                    //     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    // ], // ⭐ optional
                },
            },
        };

        const resp = await fetch("https://api.openai.com/v1/chatkit/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
                "OpenAI-Beta": "chatkit_beta=v1",
            },
            body: JSON.stringify(payload),
        });

        const data = await resp.json();

        if (!resp.ok) {
            console.error("Session creation failed:", data);
            return NextResponse.json({ error: data }, { status: 500 });
        }

        return NextResponse.json({
            client_secret: data.client_secret,
            expires_at: data.expires_at ?? null,
        });
    } catch (err: any) {
        console.error("Error creating chatkit session:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
});
