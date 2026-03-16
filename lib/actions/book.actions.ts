'use server';

import {CreateBook, TextSegment} from "@/types";
import {connectToDatabase} from "@/database/mongoose";
import {escapeRegex, generateSlug, serializeData, splitIntoSegments} from "@/lib/utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";
import mongoose from "mongoose";
import {getUserPlan} from "@/lib/subscription.server";

export const processPDFServer = async (fileBuffer: ArrayBuffer, fileName: string) => {
    try {
        console.log('Processing PDF on server...');

        const { PdfReader } = await import('pdfreader');

        return new Promise((resolve) => {
            const reader = new PdfReader();

            let fullText = '';
            let pageCount = 0;
            const pages: { [key: number]: string } = {};

            reader.parseBuffer(Buffer.from(fileBuffer), (err, item) => {
                if (err) {
                    console.error('PDF parsing error:', err);
                    resolve({
                        success: false,
                        error: `Failed to parse PDF: ${err.message}`
                    });
                    return;
                }

                if (!item) {
                    // End of parsing
                    console.log(`PDF processing complete: ${Object.keys(pages).length} pages processed`);

                    // Combine all pages and create segments with page numbers
                    const segments: TextSegment[] = [];
                    let segmentIndex = 0;

                    Object.keys(pages).sort((a, b) => parseInt(a) - parseInt(b)).forEach(pageNumStr => {
                        const pageNum = parseInt(pageNumStr);
                        const pageText = pages[pageNum].trim();

                        if (pageText) {
                            // Split page text into segments
                            const words = pageText.split(/\s+/).filter((word) => word.length > 0);
                            let startIndex = 0;

                            while (startIndex < words.length) {
                                const endIndex = Math.min(startIndex + 500, words.length); // 500 words per segment
                                const segmentWords = words.slice(startIndex, endIndex);
                                const segmentText = segmentWords.join(' ');

                                segments.push({
                                    text: segmentText,
                                    segmentIndex,
                                    pageNumber: pageNum,
                                    wordCount: segmentWords.length,
                                });

                                segmentIndex++;
                                startIndex = endIndex > startIndex + 450 ? endIndex - 50 : endIndex; // 50 word overlap
                            }
                        }
                    });

                    console.log(`Created ${segments.length} segments from ${Object.keys(pages).length} pages`);

                    resolve({
                        success: true,
                        data: {
                            content: segments,
                            totalPages: Object.keys(pages).length,
                            totalSegments: segments.length
                        }
                    });
                    return;
                }

                if (item.page) {
                    pageCount = Math.max(pageCount, item.page);
                }

                if (item.text) {
                    const pageNum = item.page || 1;
                    if (!pages[pageNum]) {
                        pages[pageNum] = '';
                    }
                    pages[pageNum] += item.text + ' ';
                }
            });
        });
    } catch (error) {
        console.error('Error processing PDF on server:', error);
        return {
            success: false,
            error: `Failed to process PDF: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

        return {
            success: true,
            data: {
                content: segments,
                totalPages: pdfDocument.numPages,
                totalSegments: segments.length
            }
        };
    } catch (error) {
        console.error('Error processing PDF on server:', error);
        return {
            success: false,
            error: `Failed to process PDF: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

export const getAllBooks = async (search?: string) => {
    try {
        await connectToDatabase();

        let query = {};

        if (search) {
            const escapedSearch = escapeRegex(search);
            const regex = new RegExp(escapedSearch, 'i');
            query = {
                $or: [
                    { title: { $regex: regex } },
                    { author: { $regex: regex } },
                ]
            };
        }

        const books = await Book.find(query).sort({ createdAt: -1 }).lean();

        return {
            success: true,
            data: serializeData(books)
        }
    } catch (e) {
        console.error('Error connecting to database', e);
        return {
            success: false, error: e
        }
    }
}

export const checkBookExists = async (title: string) => {
    try {
        await connectToDatabase();

        const slug = generateSlug(title);

        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook) {
            return {
                exists: true,
                book: serializeData(existingBook)
            }
        }

        return {
            exists: false,
        }
    } catch (e) {
        console.error('Error checking book exists', e);
        return {
            exists: false, error: e
        }
    }
}

export const createBook = async (data: CreateBook) => {
    try {
        await connectToDatabase();

        const slug = generateSlug(data.title);

        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        // Todo: Check subscription limits before creating a book
        const { getUserPlan } = await import("@/lib/subscription.server");
        const { PLAN_LIMITS } = await import("@/lib/subscription-constants");

        const { auth } = await import("@clerk/nextjs/server");
        const { userId } = await auth();

        if (!userId || userId !== data.clerkId) {
            return { success: false, error: "Unauthorized" };
        }

        const plan = await getUserPlan();
        const limits = PLAN_LIMITS[plan];

        const bookCount = await Book.countDocuments({ clerkId: userId });

        if (bookCount >= limits.maxBooks) {
            const { revalidatePath } = await import("next/cache");
            revalidatePath("/");

            return {
                success: false,
                error: `You have reached the maximum number of books allowed for your ${plan} plan (${limits.maxBooks}). Please upgrade to add more books.`,
                isBillingError: true,
            };
        }

        const book = await Book.create({...data, clerkId: userId, slug, totalSegments: 0});

        return {
            success: true,
            data: serializeData(book),
        }
    } catch (e) {
        console.error('Error creating a book', e);

        return {
            success: false,
            error: e,
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try {
        await connectToDatabase();

        const book = await Book.findOne({ slug }).lean();

        if (!book) {
            return { success: false, error: 'Book not found' };
        }

        return {
            success: true,
            data: serializeData(book)
        }
    } catch (e) {
        console.error('Error fetching book by slug', e);
        return {
            success: false, error: e
        }
    }
}

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try {
        await connectToDatabase();

        console.log('Saving book segments...');

        const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        }));

        await BookSegment.insertMany(segmentsToInsert);

        await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });

        console.log('Book segments saved successfully.');

        return {
            success: true,
            data: { segmentsCreated: segments.length}
        }
    } catch (e) {
        console.error('Error saving book segments', e);

        return {
            success: false,
            error: e,
        }
    }
}

// Searches book segments using MongoDB text search with regex fallback
export const searchBookSegments = async (bookId: string, query: string, limit: number = 5) => {
    try {
        await connectToDatabase();

        console.log(`Searching for: "${query}" in book ${bookId}`);

        const bookObjectId = new mongoose.Types.ObjectId(bookId);

        // Try MongoDB text search first (requires text index)
        let segments: Record<string, unknown>[] = [];
        try {
            segments = await BookSegment.find({
                bookId: bookObjectId,
                $text: { $search: query },
            })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .lean();
        } catch {
            // Text index may not exist — fall through to regex fallback
            segments = [];
        }

        // Fallback: regex search matching ANY keyword
        if (segments.length === 0) {
            const keywords = query.split(/\s+/).filter((k) => k.length > 2);
            const pattern = keywords.map(escapeRegex).join('|');

            segments = await BookSegment.find({
                bookId: bookObjectId,
                content: { $regex: pattern, $options: 'i' },
            })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ segmentIndex: 1 })
                .limit(limit)
                .lean();
        }

        console.log(`Search complete. Found ${segments.length} results`);

        return {
            success: true,
            data: serializeData(segments),
        };
    } catch (error) {
        console.error('Error searching segments:', error);
        return {
            success: false,
            error: (error as Error).message,
            data: [],
        };
    }
};
