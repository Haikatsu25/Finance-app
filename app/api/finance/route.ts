import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';

export async function GET() {
    await dbConnect();

    try {
        // For single user mode, we just fetch the default document
        let data = await Finance.findOne({ userId: 'default_user' });

        if (!data) {
            // Initialize default data if none exists
            data = await Finance.create({
                userId: 'default_user',
                assets: [],
                liabilities: [],
                buckets: [],
                history: []
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    await dbConnect();

    try {
        const body = await request.json();

        // Update the singleton document
        // relying on the frontend passing the entire state arrays for simplicity in this migration
        const data = await Finance.findOneAndUpdate(
            { userId: 'default_user' },
            {
                $set: {
                    assets: body.assets,
                    liabilities: body.liabilities,
                    buckets: body.buckets,
                    history: body.history
                }
            },
            { new: true, upsert: true } // Upsert ensures creation if missing
        );

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
