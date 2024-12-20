import { NextRequest, NextResponse } from "next/server";
import { getFromStorage, saveToStorage, getStorageKey, addToGallery } from "@/server/storage";
import { verifyHtml } from "@/server/signing";

export async function GET(
	request: NextRequest,
	{ params }: { params: { sessionId: string; version: string } },
) {
	const { sessionId, version } = params;
	const raw = request.nextUrl.searchParams.get("raw") === "true";

	try {
		const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown";
		const key = getStorageKey(sessionId, version, ip);
		const value = await getFromStorage(key);

		if (!value) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const data = JSON.parse(value);
		if (raw) {
			return new NextResponse(data.html, {
				headers: {
					"Content-Type": "text/html",
				},
			});
		}
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error retrieving app:", error);
		return NextResponse.json(
			{ error: "Failed to retrieve app" },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { sessionId: string; version: string } },
) {
	const { sessionId, version } = params;

	try {
		const { html, signature, avoidGallery, ...rest } = await request.json();
		const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown";
		const key = getStorageKey(sessionId, version, ip);

		if (!verifyHtml(html, signature)) {
			return NextResponse.json(
				{ error: "Invalid signature" },
				{ status: 400 }
			);
		}

		// Add creatorIP to the stored data
		const data = {
			html,
			signature,
			...rest,
			avoidGallery,
			creatorIP: ip,
			createdAt: new Date().toISOString(),
		};

		await saveToStorage(key, JSON.stringify(data));

		if (!avoidGallery) {
			let success = await addToGallery({ 
				sessionId, 
				version, 
				html,
				signature,
				...rest,
				creatorIP: ip 
			});
			if(!success) {
				return NextResponse.json(
					{ error: "Failed to save app" },
					{ status: 500 }
				);
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error saving app:", error);
		return NextResponse.json(
			{ error: "Failed to save app" },
			{ status: 500 }
		);
	}
}
