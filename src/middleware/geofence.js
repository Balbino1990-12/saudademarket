const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load GeoJSON polygons (allowed areas)
let areas = { type: 'FeatureCollection', features: [] };
try {
  const dataPath = path.join(__dirname, '../../data/allowed_areas.geojson');
  const raw = fs.readFileSync(dataPath, 'utf8');
  areas = JSON.parse(raw);
  console.log('[Geofence] Loaded', (areas.features && areas.features.length) || 0, 'allowed areas from', dataPath);
} catch (err) {
  console.warn('[Geofence] Could not load allowed_areas.geojson:', err.message || err);
}

const GOOGLE_KEY = process.env.GOOGLE_GEOCODE_API_KEY || process.env.GOOGLE_API_KEY || null;

async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') {
    throw new Error('Address must be a non-empty string');
  }
  if (GOOGLE_KEY) {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const res = await axios.get(url, {
      params: {
        address,
        key: GOOGLE_KEY
      }
    });
    if (res.data && res.data.results && res.data.results.length > 0) {
      const loc = res.data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng, source: 'google' };
    }
    throw new Error('Address not found by Google Geocoding API');
  }

  const url = 'https://nominatim.openstreetmap.org/search';
  const res = await axios.get(url, {
    params: {
      q: address,
      format: 'json',
      limit: 1
    },
    headers: {
      'User-Agent': 'PortugalStore-Geofence-Test/1.0'
    }
  });
  if (res.data && Array.isArray(res.data) && res.data.length > 0) {
    return {
      lat: parseFloat(res.data[0].lat),
      lng: parseFloat(res.data[0].lon),
      source: 'nominatim'
    };
  }
  throw new Error('Address not found by Nominatim');
}

function isPointAllowed(lat, lng) {
  if (!areas || !areas.features || areas.features.length === 0) return false;

  let turf;
  try {
    turf = require('@turf/turf');
  } catch (err) {
    return false;
  }

  const pt = turf.point([Number(lng), Number(lat)]);
  return areas.features.some((feature) => {
    try {
      return turf.booleanPointInPolygon(pt, feature);
    } catch (e) {
      return false;
    }
  });
}

/**
 * Express middleware that validates that the provided coordinates fall inside an allowed polygon.
 * Expects either `req.body.lat` and `req.body.lng` (or `latitude`/`longitude`) or `req.body.shipping` with `{ lat, lng }`.
 */
module.exports = async function geofenceMiddleware(req, res, next) {
  // Development bypass: if GEOFENCE_BYPASS=1 in env, allow optionally via header
  const envBypass = process.env.GEOFENCE_BYPASS === '1' || process.env.GEOFENCE_BYPASS === 'true';
  const headerBypass = req.headers['x-geofence-bypass'] === 'true' || req.headers['x-geofence-bypass'] === '1';
  if (envBypass && headerBypass) {
    // Explicit bypass in development only
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Geofence] Bypass enabled for request', req.originalUrl);
      return next();
    }
  }

  // Try common fields
  const body = req.body || {};
  let lat = body.lat || body.latitude;
  let lng = body.lng || body.longitude;

  // Nested shipping address coordinates
  if ((!lat || !lng) && body.shipping && typeof body.shipping === 'object') {
    lat = lat || body.shipping.lat || body.shipping.latitude;
    lng = lng || body.shipping.lng || body.shipping.longitude;
  }

  // Build an address string from checkout fields if lat/lng are not provided
  const addressValue = body.address || [body.street, body.zipCode, body.city, body.country]
    .filter(Boolean)
    .join(', ');

  if ((lat == null || lng == null) && addressValue) {
    try {
      const geocoded = await geocodeAddress(addressValue);
      lat = geocoded.lat;
      lng = geocoded.lng;
      req.body.geocodedSource = geocoded.source;
    } catch (err) {
      return res.status(400).json({ error: 'Address geocoding failed: ' + (err.message || 'Unable to resolve address') });
    }
  }

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing delivery coordinates or valid address. Include latitude/longitude or a full address.' });
  }

  if (isPointAllowed(lat, lng)) {
    return next();
  }

  return res.status(403).json({ error: 'Delivery address is outside the store allowed areas.' });
};

module.exports.isPointAllowed = isPointAllowed;
module.exports.geocodeAddress = geocodeAddress;
