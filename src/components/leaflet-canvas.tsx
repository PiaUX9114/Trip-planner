'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './trip-map.css';
import type { MapStop, RoutePreview } from './map-types';

type Props = {
  stops: MapStop[];
  route: RoutePreview | null;
  selectedStopId: string;
  onSelectStop: (stopId: string) => void;
};

export default function LeafletCanvas({ stops, route, selectedStopId, onSelectStop }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const linesRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([25, 0], 2);
    L.tileLayer('/api/tiles/{z}/{x}/{y}', {
      maxZoom: 19,
      attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    linesRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The map remains viewport-driven: no tile prefetch or offline tile downloads.
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      linesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const lines = linesRef.current;
    if (!map || !markers || !lines) return;
    markers.clearLayers();
    lines.clearLayers();
    const pinned = stops.filter((stop) => stop.latitude !== null && stop.longitude !== null &&
      Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));
    const latlngs: L.LatLngExpression[] = [];
    pinned.forEach((stop) => {
      const latlng: L.LatLngExpression = [stop.latitude!, stop.longitude!];
      latlngs.push(latlng);
      const number = stops.indexOf(stop) + 1;
      const marker = L.marker(latlng, {
        icon: L.divIcon({
          html: `<span>${number}</span>`,
          className: `trip-stop-marker${stop.id === selectedStopId ? ' is-selected' : ''}`,
          iconSize: [32, 36], iconAnchor: [16, 36],
        }),
      }).addTo(markers);
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = `${number}. ${stop.title}`; // No user-controlled HTML injection.
      popup.appendChild(name);
      if (stop.location_label) {
        const detail = document.createElement('div');
        detail.textContent = stop.location_label;
        popup.appendChild(detail);
      }
      marker.bindPopup(popup);
      marker.on('click', () => onSelectStop(stop.id));
    });
    if (route?.points?.length && route.points.length > 1) {
      L.polyline(route.points.map((pair) => [pair[0], pair[1]] as L.LatLngExpression), {
        color: '#0f766e', weight: 5, opacity: 0.85,
      }).addTo(lines);
    } else if (latlngs.length > 1) {
      L.polyline(latlngs, {
        color: '#64748b', weight: 3, opacity: 0.8, dashArray: '7, 7',
      }).addTo(lines);
    }
    if (latlngs.length === 1) map.setView(latlngs[0], 13);
    else if (latlngs.length > 1) map.fitBounds(L.latLngBounds(latlngs), { padding: [34, 34], maxZoom: 13 });
    else map.setView([25, 0], 2);
  }, [stops, route, selectedStopId, onSelectStop]);

  return (
    <div ref={containerRef} className="h-[340px] w-full rounded-xl border border-slate-200 sm:h-[460px]"
      role="region" aria-label="Interactive trip map with Geoapify tiles" />
  );
}
