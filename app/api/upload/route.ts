import {NextResponse} from "next/server";
import {put} from "@vercel/blob";
import {auth} from "@clerk/nextjs/server";
import {MAX_FILE_SIZE} from "@/lib/constants";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const { userId } = await auth();

        if(!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const filename = formData.get('filename') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large' }, { status: 400 });
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }

        const blob = await put(filename, file, {
            access: 'private',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        return NextResponse.json({
            url: blob.url,
            pathname: blob.pathname,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : "An unknown error occurred";
        console.error('Upload error', e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
