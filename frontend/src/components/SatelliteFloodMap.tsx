import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import type { FlowArrow, RegionState } from "../lib/types";
import { cellCenter, cityGeo, latLngToCell, type CityGeo } from "../lib/indiaGeo";
import "leaflet/dist/leaflet.css";

function FloodCanvas({
  geo,
  regions,
  flows,
  selected,
  onSelect,
}: {
  geo: CityGeo;
  regions: RegionState[];
  flows: FlowArrow[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const stateRef = useRef({ geo, regions, flows, selected });
  stateRef.current = { geo, regions, flows, selected };

  useEffect(() => {
    const canvas = L.DomUtil.create("canvas", "flood-canvas") as HTMLCanvasElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "450";
    canvas.style.pointerEvents = "none";
    map.getContainer().appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dash = 0;
    let raf = 0;
    let last = 0;

    const byId = () => Object.fromEntries(stateRef.current.regions.map((r) => [r.id, r]));

    const draw = (ts: number) => {
      const { geo: g, regions: regs, flows: fl, selected: sel } = stateRef.current;
      const size = map.getSize();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(size.x * dpr) || canvas.height !== Math.floor(size.y * dpr)) {
        canvas.width = Math.floor(size.x * dpr);
        canvas.height = Math.floor(size.y * dpr);
        canvas.style.width = `${size.x}px`;
        canvas.style.height = `${size.y}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);

      if (ts - last > 32) {
        dash = (dash + 1.6) % 400;
        last = ts;
      }

      const channel = regs.filter((r) => r.land_use === "drainage_channel" || r.land_use === "lake");
      const stage =
        channel.length > 0 ? channel.reduce((s, r) => s + r.water_pct, 0) / channel.length / 100 : 0.25;
      const meanWet = regs.reduce((s, r) => s + r.water_pct, 0) / Math.max(1, regs.length) / 100;
      const flood = Math.max(0.16, Math.min(1.45, stage * 0.65 + meanWet * 1.1));

      const strokeRiver = (coords: [number, number][], width: number, color: string, blur = 0, dashed = false) => {
        if (coords.length < 2) return;
        ctx.save();
        if (blur) ctx.filter = `blur(${blur}px)`;
        ctx.beginPath();
        coords.forEach((c, i) => {
          const p = map.latLngToContainerPoint(L.latLng(c[0], c[1]));
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (dashed) {
          ctx.setLineDash([14, 22]);
          ctx.lineDashOffset = -dash;
        }
        ctx.stroke();
        ctx.restore();
      };

      for (const river of g.rivers) {
        const wide = /brahmaputra|hooghly|yamuna/i.test(river.name);
        const base = wide ? 22 : 8;
        strokeRiver(river.coords, base + flood * (wide ? 52 : 34), "rgba(8, 90, 190, 0.42)", 16);
        strokeRiver(river.coords, base * 0.7 + flood * (wide ? 26 : 16), "rgba(14, 140, 220, 0.78)", 4);
        strokeRiver(river.coords, 3 + flood * 4, "rgba(125, 211, 252, 0.95)");
        strokeRiver(river.coords, 2.2 + flood * 2, "rgba(224, 242, 254, 0.9)", 0, true);
      }

      for (const lake of g.lakes) {
        if (lake.coords.length < 3) continue;
        ctx.beginPath();
        lake.coords.forEach((c, i) => {
          const p = map.latLngToContainerPoint(L.latLng(c[0], c[1]));
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(12, 120, 210, ${0.28 + flood * 0.35})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(125, 211, 252, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "lighter";
      for (const r of regs) {
        const wet =
          r.land_use === "lake" || r.land_use === "drainage_channel"
            ? Math.max(r.water_pct, 28)
            : r.water_pct;
        if (wet < 10) continue;
        const [lat, lng] = cellCenter(g, r.row, r.col);
        const p = map.latLngToContainerPoint(L.latLng(lat, lng));
        const a = map.latLngToContainerPoint(L.latLng(g.bbox.north, g.bbox.west));
        const b = map.latLngToContainerPoint(L.latLng(g.bbox.south, g.bbox.east));
        const cellW = Math.abs(b.x - a.x) / 12;
        const cellH = Math.abs(b.y - a.y) / 12;
        const radius = Math.max(cellW, cellH) * (0.45 + Math.min(1.6, wet / 90));
        const alpha = Math.min(0.72, 0.08 + wet / 160);
        const critical = r.status === "critical" || wet >= 100;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        if (critical) {
          grd.addColorStop(0, `rgba(37, 99, 235, ${alpha})`);
          grd.addColorStop(0.45, `rgba(14, 165, 233, ${alpha * 0.7})`);
        } else {
          grd.addColorStop(0, `rgba(56, 189, 248, ${alpha})`);
          grd.addColorStop(0.5, `rgba(14, 165, 233, ${alpha * 0.55})`);
        }
        grd.addColorStop(1, "rgba(8, 47, 73, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, radius * 1.15, radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      const idMap = byId();
      for (const f of fl) {
        if (f.rate_m3_min < 8) continue;
        const from = idMap[f.from_id];
        const to = idMap[f.to_id];
        if (!from || !to) continue;
        const a = map.latLngToContainerPoint(L.latLng(...cellCenter(g, from.row, from.col)));
        const bpt = map.latLngToContainerPoint(L.latLng(...cellCenter(g, to.row, to.col)));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(bpt.x, bpt.y);
        ctx.strokeStyle = f.blocked ? "rgba(251, 113, 133, 0.55)" : `rgba(125, 211, 252, ${Math.min(0.55, f.rate_m3_min / 80)})`;
        ctx.lineWidth = f.blocked ? 1 : Math.min(4, 0.6 + f.rate_m3_min / 40);
        ctx.stroke();
      }

      if (sel) {
        const r = idMap[sel];
        if (r) {
          const p = map.latLngToContainerPoint(L.latLng(...cellCenter(g, r.row, r.col)));
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.95)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onClick = (e: L.LeafletMouseEvent) => {
      const hit = latLngToCell(stateRef.current.geo, e.latlng.lat, e.latlng.lng);
      if (!hit) return;
      const region = stateRef.current.regions.find((r) => r.row === hit.row && r.col === hit.col);
      if (region) onSelect(region.id);
    };

    map.on("click", onClick);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      map.off("click", onClick);
      canvas.remove();
    };
  }, [map, onSelect]);

  return null;
}

function FlyToCity({ geo }: { geo: CityGeo }) {
  const map = useMap();
  useEffect(() => {
    map.setView(geo.center, geo.zoom, { animate: true });
  }, [geo, map]);
  return null;
}

export function SatelliteFloodMap({
  cityId,
  regions,
  flows,
  selected,
  onSelect,
}: {
  cityId: string;
  regions: RegionState[];
  flows: FlowArrow[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const geo = cityGeo(cityId);
  return (
    <MapContainer
      key={geo.id}
      center={geo.center}
      zoom={geo.zoom}
      zoomControl={false}
      className="satellite-map h-full w-full"
      attributionControl={false}
    >
      <ZoomControl position="bottomleft" />
      <TileLayer
        attribution='Satellite © <a href="https://www.esri.com/">Esri</a> · Maxar · Earthstar Geographics · Map © <a href="https://leafletjs.com/">Leaflet</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />
      <FlyToCity geo={geo} />
      <FloodCanvas geo={geo} regions={regions} flows={flows} selected={selected} onSelect={onSelect} />
    </MapContainer>
  );
}
