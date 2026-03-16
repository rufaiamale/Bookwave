import { NextRequest, NextResponse } from 'next/server';
import { processPDFServer } from '@/lib/actions/book.actions';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('pdf') as File;

        if (!file) {
            return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
        }

        // Convert file to ArrayBuffer for processing
        const arrayBuffer = await file.arrayBuffer();

        const result = await processPDFServer(arrayBuffer, file.name);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result.data);
    } catch (error) {
        console.error('PDF processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process PDF' },
            { status: 500 }
        );
    }
}