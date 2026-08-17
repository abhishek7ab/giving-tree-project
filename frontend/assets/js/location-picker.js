/**
 * Giving Tree — location-picker.js
 * High-performance, restrained dark-theme location picker, Leaflet map integration,
 * GPS auto-detection, geocoding fallback, distance calculation, and routing links.
 */

(function () {
    'use strict';

    // Default Fallback Coordinates (Pune, Maharashtra, India community center)
    const DEFAULT_COORDS = { lat: 18.5204, lng: 73.8567 };

    // Strictly Curated 8 Pune Neighborhood Hubs
    const PUNE_LOCALITIES = [
        { name: 'Kothrud, Pune', shortName: 'Kothrud', lat: 18.5074, lng: 73.8077, landmark: 'Near MIT / Vanaz' },
        { name: 'Baner, Pune', shortName: 'Baner', lat: 18.5590, lng: 73.7868, landmark: 'High Street / Pan Card Club Rd' },
        { name: 'FC Road, Pune', shortName: 'FC Road', lat: 18.5284, lng: 73.8417, landmark: 'Shivaji Nagar / FC Road' },
        { name: 'Hinjawadi, Pune', shortName: 'Hinjawadi', lat: 18.5913, lng: 73.7389, landmark: 'Phase 1 IT Park / Shivaji Chowk' },
        { name: 'Viman Nagar, Pune', shortName: 'Viman Nagar', lat: 18.5679, lng: 73.9143, landmark: 'Near Phoenix Mall / Symbiosis' },
        { name: 'Koregaon Park, Pune', shortName: 'Koregaon Park', lat: 18.5362, lng: 73.8940, landmark: 'North Main Road / Osho Ashram' },
        { name: 'Hadapsar, Pune', shortName: 'Hadapsar', lat: 18.5089, lng: 73.9259, landmark: 'Magarpatta City / Amanora' },
        { name: 'Katraj, Pune', shortName: 'Katraj', lat: 18.4575, lng: 73.8677, landmark: 'Katraj Zoo / Bharati Vidyapeeth' }
    ];

    function matchPuneLocality(query) {
        if (!query || typeof query !== 'string') return null;
        const q = query.toLowerCase().replace(/[\s,.-]/g, '');
        return PUNE_LOCALITIES.find(loc => {
            const locClean = loc.name.toLowerCase().replace(/[\s,.-]/g, '');
            const subName = loc.shortName.toLowerCase().replace(/[\s,.-]/g, '');
            return locClean.includes(q) || q.includes(subName) || q.includes(loc.name.split(',')[0].toLowerCase().trim());
        }) || null;
    }

    // SVG Pin Icon Generator
    function createMapPinIcon(color = '#10b981', label = '') {
        if (typeof L === 'undefined') return null;
        return L.divIcon({
            className: 'gt-custom-map-pin',
            html: `
                <div class="gt-pin-wrapper" style="--pin-color: ${color};">
                    <div class="gt-pin-bubble">
                        <i class="fas ${label === 'delivery' ? 'fa-flag' : 'fa-box-open'}"></i>
                    </div>
                    <div class="gt-pin-point"></div>
                    <div class="gt-pin-pulse"></div>
                </div>
            `,
            iconSize: [36, 44],
            iconAnchor: [18, 42],
            popupAnchor: [0, -38]
        });
    }

    /**
     * Haversine formula to compute great-circle distance between two coordinates in kilometers.
     */
    function getDistanceKm(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
        const numLat1 = Number(lat1);
        const numLon1 = Number(lon1);
        const numLat2 = Number(lat2);
        const numLon2 = Number(lon2);
        if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

        const R = 6371; // Earth's radius in km
        const dLat = (numLat2 - numLat1) * Math.PI / 180;
        const dLon = (numLon2 - numLon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(numLat1 * Math.PI / 180) * Math.cos(numLat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Format distance into human-friendly string (e.g., "850 m" or "3.4 km").
     */
    function formatDistance(distKm) {
        if (distKm == null || isNaN(distKm)) return '';
        if (distKm < 1) {
            return `${Math.round(distKm * 1000)} m away`;
        }
        return `${distKm.toFixed(1)} km away`;
    }

    /**
     * Reverse geocode coordinates using OpenStreetMap Nominatim.
     */
    async function reverseGeocode(lat, lng) {
        // Fast match against Pune dictionary
        for (const loc of PUNE_LOCALITIES) {
            const d = getDistanceKm(lat, lng, loc.lat, loc.lng);
            if (d !== null && d < 1.2) {
                return loc.name;
            }
        }

        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!res.ok) return 'Pune, Maharashtra';
            const data = await res.json();
            if (!data) return 'Pune, Maharashtra';

            const addr = data.address || {};
            const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter;
            const city = addr.city || addr.town || addr.village || addr.county || 'Pune';

            const parts = [suburb, city].filter(Boolean);
            if (parts.length > 0) return parts.join(', ');
            return data.display_name ? data.display_name.split(',').slice(0, 2).join(', ').trim() : 'Pune, Maharashtra';
        } catch (e) {
            console.warn('Reverse geocode error:', e);
            return 'Pune, Maharashtra';
        }
    }

    /**
     * Search address query with Pune priority.
     */
    async function searchLocation(query) {
        if (!query || !String(query).trim()) return [];
        const cleanQuery = String(query).replace(/[^\w\s,.-]/gi, '').trim().toLowerCase();

        // Check Pune localities first
        const localMatches = PUNE_LOCALITIES.filter(loc =>
            loc.name.toLowerCase().includes(cleanQuery) ||
            loc.landmark.toLowerCase().includes(cleanQuery) ||
            cleanQuery.includes(loc.name.split(',')[0].toLowerCase())
        ).map(loc => ({
            display_name: `${loc.name} (${loc.landmark})`,
            lat: String(loc.lat),
            lon: String(loc.lng)
        }));

        if (localMatches.length >= 3) return localMatches.slice(0, 3);

        try {
            const queryWithPune = cleanQuery.includes('pune') || cleanQuery.includes('maharashtra') ? cleanQuery : `${cleanQuery}, Pune, Maharashtra`;
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithPune)}&limit=3&addressdetails=1`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!res.ok) return localMatches;
            const remoteData = await res.json();
            return [...localMatches, ...(remoteData || [])].slice(0, 4);
        } catch (e) {
            console.warn('Geocode search error:', e);
            return localMatches;
        }
    }

    /**
     * Get user's current GPS location via HTML5 Geolocation API.
     */
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                }),
                err => {
                    let msg = 'Unable to fetch current location.';
                    if (err.code === 1) msg = 'Location access was denied in browser settings.';
                    else if (err.code === 2) msg = 'Location position unavailable.';
                    else if (err.code === 3) msg = 'Location request timed out.';
                    reject(new Error(msg));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    /**
     * Format coordinates into a readable latitude/longitude string.
     */
    function formatCoords(lat, lng) {
        if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) return '';
        const numLat = Number(lat);
        const numLng = Number(lng);
        const latDir = numLat >= 0 ? 'N' : 'S';
        const lngDir = numLng >= 0 ? 'E' : 'W';
        return `${Math.abs(numLat).toFixed(4)}° ${latDir}, ${Math.abs(numLng).toFixed(4)}° ${lngDir}`;
    }

    /**
     * Generate Google Maps directions URL with fallback to search query.
     */
    function getDirectionsUrl(destLat, destLng, startLat, startLng, destName = '', startName = '') {
        if (destLat != null && destLng != null && !isNaN(destLat) && !isNaN(destLng)) {
            let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destLat)},${encodeURIComponent(destLng)}`;
            if (startLat != null && startLng != null && !isNaN(startLat) && !isNaN(startLng)) {
                url += `&origin=${encodeURIComponent(startLat)},${encodeURIComponent(startLng)}`;
            } else if (startName && startName.trim()) {
                url += `&origin=${encodeURIComponent(startName.trim())}`;
            }
            return url;
        }

        // Fallback using text address query
        const destination = encodeURIComponent(destName || 'India');
        let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        if (startName && startName.trim()) {
            url += `&origin=${encodeURIComponent(startName.trim())}`;
        }
        return url;
    }

    /**
     * Interactive Location Picker Widget
     */
    function initPicker({
        mapContainerId,
        addressInputId,
        latInputId,
        lngInputId,
        coordsBadgeId,
        detectBtnId,
        initialLat,
        initialLng,
        initialAddress,
        pinType = 'pickup',
        onChange
    }) {
        const mapEl = document.getElementById(mapContainerId);
        const addrInput = document.getElementById(addressInputId);
        const latInput = document.getElementById(latInputId);
        const lngInput = document.getElementById(lngInputId);
        const badgeEl = coordsBadgeId ? document.getElementById(coordsBadgeId) : null;
        const detectBtn = detectBtnId ? document.getElementById(detectBtnId) : null;

        if (!mapEl || typeof L === 'undefined') {
            console.warn('Leaflet is missing or map container not found:', mapContainerId);
            return null;
        }

        let currentLat = initialLat != null && !isNaN(Number(initialLat)) ? Number(initialLat) : DEFAULT_COORDS.lat;
        let currentLng = initialLng != null && !isNaN(Number(initialLng)) ? Number(initialLng) : DEFAULT_COORDS.lng;

        // Initialize Leaflet Map
        const map = L.map(mapContainerId, {
            center: [currentLat, currentLng],
            zoom: initialLat != null ? 14 : 12,
            zoomControl: true,
            attributionControl: false
        });

        // Add Dark Themed Tile Layer (CartoDB Dark Matter / OpenFreeMap)
        try {
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd',
                attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);
        } catch (e) {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                className: 'gt-dark-map-tiles'
            }).addTo(map);
        }

        // Marker Pin
        const pinColor = pinType === 'delivery' ? '#06b6d4' : '#10b981';
        let marker = L.marker([currentLat, currentLng], {
            draggable: true,
            icon: createMapPinIcon(pinColor, pinType)
        }).addTo(map);

        function updateUI(lat, lng, addressText) {
            currentLat = lat;
            currentLng = lng;

            if (latInput) latInput.value = lat.toFixed(6);
            if (lngInput) lngInput.value = lng.toFixed(6);

            if (badgeEl) {
                badgeEl.innerHTML = `<i class="fas fa-location-crosshairs" style="color:var(--accent);"></i> ${formatCoords(lat, lng)}`;
                badgeEl.style.display = 'inline-flex';
            }

            if (addressText && addrInput) {
                addrInput.value = addressText;
                addrInput.dispatchEvent(new Event('input'));
            }

            if (typeof onChange === 'function') {
                onChange({ lat, lng, address: addressText || (addrInput ? addrInput.value : '') });
            }
        }

        // On drag marker
        marker.on('dragend', async function (e) {
            const pos = e.target.getLatLng();
            const addr = await reverseGeocode(pos.lat, pos.lng);
            updateUI(pos.lat, pos.lng, addr);
        });

        // On map click
        map.on('click', async function (e) {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            const addr = await reverseGeocode(lat, lng);
            updateUI(lat, lng, addr);
        });

        // Detect current GPS location
        if (detectBtn) {
            detectBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                const origText = detectBtn.innerHTML;
                detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting GPS...';
                detectBtn.disabled = true;

                try {
                    const pos = await getCurrentPosition();
                    map.setView([pos.lat, pos.lng], 15);
                    marker.setLatLng([pos.lat, pos.lng]);
                    const addr = await reverseGeocode(pos.lat, pos.lng);
                    updateUI(pos.lat, pos.lng, addr);
                    if (window.showToast) window.showToast('📍 Location detected successfully!', 'success');
                } catch (err) {
                    if (window.showToast) window.showToast(err.message, 'warning');
                    else alert(err.message);
                } finally {
                    detectBtn.innerHTML = origText;
                    detectBtn.disabled = false;
                }
            });
        }

        // Trigger resize adjustment when modal becomes visible
        [50, 150, 300].forEach(ms => setTimeout(() => map.invalidateSize(), ms));

        // Initial setup
        if (initialLat != null && initialLng != null) {
            updateUI(currentLat, currentLng, initialAddress);
        }

        return {
            map,
            marker,
            setCoords: async (lat, lng, addressText) => {
                map.setView([lat, lng], 15);
                marker.setLatLng([lat, lng]);
                const addr = addressText || await reverseGeocode(lat, lng);
                updateUI(lat, lng, addr);
            },
            selectLocality: (localityName) => {
                const match = matchPuneLocality(localityName);
                if (match) {
                    map.flyTo([match.lat, match.lng], 15, { animate: true, duration: 0.8 });
                    marker.setLatLng([match.lat, match.lng]);
                    updateUI(match.lat, match.lng, match.name);
                    return match;
                }
                return null;
            },
            invalidateSize: () => map.invalidateSize()
        };
    }

    /**
     * Shared Interactive Map Viewer Modal (supports single pin or dual route pins with automatic geocoding fallback)
     */
    let sharedModalMap = null;
    let sharedModalRouteLine = null;
    let sharedModalMarkers = [];

    async function openDeliveryMapModal({
        title = 'Handover Delivery Location',
        pickupLocation = '',
        pickupLat = null,
        pickupLng = null,
        deliveryLocation = '',
        deliveryLat = null,
        deliveryLng = null,
        deliveryInstructions = ''
    }) {
        let modalEl = document.getElementById('gtSharedLocationMapModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'gtSharedLocationMapModal';
            modalEl.className = 'detail-modal-overlay';
            modalEl.innerHTML = `
                <div class="gt-location-modal-card" onclick="event.stopPropagation()">
                    <button class="detail-modal-close" onclick="GivingTreeLocation.closeDeliveryMapModal()" aria-label="Close modal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <div class="gt-loc-modal-header">
                        <div class="gt-loc-modal-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
                        </div>
                        <div>
                            <h3 id="gtMapModalTitle" style="margin:0; font-size:18px; color:var(--text-1); font-weight:800;">Location &amp; Route</h3>
                            <p id="gtMapModalSubtitle" style="margin:4px 0 0; font-size:12.5px; color:var(--text-2);">Coordinate pickup and safe handover spot</p>
                        </div>
                    </div>

                    <div id="gtSharedMapContainer" class="gt-modal-map-view"></div>

                    <div class="gt-loc-details-grid" id="gtLocDetailsGrid">
                        <!-- Dynamic location summary cards injected here -->
                    </div>

                    <div class="gt-loc-modal-actions" id="gtLocModalActions">
                        <!-- Navigation action buttons -->
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);

            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) closeDeliveryMapModal();
            });
        }

        document.getElementById('gtMapModalTitle').textContent = title;
        modalEl.classList.add('active');

        let pLat = pickupLat != null && !isNaN(Number(pickupLat)) ? Number(pickupLat) : null;
        let pLng = pickupLng != null && !isNaN(Number(pickupLng)) ? Number(pickupLng) : null;
        let dLat = deliveryLat != null && !isNaN(Number(deliveryLat)) ? Number(deliveryLat) : null;
        let dLng = deliveryLng != null && !isNaN(Number(deliveryLng)) ? Number(deliveryLng) : null;

        // 1. Fast match against Pune dictionary
        if (pLat == null && pickupLocation) {
            const puneMatch = matchPuneLocality(pickupLocation);
            if (puneMatch) {
                pLat = puneMatch.lat;
                pLng = puneMatch.lng;
            }
        }
        if (dLat == null && deliveryLocation) {
            const puneMatch = matchPuneLocality(deliveryLocation);
            if (puneMatch) {
                dLat = puneMatch.lat;
                dLng = puneMatch.lng;
            }
        }

        // 2. Auto-Geocode Fallback for Text-only records
        if (pLat == null && pickupLocation && pickupLocation.trim()) {
            try {
                const results = await searchLocation(pickupLocation);
                if (results && results.length > 0) {
                    pLat = parseFloat(results[0].lat);
                    pLng = parseFloat(results[0].lon);
                }
            } catch(e) {}
        }

        if (dLat == null && deliveryLocation && deliveryLocation.trim()) {
            try {
                const results = await searchLocation(deliveryLocation);
                if (results && results.length > 0) {
                    dLat = parseFloat(results[0].lat);
                    dLng = parseFloat(results[0].lon);
                }
            } catch(e) {}
        }

        // 3. Fallback to Pune center if no coordinates found
        if (pLat == null && (pickupLocation || !deliveryLocation)) {
            pLat = DEFAULT_COORDS.lat;
            pLng = DEFAULT_COORDS.lng;
        }

        const hasPickupCoords = pLat != null && pLng != null;
        const hasDeliveryCoords = dLat != null && dLng != null;

        // Render Summary Cards
        const detailsGrid = document.getElementById('gtLocDetailsGrid');
        let distText = '';
        if (hasPickupCoords && hasDeliveryCoords) {
            const distKm = getDistanceKm(pLat, pLng, dLat, dLng);
            distText = formatDistance(distKm);
        }

        let gridHtml = '';
        if (pickupLocation || hasPickupCoords) {
            gridHtml += `
                <div class="gt-loc-card pickup">
                    <div class="gt-loc-card-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                        Donor Pickup Area
                    </div>
                    <div class="gt-loc-card-name">${escapeHtml(pickupLocation || 'Pickup Area, Pune')}</div>
                    ${hasPickupCoords ? `<div class="gt-loc-card-coords"><i class="fas fa-location-crosshairs"></i> ${formatCoords(pLat, pLng)}</div>` : '<div class="gt-loc-card-coords" style="color:var(--text-3);">Pune locality</div>'}
                </div>
            `;
        }

        if (deliveryLocation || hasDeliveryCoords) {
            gridHtml += `
                <div class="gt-loc-card delivery">
                    <div class="gt-loc-card-badge" style="background:rgba(6,182,212,0.15); color:var(--accent-cyan);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        Requester Delivery Spot
                    </div>
                    <div class="gt-loc-card-name">${escapeHtml(deliveryLocation || 'Delivery Spot, Pune')}</div>
                    ${hasDeliveryCoords ? `<div class="gt-loc-card-coords"><i class="fas fa-location-crosshairs"></i> ${formatCoords(dLat, dLng)}</div>` : '<div class="gt-loc-card-coords" style="color:var(--text-3);">Pune locality</div>'}
                    ${deliveryInstructions ? `<div class="gt-loc-card-note"><i class="fas fa-comment-dots"></i> "${escapeHtml(deliveryInstructions)}"</div>` : ''}
                </div>
            `;
        }

        if (distText) {
            gridHtml += `
                <div class="gt-loc-distance-badge">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--accent); margin-right:6px;"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
                    <span>Approx. Distance: <strong>${distText}</strong></span>
                </div>
            `;
        }

        detailsGrid.innerHTML = gridHtml;

        // Render Navigation Actions
        const actionsEl = document.getElementById('gtLocModalActions');
        const destLat = dLat || pLat || DEFAULT_COORDS.lat;
        const destLng = dLng || pLng || DEFAULT_COORDS.lng;
        const destName = deliveryLocation || pickupLocation || 'Pune';
        const startName = hasPickupCoords && hasDeliveryCoords ? pickupLocation : '';

        const gmapsUrl = getDirectionsUrl(destLat, destLng, hasPickupCoords ? pLat : null, hasPickupCoords ? pLng : null, destName, startName);

        actionsEl.innerHTML = `
            <a href="${gmapsUrl}" target="_blank" rel="noopener" class="btn primary" style="padding:12px 22px; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Open in Google Maps
            </a>
            <button class="btn secondary" onclick="GivingTreeLocation.closeDeliveryMapModal()" style="padding:12px 22px; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Close
            </button>
        `;

        // Initialize / Recreate Leaflet Map View Cleanly
        const mapContainer = document.getElementById('gtSharedMapContainer');
        if (!mapContainer || typeof L === 'undefined') return;

        if (sharedModalMap) {
            try { sharedModalMap.remove(); } catch(e) {}
            sharedModalMap = null;
        }

        sharedModalMap = L.map('gtSharedMapContainer', {
            attributionControl: false,
            zoomControl: true,
            center: [destLat, destLng],
            zoom: 13
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(sharedModalMap);

        sharedModalMarkers = [];
        sharedModalRouteLine = null;

        const boundsGroup = [];

        if (hasPickupCoords) {
            const mPickup = L.marker([pLat, pLng], { icon: createMapPinIcon('#10b981', 'pickup') })
                .bindPopup(`<strong>📦 Item Pickup Area</strong><br>${escapeHtml(pickupLocation || 'Pickup Area')}`)
                .addTo(sharedModalMap);
            sharedModalMarkers.push(mPickup);
            boundsGroup.push([pLat, pLng]);
        }

        if (hasDeliveryCoords) {
            const mDelivery = L.marker([dLat, dLng], { icon: createMapPinIcon('#06b6d4', 'delivery') })
                .bindPopup(`<strong>🚩 Delivery Spot</strong><br>${escapeHtml(deliveryLocation || 'Delivery Spot')}`)
                .addTo(sharedModalMap);
            sharedModalMarkers.push(mDelivery);
            boundsGroup.push([dLat, dLng]);
        }

        if (hasPickupCoords && hasDeliveryCoords) {
            // Draw connecting dashed route line
            sharedModalRouteLine = L.polyline([[pLat, pLng], [dLat, dLng]], {
                color: '#10b981',
                weight: 3,
                opacity: 0.85,
                dashArray: '6, 8'
            }).addTo(sharedModalMap);
        }

        // Invalidate size across ticks to ensure instant tile rendering
        [10, 50, 120, 250, 450].forEach(ms => {
            setTimeout(() => {
                if (sharedModalMap) {
                    sharedModalMap.invalidateSize();
                    if (boundsGroup.length >= 2) {
                        try {
                            sharedModalMap.fitBounds(L.latLngBounds(boundsGroup), { padding: [40, 40], maxZoom: 14 });
                        } catch(e) {
                            sharedModalMap.setView(boundsGroup[0], 13);
                        }
                    } else if (boundsGroup.length === 1) {
                        sharedModalMap.setView(boundsGroup[0], 14);
                    } else {
                        sharedModalMap.setView([DEFAULT_COORDS.lat, DEFAULT_COORDS.lng], 13);
                    }
                }
            }, ms);
        });
    }

    function closeDeliveryMapModal() {
        const modalEl = document.getElementById('gtSharedLocationMapModal');
        if (modalEl) modalEl.classList.remove('active');
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const GivingTreeLocation = {
        DEFAULT_COORDS,
        PUNE_LOCALITIES,
        matchPuneLocality,
        getDistanceKm,
        formatDistance,
        formatCoords,
        getDirectionsUrl,
        reverseGeocode,
        searchLocation,
        getCurrentPosition,
        initPicker,
        openDeliveryMapModal,
        closeDeliveryMapModal
    };

    if (typeof window !== 'undefined') {
        window.GivingTreeLocation = GivingTreeLocation;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GivingTreeLocation;
    }
})();
