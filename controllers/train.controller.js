const trainRoutes = async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing required parameters: lat and lon' });
    }

    try {
        const routesParams = new URLSearchParams({
            lat,
            lon,
            radius: '100000',
            vehicle_type: 'rail',
            apikey: 'rDCJeY7aPs2jqGowjHTyigo6TYzYRky3'
        });

        const routesUrl = `https://transit.land/api/v2/rest/routes?${routesParams.toString()}`;
        const response = await fetch(routesUrl);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TransitLand routes API error ${response.status}: ${errorText}`);
        }

        const routesData = await response.json();
        const routes = routesData.routes || [];

        res.json({
            routes: routes.map(route => ({
                route_id: route.onestop_id,
                name: route.route_long_name || route.route_short_name,
                short_name: route.route_short_name,
                long_name: route.route_long_name,
                vehicle_type: route.vehicle_type
            })),
            total_routes: routes.length
        });
    } catch (error) {
        console.error('Error fetching bus routes:', error);
        res.status(500).json({
            error: 'Failed to fetch bus routes',
            message: error.message
        });
    }
}
const trainTrips = async (req, res) => {
    const { origin_lat, origin_lon, destination_lat, destination_lon, departure_time, date } = req.query;
    const API_KEY = 'rDCJeY7aPs2jqGowjHTyigo6TYzYRky3';

    console.log(req.query);

    if (
        !origin_lat || !origin_lon ||
        !destination_lat || !destination_lon ||
        !departure_time || !date
    ) {
        return res.status(400).json({
            error: 'Missing required parameters: origin_lat, origin_lon, destination_lat, destination_lon, departure_time, and date'
        });
    }

    try {
        // Format the departure time correctly
        const departureDateTime = `${date}T${departure_time}`;

        // Use the trip_plans endpoint, which is the most suitable for finding routes between locations
        const params = new URLSearchParams({
            apikey: API_KEY,
            from: `${origin_lat},${origin_lon}`,
            to: `${destination_lat},${destination_lon}`,
            departure_date: departureDateTime,
            mode: 'transit'
        });

        const url = `https://transit.land/api/v2/rest/trip_plans?${params.toString()}`;
        console.log("Request URL:", url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Response: ${errorText}`);
            throw new Error(`TransitLand API error ${response.status}: ${errorText}`);
        }

        const tripData = await response.json();
        const itineraries = tripData.itineraries || [];

        console.log(`Found ${itineraries.length} trip plans`);

        // Transform the data to a more useful format
        const formattedTrips = itineraries.map(itinerary => {
            return {
                duration: itinerary.duration,
                start_time: itinerary.start_time,
                end_time: itinerary.end_time,
                legs: itinerary.legs.map(leg => ({
                    mode: leg.mode,
                    duration: leg.duration,
                    route_id: leg.route_id,
                    route_name: leg.route_name,
                    route_short_name: leg.route_short_name,
                    operator_name: leg.operator_name,
                    trip_id: leg.trip_id,
                    from_stop: leg.from_stop,
                    to_stop: leg.to_stop,
                    departure_time: leg.departure_time,
                    arrival_time: leg.arrival_time
                }))
            };
        });

        res.json({
            trips: formattedTrips,
            total_trips: formattedTrips.length
        });
    } catch (error) {
        console.error('Error fetching bus trips:', error);
        res.status(500).json({
            error: 'Failed to fetch bus trips',
            message: error.message
        });
    }
};

const trainOperators = async (req, res) => {
    const API_KEY = 'rDCJeY7aPs2jqGowjHTyigo6TYzYRky3';

    const lat = req.query.lat || 51.5074;   // Default: London
    const lon = req.query.lon || -0.1278;
    const radius = req.query.radius || 1000;


    try {
        const params = new URLSearchParams({
            apikey: API_KEY,
            lat: lat,
            lon: lon,
            r: radius
        });

        const url = `https://transit.land/api/v2/rest/operators?${params.toString()}`;
        console.log('Testing operators URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error Response: ${errorText}`);
            throw new Error(`TransitLand API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Keywords to help infer train/rail operators
        const railKeywords = ['rail', 'bart', 'train', 'subway', 'metro', 'lrt', 'mrt'];

        // Identify rail/train operators based on name or provider hints
        const trainOperators = data.operators.filter(op => {
            const name = op.name?.toLowerCase() || '';
            const shortName = op.short_name?.toLowerCase() || '';
            const providerId = op.tags?.omd_provider_id?.toLowerCase() || '';
            return railKeywords.some(kw =>
                name.includes(kw) || shortName.includes(kw) || providerId.includes(kw)
            );
        });

        // Identify bus operators based on route_types tag, if available
        const busOperators = data.operators.filter(op => {
            const routeTypes = op.tags?.route_types || '';
            return routeTypes.includes('bus');
        });

        res.json({
            success: true,
            url,
            totalFound: data.operators.length,
            trainsOnly: trainOperators.length,
            busesOnly: busOperators.length,
            trainOperators,
            busOperators
        });

    } catch (error) {
        console.error('Transit operators test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
}


module.exports = {
    trainRoutes,
    trainOperators,
    trainTrips
}