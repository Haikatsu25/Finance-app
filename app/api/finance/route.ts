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

        // Check for legacy default user data
        const legacyData = await Finance.findOne({ userId: 'default_user' });

        // If we have legacy data, we might need to migrate it
        if (legacyData) {
            // Case 1: No data for current user at all -> just migrate
            if (!data) {
                data = await Finance.findOneAndUpdate(
                    { userId: 'default_user' },
                    { userId: userId },
                    { new: true }
                );
            }
            // Case 2: User has data (empty or not) -> Merge legacy into current
            else {
                // Merge arrays
                data.assets.push(...legacyData.assets);
                data.liabilities.push(...legacyData.liabilities);
                data.buckets.push(...legacyData.buckets);
                data.history.push(...legacyData.history);
                if (legacyData.subscriptions) data.subscriptions.push(...legacyData.subscriptions);
                if (legacyData.goals) data.goals.push(...legacyData.goals);

                // Save merged data
                await data.save();

                // Delete legacy data to prevent duplicate merges in future
                await Finance.deleteOne({ _id: legacyData._id });
            }
        }

        // Final fallback: If still no data (no legacy and no current), create new
        if (!data) {
            data = await Finance.create({
                userId: userId,
                assets: [],
                liabilities: [],
                buckets: [],
                subscriptions: [],
                goals: [],
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
                    assets: body.assets || [],
                    liabilities: body.liabilities || [],
                    buckets: body.buckets || [],
                    subscriptions: body.subscriptions || [],
                    goals: body.goals || [],
                    history: body.history || []
                }
            },
            { new: true, upsert: true }
        );

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
