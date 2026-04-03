"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface GeofenceMapProps {
  lat: number;
  lng: number;
  radius: number;
}

export default function GeofenceMap({ lat, lng, radius }: GeofenceMapProps) {
  const position: [number, number] = [lat || 41.4048, lng || -74.3279];

  return (
    <MapContainer
      center={position}
      zoom={14}
      style={{ height: "280px", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} />
      <Circle
        center={position}
        radius={radius}
        pathOptions={{
          fillColor: "rgba(37, 99, 235, 0.15)",
          fillOpacity: 1,
          color: "#2563EB",
          weight: 2,
        }}
      />
    </MapContainer>
  );
}
