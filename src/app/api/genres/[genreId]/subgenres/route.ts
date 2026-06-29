import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ genreId: string }> }
) {
    try {
        const { genreId } = await params;
        const query = `
            SELECT id, genre_id, name, slug 
            FROM subgenres 
            WHERE genre_id = ? AND is_active = 1 
            ORDER BY sort_order, name
        `;
        const [subgenres] = await db.execute<RowDataPacket[]>(query, [genreId]);
        
        return NextResponse.json({ success: true, data: subgenres });
    } catch (error: any) {
        console.error('Error fetching subgenres:', error);
        return NextResponse.json(
            { success: false, message: 'Server error', error: error.message },
            { status: 500 }
        );
    }
}
