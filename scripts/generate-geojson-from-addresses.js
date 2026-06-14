#!/usr/bin/env node
/**
 * Generate GeoJSON polygon(s) from an address list.
 * Usage:
 *  node scripts/generate-geojson-from-addresses.js addresses.csv
 *  node scripts/generate-geojson-from-addresses.js addresses.json
 *
 * If `GOOGLE_GEOCODE_API_KEY` is set in the environment the script will use
 * the Google Geocoding API. Otherwise it will fallback to OpenStreetMap
 * Nominatim (rate-limited to 1 request/sec).
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const turf = require('@turf/turf');

const INPUT = process.argv[2] || path.join(__dirname, 'addresses.json');
const OUT = path.join(__dirname, '..', 'data', 'allowed_areas.geojson');
const GOOGLE_KEY = process.env.GOOGLE_GEOCODE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEOCODE_KEY || null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function geocodeNominatim(address) {
  const url = 'https://nominatim.openstreetmap.org/search';
  const params = { q: address, format: 'json', limit: 1 }; 
  const headers = { 'User-Agent': 'PortugalStore-Geocoder/1.0 (+https://example.com)' };
  const res = await axios.get(url, { params, headers });
  if (res.data && res.data.length > 0) {
    const r = res.data[0];
    return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), raw: r };
  }
  return null;
}

async function geocodeGoogle(address) {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  const params = { address, key: GOOGLE_KEY };
  const res = await axios.get(url, { params });
  if (res.data && res.data.results && res.data.results.length > 0) {
    const loc = res.data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng, raw: res.data.results[0] };
  }
  return null;
}

function parseCSV(content) {
  // Very small CSV parser: assumes single-column or header with `address` column
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const hasHeader = lines[0].toLowerCase().includes('address');
  if (hasHeader) {
    const idx = lines[0].toLowerCase().split(',').indexOf('address');
    return lines.slice(1).map(line => line.split(',')[idx].trim());
  }
  return lines;
}

async function loadAddresses(inputPath) {
  const content = fs.readFileSync(inputPath, 'utf8');
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.json') {
    const obj = JSON.parse(content);
    // Accept array of strings or array of {address: '...'}
    if (Array.isArray(obj)) {
      return obj.map(o => (typeof o === 'string' ? o : (o.address || o.Address || JSON.stringify(o))));
    }
    throw new Error('JSON file must contain an array of addresses');
  } else {
    // treat as CSV or plain newline list
    return parseCSV(content);
  }
}

async function main() {
  try {
    const absInput = path.isAbsolute(INPUT) ? INPUT : path.join(process.cwd(), INPUT);
    if (!fs.existsSync(absInput)) {
      console.error('Input file not found:', absInput);
      process.exit(1);
    }

    console.log('Loading addresses from', absInput);
    const addresses = await loadAddresses(absInput);
    console.log('Found', addresses.length, 'addresses');
    const points = [];

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      console.log(`Geocoding (${i+1}/${addresses.length}):`, addr);
      try {
        let geo = null;
        if (GOOGLE_KEY) {
          geo = await geocodeGoogle(addr);
        } else {
          geo = await geocodeNominatim(addr);
          // Nominatim: be polite (rate-limit)
          await sleep(1100);
        }
        if (geo) {
          points.push(turf.point([geo.lng, geo.lat], { address: addr }));
          console.log(' →', geo.lat, geo.lng);
        } else {
          console.warn(' → not found');
        }
      } catch (err) {
        console.warn('Geocode error:', err.message || err);
      }
    }

    if (points.length === 0) {
      console.error('No points geocoded, aborting.');
      process.exit(1);
    }

    const fc = turf.featureCollection(points);

    // Try concave polygon first (produces tighter boundary). Parameter maxEdge controls detail.
    let polygon = null;
    try {
      polygon = turf.concave(fc, { maxEdge: 2 }); // kilometers by default
    } catch (e) {
      polygon = null;
    }

    if (!polygon) {
      // Fall back to convex hull
      const hull = turf.convex(fc);
      polygon = hull;
    }

    const out = {
      type: 'FeatureCollection',
      features: []
    };

    // Keep points as one feature and polygon as another
    out.features.push(...fc.features);
    if (polygon) {
      polygon.properties = polygon.properties || {};
      polygon.properties.generated = true;
      polygon.properties.source = path.basename(absInput);
      out.features.push(polygon);
    }

    const outDir = path.dirname(OUT);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote GeoJSON to', OUT);
    console.log('Done. You can further refine the polygon with geojson.io or import into GIS.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
