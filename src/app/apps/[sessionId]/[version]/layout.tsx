import { getFromStorage, getStorageKey } from "@/server/storage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROOT_URL } from "@/utils/config";
import { headers } from "next/headers";

interface LayoutProps {
	children: React.ReactNode;
	params: {
		sessionId: string;
		version: string;
	};
}

export async function generateMetadata({
	params,
}: LayoutProps): Promise<Metadata> {
	const { sessionId, version } = params;

	try {
		const headersList = headers();
		const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
		const key = getStorageKey(sessionId, version, ip);
		const res = await getFromStorage(key);
		
		if (!res) {
			return {};
		}

		const data = JSON.parse(res);
		if (data) {
			return {
				title: data.title,
				description: data.description,
				openGraph: {
					title: data.title,
					description: data.description,
					images: `https://image.thum.io/get/${ROOT_URL}/api/apps/${sessionId}/${version}/raw`,
					type: "website",
				},
			};
		}
	} catch (error) {
		console.error("Error generating metadata:", error);
	}

	return {};
}

export default function Layout({ children, params }: LayoutProps) {
	return <>{children}</>;
}
