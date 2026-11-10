'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './navigation-map.css';
import type { NavigationRoute, NavigationStop } from '@/lib/navigation/types';
import type { LatLon } from '@/lib/navigation/route-progress';

type Props = {
  stops: NavigationStop[];
  route: NavigationRoute | null;
  location: LatLon | null;
  follow: boolean;
};

export default function NavigationMap({ stops, route, location, follow }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const waypointsRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const gpsRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView([25, 0], 2);
    L.tileLayer('/api/tiles/{z}/{x}/{y}', {
      maxZoom: 19,
      attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    waypointsRef.current = L.layerGroup().addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      waypointsRef.current = null;
      routeRef.current = null;
      gpsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const waypoints = waypointsRef.current;
    const lines = routeRef.current;
    if (!map || !waypoints || !lines) return;
    waypoints.clearLayers();
    lines.clearLayers();
    const coords: L.LatLngExpression[] = [];
    stops.forEach((stop, i) => {
      if (stop.latitude === null || stop.longitude === null) return;
      const point: L.LatLngExpression = [stop.latitude, stop.longitude];
      coords.push(point);
      const marker = L.marker(point, {
        icon: L.divIcon({
          className: 'navigation-waypoint',
          html: String(i + 1),
          iconSize: [30, 30], iconAnchor: [15, 15],
        }),
      }).addTo(waypoints);
      // Use DOM textContent rather than HTML for user-defined stop titles.
      const label = document.createElement('span');
      label.textContent = `${i + 1}. ${stop.title}`;
      marker.bindPopup(label);
    });
    if (route?.points && route.points.length >= 2) {
      L.polyline(route.points, { color: '#0f766e', opacity: 0.85, weight: 6 }).addTo(lines);
      map.fitBounds(L.latLngBounds(route.points), { padding: [36, 36], maxZoom: 15 });
    } else if (coords.length > 1) {
      L.polyline(coords, { color: '#64748b', weight: 3, dashArray: '7, 7' }).addTo(lines);
      map.fitBounds(L.latLngBounds(coords), { padding: [36, 36], maxZoom: 14 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 13);
    } else {
      map.setView([25, 0], 2);
    }
  }, [stops, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!location) {
      gpsRef.current?.remove();
      gpsRef.current = null;
      return;
    }
    if (!gpsRef.current) {
      gpsRef.current = L.circleMarker(location, {
        radius: 9, color: '#ffffff', fillColor: '#2563eb', fillOpacity: 1,
        weight: 3,
      }).addTo(map).bindTooltip('Your device position (approximate)');
    } else gpsRef.current.setLatLng(location);
    if (follow) map.panTo(location, { animate: false });
  }, [location, follow]);

  return <div ref={elRef} className="h-[340px] w-full rounded-xl border border-slate-200 sm:h-[470px]"
    role="region" aria-label="Geoapify driving map with trip stops and your device location" />;
}
