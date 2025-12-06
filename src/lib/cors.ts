import { NextResponse } from "next/server";

function getAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_ORIGIN;
    if (!envOrigins || envOrigins.trim() === "") return ["*"];
    return envOrigins
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, "")) // remove trailing slashes
        .filter(Boolean);
}

export function corsHeaders(origin?: string): HeadersInit {
    const allowedOrigins = getAllowedOrigins();

    // Normalize incoming origin (remove trailing slash)
    const normalizedOrigin = origin?.replace(/\/+$/, "");

    const matchedOrigin =
        allowedOrigins.includes("*") || !normalizedOrigin
            ? "*"
            : allowedOrigins.includes(normalizedOrigin)
                ? normalizedOrigin
                : allowedOrigins[0] ?? "*";

    return {
        "Access-Control-Allow-Origin": matchedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

export function withCors<T extends (...args: any[]) => Promise<Response>>(
    handler: T
) {
    return async (req: Request, ...rest: any[]): Promise<Response> => {
        const origin = req.headers.get("origin") || "";

        // Handle preflight request
        if (req.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(origin),
            });
        }

        const response = await handler(req, ...rest);

        // Merge existing headers with CORS
        const newHeaders = new Headers(response.headers);
        const cors = corsHeaders(origin);
        Object.entries(cors).forEach(([k, v]) => newHeaders.set(k, v));

        return new NextResponse(await response.text(), {
            status: response.status,
            headers: newHeaders,
        });
    };
}
