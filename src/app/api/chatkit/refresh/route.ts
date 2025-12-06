import { NextResponse } from "next/server";
import { withCors } from "@/lib/cors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WORKFLOW_ID = process.env.OPENAI_WORKFLOW_ID;

export const OPTIONS = withCors(async function OPTIONS(req: Request) {
    return new Response(null, { status: 204 }); // No body, just headers
});

export const POST = withCors(async function POST(req: Request) {
    if (!OPENAI_API_KEY) {
        return NextResponse.json(
            { error: "Server not configured (missing API key)" },
            { status: 500 }
        );
    }

    try {
        // Parse frontend body
        const body = await req.json();
        const {
            session_id,      // Required: existing session ID or client secret
            state_variables = {},      // Optional new state data
            metadata = {},   // Optional new metadata
        } = body;

        if (!session_id) {
            return NextResponse.json(
                { error: "Missing session_id in request body" },
                { status: 400 }
            );
        }

        // Refresh session
        const payload = {
            workflow: {
                id: WORKFLOW_ID,
                state_variables,
            },

            // metadata,

            // ⭐ REQUIRED: Enable file uploads during refresh
            chatkit_configuration: {
                file_upload: {
                    enabled: true,      // ⭐ REQUIRED
                    max_size_mb: 25,    // optional
                    allowed_mime_types: [
                        "image/*",
                        "application/pdf",
                        "text/plain",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    ],
                },
            },
        };

        const resp = await fetch(
            `https://api.openai.com/v1/chatkit/sessions/${session_id}/refresh`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                    "OpenAI-Beta": "chatkit_beta=v1",
                },
                body: JSON.stringify(payload),
            }
        );

        const data = await resp.json();

        if (!resp.ok) {
            console.error("Session refresh failed:", data);
            return NextResponse.json({ error: data }, { status: 500 });
        }

        return NextResponse.json({
            client_secret: data.client_secret,
            expires_at: data.expires_at ?? null,
        });
    } catch (err: any) {
        console.error("Error refreshing chatkit session:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
});
