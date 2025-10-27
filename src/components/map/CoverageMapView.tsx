import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { DmaCoverageData } from "@/hooks/useMapCoverage";
import { Loader2 } from "lucide-react";

interface CoverageMapViewProps {
  coverage: DmaCoverageData[];
  searchQuery: string;
  onDmaClick: (dmaName: string) => void;
  highlightInvestorId?: string | null;
}

export function CoverageMapView({
  coverage,
  searchQuery,
  onDmaClick,
  highlightInvestorId,
}: CoverageMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const stateDataRef = useRef<Record<string, { totalInvestors: number; dmas: DmaCoverageData[] }>>({});
  const [mapLoaded, setMapLoaded] = useState(false);

  // State-level coordinates (approximate centers)
  const stateCoordinates: Record<string, [number, number]> = {
    AL: [-86.9023, 32.3182], AK: [-152.4044, 61.3707], AZ: [-111.0937, 34.0489],
    AR: [-92.3731, 34.7465], CA: [-119.4179, 36.7783], CO: [-105.7821, 39.5501],
    CT: [-72.7554, 41.6032], DE: [-75.5277, 38.9108], FL: [-81.5158, 27.6648],
    GA: [-83.5007, 32.1656], HI: [-155.5828, 19.8968], ID: [-114.7420, 44.0682],
    IL: [-89.3985, 40.6331], IN: [-86.1349, 40.2672], IA: [-93.0977, 41.8780],
    KS: [-98.4842, 39.0119], KY: [-84.2700, 37.8393], LA: [-91.9623, 30.9843],
    ME: [-69.4455, 45.2538], MD: [-76.6413, 39.0458], MA: [-71.3824, 42.4072],
    MI: [-85.6024, 44.3148], MN: [-94.6859, 46.7296], MS: [-89.3985, 32.3547],
    MO: [-91.8318, 37.9643], MT: [-110.3626, 46.8797], NE: [-99.9018, 41.4925],
    NV: [-116.4194, 38.8026], NH: [-71.5724, 43.1939], NJ: [-74.4057, 40.0583],
    NM: [-105.8701, 34.5199], NY: [-75.5268, 43.2994], NC: [-79.0193, 35.7596],
    ND: [-101.0020, 47.5515], OH: [-82.9071, 40.4173], OK: [-97.5164, 35.4676],
    OR: [-120.5542, 43.8041], PA: [-77.1945, 41.2033], RI: [-71.4774, 41.5801],
    SC: [-81.1637, 33.8361], SD: [-99.9018, 43.9695], TN: [-86.5804, 35.5175],
    TX: [-99.9018, 31.9686], UT: [-111.0937, 39.3200], VT: [-72.5778, 44.5588],
    VA: [-78.6569, 37.4316], WA: [-120.7401, 47.7511], WV: [-80.4549, 38.5976],
    WI: [-89.6385, 43.7844], WY: [-107.2903, 43.0760], DC: [-77.0369, 38.9072],
  };

  const getColor = (count: number) => {
    if (count === 0) return "#d1d5db"; // gray-300
    if (count <= 2) return "#93c5fd"; // blue-300
    if (count <= 5) return "#60a5fa"; // blue-400
    if (count <= 10) return "#2563eb"; // blue-600
    return "#7c3aed"; // purple-600
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 
      'pk.eyJ1IjoiY2xldmVyb2ZmZXJzIiwiYSI6ImNtaDhrcnY4ajE2azQya29hcHFta3F4OWwifQ.ttlfR3DHiCAvbfL6-B1yqQ';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283],
      zoom: 4,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    const failSafe = setTimeout(() => {
      // Avoid infinite spinner if style/token fails
      setMapLoaded(true);
    }, 8000);

    map.current.on("load", () => {
      console.log("✅ Mapbox map loaded successfully");
      clearTimeout(failSafe);
      map.current?.resize();
      setMapLoaded(true);
    });

    map.current.on("error", (e) => {
      console.error("⚠️ Mapbox error:", e.error);
      // Show UI even if map style fails to load
      clearTimeout(failSafe);
      setMapLoaded(true);
    });

    return () => {
      clearTimeout(failSafe);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when coverage changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !coverage) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Filter out invalid state codes (like "XX" for multi-state DMAs)
    const validCoverage = coverage.filter(dma => {
      const hasValidState = dma.state && dma.state !== 'XX' && stateCoordinates[dma.state];
      if (!hasValidState) {
        console.warn(`⚠️ Skipping DMA "${dma.dma}" with invalid state code: "${dma.state}"`);
      }
      return hasValidState;
    });

    // Group by state and aggregate
    const stateData = validCoverage.reduce((acc, dma) => {
      if (!acc[dma.state]) {
        acc[dma.state] = {
          totalInvestors: 0,
          dmas: [],
        };
      }
      acc[dma.state].totalInvestors += dma.investor_count;
      acc[dma.state].dmas.push(dma);
      return acc;
    }, {} as Record<string, { totalInvestors: number; dmas: DmaCoverageData[] }>);

    // Build GeoJSON features for state aggregates and render via Mapbox layers (more accurate than DOM markers)
    stateDataRef.current = stateData;

    const features = Object.entries(stateData)
      .map(([state, data]) => {
        const coords = stateCoordinates[state];
        if (!coords) {
          console.warn(`⚠️ No coordinates found for state: ${state}`);
          return null;
        }
        const [lng, lat] = coords;
        if (lng < -125 || lng > -65 || lat < 25 || lat > 50) {
          console.warn(`⚠️ Coordinates out of US bounds for ${state}: [${lng}, ${lat}]`);
          return null;
        }
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            state,
            totalInvestors: data.totalInvestors,
          },
        } as const;
      })
      .filter(Boolean) as any[];

    const featureCollection = {
      type: 'FeatureCollection',
      features,
    } as const;

    const mapInstance = map.current!;

    // Add or update source/layers
    const sourceId = 'state-coverage';
    const circleLayerId = 'state-coverage-circles';
    const labelLayerId = 'state-coverage-labels';

    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: featureCollection as any,
      });

      // Circles sized and colored by investor totals
      mapInstance.addLayer({
        id: circleLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          // color scale mirrors getColor()
          'circle-color': [
            'step',
            ['get', 'totalInvestors'],
            '#d1d5db', // 0
            1, '#93c5fd', // 1-2
            3, '#60a5fa', // 3-5
            6, '#2563eb', // 6-10
            11, '#7c3aed', // >10
          ],
          'circle-opacity': 0.7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'totalInvestors'],
            0, 24,
            10, 60,
            50, 100,
          ],
        },
      });

      // Text labels for totals
      mapInstance.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['to-string', ['get', 'totalInvestors']],
          'text-size': 12,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Interactions
      mapInstance.on('mouseenter', circleLayerId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', circleLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
      });
      mapInstance.on('click', circleLayerId, (e) => {
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        const coords = feature && (feature.geometry as any)?.coordinates as [number, number] | undefined;
        if (!state || !coords) return;

        const data = stateDataRef.current[state];
        if (!data) return;

        const html = `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${state}</h3>
            <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
              ${data.totalInvestors} total investor${data.totalInvestors !== 1 ? 's' : ''}
            </p>
            <div style="max-height: 200px; overflow-y: auto;">
              ${data.dmas
                .sort((a, b) => b.investor_count - a.investor_count)
                .slice(0, 5)
                .map((dma) => `
                  <div style="font-size: 11px; margin-bottom: 4px; padding: 4px; background: #f3f4f6; border-radius: 4px; cursor: pointer;"
                       onclick="window.dispatchEvent(new CustomEvent('dma-click', { detail: '${dma.dma}' }))">
                    <strong>${dma.dma}</strong>: ${dma.investor_count} investor${dma.investor_count !== 1 ? 's' : ''}
                  </div>
                `)
                .join('')}
              ${data.dmas.length > 5 ? `<p style="font-size: 11px; color: #666; margin-top: 4px;">+${data.dmas.length - 5} more DMAs</p>` : ''}
            </div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true, maxWidth: '300px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(mapInstance);
      });
    } else {
      const source = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
      source.setData(featureCollection as any);
    }


    // Handle DMA click from popup
    const handleDmaClick = (e: any) => {
      onDmaClick(e.detail);
    };
    window.addEventListener('dma-click', handleDmaClick);

    return () => {
      window.removeEventListener('dma-click', handleDmaClick);
    };
  }, [coverage, mapLoaded, onDmaClick]);

  // Handle search highlighting
  useEffect(() => {
    if (!map.current || !mapLoaded || !searchQuery || !coverage) return;

    const query = searchQuery.toLowerCase();
    const matchedDma = coverage.find(
      (dma) => dma.dma.toLowerCase().includes(query) || dma.state.toLowerCase().includes(query)
    );

    if (matchedDma && stateCoordinates[matchedDma.state]) {
      map.current.flyTo({
        center: stateCoordinates[matchedDma.state],
        zoom: 6,
        duration: 1500,
      });
    }
  }, [searchQuery, coverage, mapLoaded]);

  return (
    <div className="flex-1 relative">
      <div ref={mapContainer} className="absolute inset-0" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
