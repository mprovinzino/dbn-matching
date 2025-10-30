import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { DmaCoverageData, StateLevelCoverageData, useNationalCoverageCount } from "@/hooks/useMapCoverage";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoverageMapViewProps {
  coverage: DmaCoverageData[];
  stateLevelCoverage: StateLevelCoverageData[];
  searchQuery: string;
  onDmaClick: (stateCode: string, stateData: { investorIds: string[], coverage: any[], stateLevelData: any[] }) => void;
  highlightInvestorId?: string | null;
}

export function CoverageMapView({
  coverage,
  stateLevelCoverage,
  searchQuery,
  onDmaClick,
  highlightInvestorId,
}: CoverageMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const stateDataRef = useRef<Record<string, { totalInvestors: number; dmas: DmaCoverageData[] }>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const dmaStateOverrideRef = useRef<Record<string, string>>({});
  
  const { data: nationalCoverageData } = useNationalCoverageCount();

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

  // Update markers when coverage or state-level coverage changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !coverage) return;

    const updateMapData = async () => {
      console.log('🗺️ CoverageMapView updating with:', {
        coverageItems: coverage.length,
        highlightInvestorId,
      });

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

      // Filter by highlighted investor if specified
      const filteredCoverage = highlightInvestorId
        ? validCoverage.filter(dma => dma.investor_ids.includes(highlightInvestorId))
        : validCoverage;

      // Filter state-level coverage by highlighted investor
      const filteredStateLevel = highlightInvestorId
        ? stateLevelCoverage.filter((item) => item.investor_id === highlightInvestorId)
        : stateLevelCoverage;

      console.log('🎯 After filtering:', {
        filteredCount: filteredCoverage.length,
        uniqueStates: [...new Set(filteredCoverage.map(d => d.state))],
        stateLevelCount: filteredStateLevel.length,
      });

      // Group by state using ORIGINAL states (no overrides) and collect unique investor IDs
      const stateData = filteredCoverage.reduce((acc, dma) => {
        const stateKey = dma.state; // Use original state, no overrides
        
        if (!acc[stateKey]) {
          acc[stateKey] = {
            investorIdSet: new Set<string>(),
            dmas: [],
          };
        }
        // Add all investor IDs from this DMA to the state's set
        dma.investor_ids.forEach(id => acc[stateKey].investorIdSet.add(id));
        acc[stateKey].dmas.push(dma);
        return acc;
      }, {} as Record<string, { investorIdSet: Set<string>; dmas: DmaCoverageData[] }>);

      // Merge state-level investors into the stateData (union of DMA + state-level)
      filteredStateLevel.forEach(item => {
        const stateKey = item.state;
        if (!stateData[stateKey]) {
          stateData[stateKey] = {
            investorIdSet: new Set<string>(),
            dmas: [],
          };
        }
        stateData[stateKey].investorIdSet.add(item.investor_id);
      });

      // Convert Set size to totalInvestors count
      const stateDataWithCounts = Object.entries(stateData).reduce((acc, [state, data]) => {
        acc[state] = {
          totalInvestors: data.investorIdSet.size,
          dmas: data.dmas,
        };
        return acc;
      }, {} as Record<string, { totalInvestors: number; dmas: DmaCoverageData[] }>);

      const finalStates = Object.keys(stateDataWithCounts);
      console.log('📊 State data aggregated (no overrides):', {
        states: finalStates,
        stateData: Object.entries(stateDataWithCounts).map(([state, data]) => ({
          state,
          investors: data.totalInvestors,
          dmas: data.dmas.length,
        })),
      });

      // Build GeoJSON features for state aggregates and render via Mapbox layers (more accurate than DOM markers)
      stateDataRef.current = stateDataWithCounts;

      const includeNational = !searchQuery?.trim() && !highlightInvestorId;
      const nationalCount = includeNational ? (nationalCoverageData?.count || 0) : 0;

      console.log('🌍 National coverage:', { includeNational, nationalCount });

      // Features for states with coverage (using original state coordinates)
      const dmaSpecificFeatures = Object.entries(stateDataWithCounts)
        .map(([state, data]) => {
          const coords = stateCoordinates[state];
        if (!coords) {
          console.warn(`⚠️ No coordinates found for state: ${state}`);
          return null;
        }
        const [lng, lat] = coords;
        if (lng < -170 || lng > -65 || lat < 18 || lat > 72) {
          console.warn(`⚠️ Coordinates out of US bounds for ${state}: [${lng}, ${lat}]`);
          return null;
        }
        console.log(`✅ State ${state}: ${data.totalInvestors} unique investors`);
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
      features: dmaSpecificFeatures,
    } as const;

    const mapInstance = map.current!;

    // Add or update source/layers
    const sourceId = 'state-coverage';
    const circleLayerId = 'state-coverage-circles';
    const labelLayerId = 'state-coverage-labels';

    // Rebuild source and layers when focusing on a single investor to avoid stale tiles
    if (mapInstance.getSource(sourceId) && highlightInvestorId) {
      if (mapInstance.getLayer(labelLayerId)) mapInstance.removeLayer(labelLayerId);
      if (mapInstance.getLayer(circleLayerId)) mapInstance.removeLayer(circleLayerId);
      mapInstance.removeSource(sourceId);
    }

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

      // Interactions - hover cursor only
      mapInstance.on('mouseenter', circleLayerId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      
      mapInstance.on('mouseleave', circleLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      mapInstance.on('mouseenter', labelLayerId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      
      mapInstance.on('mouseleave', labelLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      // Click to open side panel with state info
      mapInstance.on('click', circleLayerId, (e) => {
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        if (state && onDmaClick) {
          const stateInfo = stateData[state];
          if (stateInfo) {
            const investorIds = Array.from(stateInfo.investorIdSet || []);
            const stateLevelData = filteredStateLevel.filter(item => item.state === state);
            onDmaClick(state, {
              investorIds,
              coverage: stateInfo.dmas,
              stateLevelData
            });
          }
        }
      });

      mapInstance.on('click', labelLayerId, (e) => {
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        if (state && onDmaClick) {
          const stateInfo = stateData[state];
          if (stateInfo) {
            const investorIds = Array.from(stateInfo.investorIdSet || []);
            const stateLevelData = filteredStateLevel.filter(item => item.state === state);
            onDmaClick(state, {
              investorIds,
              coverage: stateInfo.dmas,
              stateLevelData
            });
          }
        }
      });
    } else {
      const source = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
      source.setData(featureCollection as any);
    }

    // State-level markers removed - now merged into main state circles
    };

    updateMapData();
  }, [coverage, mapLoaded, onDmaClick, nationalCoverageData, searchQuery, stateLevelCoverage, highlightInvestorId]);


  // Handle search highlighting
  useEffect(() => {
    if (!map.current || !mapLoaded || !searchQuery || !coverage) return;

    const query = searchQuery.toLowerCase().trim();

    // 1) Try to match by DMA or state name directly
    let targetState: string | null = null;
    const matchedDma = coverage.find(
      (dma) => dma.dma.toLowerCase().includes(query) || dma.state.toLowerCase().includes(query)
    );
    if (matchedDma) {
      targetState = matchedDma.state;
    }

    // 2) If no DMA/state match, try to infer from investor search
    if (!targetState) {
      // When searching an investor, use the filtered coverage prop which already narrowed investor_ids
      const investorDmas = coverage.filter((dma) => dma.investor_ids && dma.investor_ids.length > 0);
      if (investorDmas.length > 0) {
        // Prefer a DMA that already has a valid state mapping
        const withValidState = investorDmas.find((d) => stateCoordinates[d.state]);
        if (withValidState) {
          targetState = withValidState.state;
        } else {
          // Last resort: look up the most common state for the first DMA via zip_code_reference
          const firstDma = investorDmas[0];
          (async () => {
            try {
              const { data, error } = await supabase
                .from('zip_code_reference')
                .select('state')
                .eq('dma', firstDma.dma);
              if (!error && data && data.length > 0) {
                const counts = data.reduce<Record<string, number>>((acc, row: any) => {
                  const s = row.state as string;
                  acc[s] = (acc[s] || 0) + 1;
                  return acc;
                }, {});
                const bestState = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                if (stateCoordinates[bestState]) {
                  map.current!.flyTo({ center: stateCoordinates[bestState], zoom: 6, duration: 1500 });
                }
              }
            } catch (e) {
              console.warn('Search fallback lookup failed', e);
            }
          })();
          return; // Exit early; async fallback will handle flyTo
        }
      }
    }

    if (targetState && stateCoordinates[targetState]) {
      map.current.flyTo({
        center: stateCoordinates[targetState],
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
