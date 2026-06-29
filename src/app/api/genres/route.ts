import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        const query = `
            SELECT id, name, slug 
            FROM genres 
            WHERE is_active = 1 
            ORDER BY sort_order, name
        `;
        const [genres] = await db.execute<RowDataPacket[]>(query, []);
        
        return NextResponse.json({ success: true, data: genres });
    } catch (error: any) {
        console.error('Error fetching genres:', error);
        return NextResponse.json(
            { success: false, message: 'Server error', error: error.message },
            { status: 500 }
        );
    }
}
