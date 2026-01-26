import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    await dbConnect();
    const { userId } = await auth();

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Fetch specific user data
        let data = await Finance.findOne({ userId: userId });

        if (!data) {
            // Check for legacy default user data
            const legacyData = await Finance.findOne({ userId: 'default_user' });

            if (legacyData) {
                // Migrate legacy data to current user
                data = await Finance.findOneAndUpdate(
                    { userId: 'default_user' },
                    { userId: userId },
                    { new: true }
                );
            } else {
                // Initialize default data if none exists for this user
                data = await Finance.create({
                    userId: userId,
                    assets: [],
                    liabilities: [],
                    buckets: [],
                    history: []
                });
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    await dbConnect();
    const { userId } = await auth();

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();

        // Update the specific user's document
        const data = await Finance.findOneAndUpdate(
            { userId: userId },
            {
                $set: {
                    assets: body.assets,
                    liabilities: body.liabilities,
                    buckets: body.buckets,
                    history: body.history
                }
            },
            { new: true, upsert: true }
        );

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
