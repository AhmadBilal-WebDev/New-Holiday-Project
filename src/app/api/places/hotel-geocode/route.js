import { NextResponse } from 'next/server';

/**
 * Resolve hotel lat/lng via Places API Text Search (New).
 * POST { name, city?, country? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const city = typeof body?.city === 'string' ? body.city.trim() : '';
        const country = typeof body?.country === 'string' ? body.country.trim() : '';

        if (!name) {
            return NextResponse.json({ error: 'Hotel name is required' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 500 });
        }

        const textQuery = [name, city, country].filter(Boolean).join(', ');

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress',
            },
            body: JSON.stringify({
                textQuery,
                includedType: 'lodging',
                pageSize: 1,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data?.error?.message || 'Places search failed', success: false },
                { status: response.status }
            );
        }

        const place = data?.places?.[0];
        const latitude = place?.location?.latitude;
        const longitude = place?.location?.longitude;

        if (latitude == null || longitude == null) {
            return NextResponse.json(
                { error: 'No coordinates found for this hotel', success: false },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            latitude,
            longitude,
            formattedAddress: place?.formattedAddress || null,
            displayName: place?.displayName?.text || null,
        });
    } catch (error) {
        console.error('Hotel geocode error:', error);
        return NextResponse.json({ error: 'Failed to geocode hotel', success: false }, { status: 500 });
    }
}
