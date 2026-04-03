"use client";

import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);
  return null;
}

export default function GeofenceMap({
  lat,
  lng,
  radiusMeters,
  className = "h-52 w-full rounded-xl overflow-hidden border border-[#0f1729]",
}: {
  lat: number;
  lng: number;
  radiusMeters: number;
  className?: string;
}) {
  return (
    <MapContainer
      key={`${lat.toFixed(5)}-${lng.toFixed(5)}`}
      center={[lat, lng]}
      zoom={14}
      className={className}
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle
        center={[lat, lng]}
        radius={radiusMeters}
        pathOptions={{
          color: "#2563EB",
          fillColor: "#3B82F6",
          fillOpacity: 0.12,
          weight: 2,
        }}
      />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  );
}
