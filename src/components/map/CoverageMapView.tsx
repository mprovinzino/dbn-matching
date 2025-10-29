import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { DmaCoverageData, StateLevelCoverageData, useInvestorsByState, useNationalCoverageCount } from "@/hooks/useMapCoverage";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoverageMapViewProps {
  coverage: DmaCoverageData[];
  stateLevelCoverage: StateLevelCoverageData[];
  searchQuery: string;
  onDmaClick: (dmaName: string) => void;
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
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  
  const { data: investorDetails } = useInvestorsByState(hoveredState);
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

    // Group by state and collect unique investor IDs
    const stateData = filteredCoverage.reduce((acc, dma) => {
      if (!acc[dma.state]) {
        acc[dma.state] = {
          investorIdSet: new Set<string>(),
          dmas: [],
        };
      }
      // Add all investor IDs from this DMA to the state's set
      dma.investor_ids.forEach(id => acc[dma.state].investorIdSet.add(id));
      acc[dma.state].dmas.push(dma);
      return acc;
    }, {} as Record<string, { investorIdSet: Set<string>; dmas: DmaCoverageData[] }>);

    // Convert Set size to totalInvestors count
    const stateDataWithCounts = Object.entries(stateData).reduce((acc, [state, data]) => {
      acc[state] = {
        totalInvestors: data.investorIdSet.size,
        dmas: data.dmas,
      };
      return acc;
    }, {} as Record<string, { totalInvestors: number; dmas: DmaCoverageData[] }>);

    // Build GeoJSON features for state aggregates and render via Mapbox layers (more accurate than DOM markers)
    stateDataRef.current = stateDataWithCounts;

    const includeNational = !searchQuery?.trim() && !highlightInvestorId;
    const nationalCount = includeNational ? (nationalCoverageData?.count || 0) : 0;

    // Features for states with DMA-specific coverage
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
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            state,
            totalInvestors: data.totalInvestors + (includeNational ? nationalCount : 0),
          },
        } as const;
      })
      .filter(Boolean) as any[];

    // Add features for states with ONLY national coverage (no DMA-specific investors)
    const allStateFeatures = includeNational
      ? Object.keys(stateCoordinates)
          .filter(state => !stateDataWithCounts[state]) // States not in DMA coverage
          .map(state => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: stateCoordinates[state] },
            properties: {
              state,
              totalInvestors: nationalCount, // Just the national investors
            },
          }))
      : [];

    const featureCollection = {
      type: 'FeatureCollection',
      features: [...dmaSpecificFeatures, ...allStateFeatures],
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

      // Interactions - hover to preview investors (on circles)
      mapInstance.on('mouseenter', circleLayerId, (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        if (state) {
          setHoveredState(state);
        }
      });
      
      mapInstance.on('mouseleave', circleLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
        setHoveredState(null);
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
      });

      // Interactions - hover to preview investors (on labels)
      mapInstance.on('mouseenter', labelLayerId, (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        if (state) {
          setHoveredState(state);
        }
      });
      
      mapInstance.on('mouseleave', labelLayerId, () => {
        mapInstance.getCanvas().style.cursor = '';
        setHoveredState(null);
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
      });
      // Click for detailed DMA breakdown (on circles)
      mapInstance.on('click', circleLayerId, async (e) => {
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        const coords = feature && (feature.geometry as any)?.coordinates as [number, number] | undefined;
        if (!state || !coords) return;

        // Show loading popup
        const loadingPopup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true, maxWidth: '350px' })
          .setLngLat(coords)
          .setHTML('<div style="padding: 12px;">Loading investor details...</div>')
          .addTo(mapInstance);

        try {
          // Fetch investor details for this state
          const { data: investorData, error: investorError } = await supabase
            .rpc('get_investors_by_state', { state_code: state });

          if (investorError) {
            console.error('Error fetching investor details:', investorError);
            loadingPopup.setHTML('<div style="padding: 12px; color: #ef4444;">Error loading investor details</div>');
            return;
          }

          if (!investorData || !Array.isArray(investorData)) {
            console.error('Invalid investor data received');
            loadingPopup.remove();
            return;
          }

          // Separate national and DMA-specific investors
          const national = investorData.filter((inv: any) => inv.market_type === 'full_coverage');
          const dmaSpecific = investorData.filter((inv: any) => inv.market_type !== 'full_coverage');

          // Group DMA-specific by DMA name
          const dmaGroups = dmaSpecific.reduce((acc: any, inv: any) => {
            // Get DMA name from the stateDataRef
            const stateData = stateDataRef.current[state];
            if (stateData) {
              stateData.dmas.forEach(dma => {
                if (dma.investor_ids.includes(inv.investor_id)) {
                  if (!acc[dma.dma]) acc[dma.dma] = [];
                  if (!acc[dma.dma].find((i: any) => i.investor_id === inv.investor_id)) {
                    acc[dma.dma].push(inv);
                  }
                }
              });
            }
            return acc;
          }, {});

          const totalCount = national.length + dmaSpecific.length;

          const html = `
            <div style="padding: 12px; max-width: 350px;">
              <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${state}</h3>
              <p style="font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">
                ${totalCount} total investor${totalCount !== 1 ? 's' : ''}
              </p>
              
              ${national.length > 0 ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-bottom: 6px;">
                    NATIONAL COVERAGE (${national.length}):
                  </div>
                  <div style="max-height: 120px; overflow-y: auto;">
                    ${national.map((inv: any) => `
                      <div style="font-size: 11px; padding: 3px 0; color: #374151;">
                        • ${inv.company_name}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${Object.keys(dmaGroups).length > 0 ? `
                <div>
                  <div style="font-size: 12px; font-weight: 600; color: #059669; margin-bottom: 6px;">
                    DMA-SPECIFIC COVERAGE:
                  </div>
                  <div style="max-height: 200px; overflow-y: auto;">
                    ${Object.entries(dmaGroups)
                      .sort(([, a]: any, [, b]: any) => b.length - a.length)
                      .map(([dma, investors]: any) => `
                        <div style="margin-bottom: 8px; padding: 6px; background: #f3f4f6; border-radius: 4px; cursor: pointer;"
                             onclick="window.dispatchEvent(new CustomEvent('dma-click', { detail: '${dma}' }))">
                          <strong style="font-size: 11px;">${dma}</strong>: ${investors.length} investor${investors.length !== 1 ? 's' : ''}
                          <div style="margin-top: 4px; padding-left: 8px;">
                            ${investors.map((inv: any) => `
                              <div style="font-size: 10px; color: #6b7280;">• ${inv.company_name}</div>
                            `).join('')}
                          </div>
                        </div>
                      `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${national.length === 0 && Object.keys(dmaGroups).length === 0 ? `
                <p style="font-size: 11px; color: #888;">
                  No investor coverage data available for this state.
                </p>
              ` : ''}
            </div>
          `;

          loadingPopup.setHTML(html);
        } catch (error) {
          console.error('Error fetching investor details:', error);
          loadingPopup.setHTML('<div style="padding: 12px; color: #ef4444;">Error loading investor details</div>');
        }
      });

      // Click for detailed DMA breakdown (on labels)
      mapInstance.on('click', labelLayerId, async (e) => {
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        const coords = feature && (feature.geometry as any)?.coordinates as [number, number] | undefined;
        if (!state || !coords) return;

        // Show loading popup
        const loadingPopup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true, maxWidth: '350px' })
          .setLngLat(coords)
          .setHTML('<div style="padding: 12px;">Loading investor details...</div>')
          .addTo(mapInstance);

        try {
          // Fetch investor details for this state
          const { data: investorData, error: investorError } = await supabase
            .rpc('get_investors_by_state', { state_code: state });

          if (investorError) {
            console.error('Error fetching investor details:', investorError);
            loadingPopup.setHTML('<div style="padding: 12px; color: #ef4444;">Error loading investor details</div>');
            return;
          }

          if (!investorData || !Array.isArray(investorData)) {
            console.error('Invalid investor data received');
            loadingPopup.remove();
            return;
          }

          // Separate national and DMA-specific investors
          const national = investorData.filter((inv: any) => inv.market_type === 'full_coverage');
          const dmaSpecific = investorData.filter((inv: any) => inv.market_type !== 'full_coverage');

          // Group DMA-specific by DMA name
          const dmaGroups = dmaSpecific.reduce((acc: any, inv: any) => {
            // Get DMA name from the stateDataRef
            const stateData = stateDataRef.current[state];
            if (stateData) {
              stateData.dmas.forEach(dma => {
                if (dma.investor_ids.includes(inv.investor_id)) {
                  if (!acc[dma.dma]) acc[dma.dma] = [];
                  if (!acc[dma.dma].find((i: any) => i.investor_id === inv.investor_id)) {
                    acc[dma.dma].push(inv);
                  }
                }
              });
            }
            return acc;
          }, {});

          const totalCount = national.length + dmaSpecific.length;

          const html = `
            <div style="padding: 12px; max-width: 350px;">
              <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${state}</h3>
              <p style="font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">
                ${totalCount} total investor${totalCount !== 1 ? 's' : ''}
              </p>
              
              ${national.length > 0 ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-bottom: 6px;">
                    NATIONAL COVERAGE (${national.length}):
                  </div>
                  <div style="max-height: 120px; overflow-y: auto;">
                    ${national.map((inv: any) => `
                      <div style="font-size: 11px; padding: 3px 0; color: #374151;">
                        • ${inv.company_name}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${Object.keys(dmaGroups).length > 0 ? `
                <div>
                  <div style="font-size: 12px; font-weight: 600; color: #059669; margin-bottom: 6px;">
                    DMA-SPECIFIC COVERAGE:
                  </div>
                  <div style="max-height: 200px; overflow-y: auto;">
                    ${Object.entries(dmaGroups)
                      .sort(([, a]: any, [, b]: any) => b.length - a.length)
                      .map(([dma, investors]: any) => `
                        <div style="margin-bottom: 8px; padding: 6px; background: #f3f4f6; border-radius: 4px; cursor: pointer;"
                             onclick="window.dispatchEvent(new CustomEvent('dma-click', { detail: '${dma}' }))">
                          <strong style="font-size: 11px;">${dma}</strong>: ${investors.length} investor${investors.length !== 1 ? 's' : ''}
                          <div style="margin-top: 4px; padding-left: 8px;">
                            ${investors.map((inv: any) => `
                              <div style="font-size: 10px; color: #6b7280;">• ${inv.company_name}</div>
                            `).join('')}
                          </div>
                        </div>
                      `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${national.length === 0 && Object.keys(dmaGroups).length === 0 ? `
                <p style="font-size: 11px; color: #888;">
                  No investor coverage data available for this state.
                </p>
              ` : ''}
            </div>
          `;

          loadingPopup.setHTML(html);
        } catch (error) {
          console.error('Error fetching investor details:', error);
          loadingPopup.setHTML('<div style="padding: 12px; color: #ef4444;">Error loading investor details</div>');
        }
      });
    } else {
      const source = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
      source.setData(featureCollection as any);
    }

    // Add state-level coverage markers (green circles for full state coverage)
    const stateInvestorCounts = stateLevelCoverage.reduce((acc, item) => {
      if (!acc[item.state]) {
        acc[item.state] = { count: 0, investors: [] };
      }
      acc[item.state].count++;
      acc[item.state].investors.push(item);
      return acc;
    }, {} as Record<string, { count: number; investors: StateLevelCoverageData[] }>);

    const stateLevelFeatures = Object.entries(stateInvestorCounts)
      .map(([state, data]) => {
        const coords = stateCoordinates[state];
        if (!coords) return null;
        
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            state,
            totalInvestors: data.count,
            isStateLevel: true,
          },
        };
      })
      .filter(Boolean);

    const stateLevelSourceId = 'state-level-coverage';
    const stateLevelCircleId = 'state-level-markers';
    const stateLevelLabelId = 'state-level-labels';

    if (!mapInstance.getSource(stateLevelSourceId)) {
      mapInstance.addSource(stateLevelSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: stateLevelFeatures as any,
        },
      });

      // Green circles for state-level coverage
      mapInstance.addLayer({
        id: stateLevelCircleId,
        type: 'circle',
        source: stateLevelSourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'totalInvestors'],
            1, 16,
            5, 24,
            10, 32,
          ],
          'circle-color': '#10b981', // Green
          'circle-opacity': 0.8,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Labels for state-level
      mapInstance.addLayer({
        id: stateLevelLabelId,
        type: 'symbol',
        source: stateLevelSourceId,
        layout: {
          'text-field': ['to-string', ['get', 'totalInvestors']],
          'text-size': 13,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Hover interactions for state-level markers
      mapInstance.on('mouseenter', stateLevelCircleId, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      
      mapInstance.on('mouseleave', stateLevelCircleId, () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      // Click to show state-level investor details
      mapInstance.on('click', stateLevelCircleId, (e) => {
        const feature = e.features?.[0];
        const state = feature && (feature.properties as any)?.state;
        const coords = feature && (feature.geometry as any)?.coordinates as [number, number] | undefined;
        if (!state || !coords) return;

        const stateInvestors = stateInvestorCounts[state]?.investors || [];
        
        const html = `
          <div style="padding: 12px; max-width: 350px;">
            <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${state}</h3>
            <div style="font-size: 11px; color: #10b981; font-weight: 600; margin-bottom: 8px;">
              STATE-LEVEL COVERAGE
            </div>
            <p style="font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">
              ${stateInvestors.length} investor${stateInvestors.length !== 1 ? 's' : ''} covering entire state
            </p>
            <div style="max-height: 200px; overflow-y: auto;">
              ${stateInvestors.map(inv => `
                <div style="font-size: 11px; padding: 4px 0; color: #374151; border-bottom: 1px solid #e5e7eb;">
                  <strong>${inv.investor_name}</strong>
                  <div style="font-size: 10px; color: #6b7280;">
                    ${inv.market_type} • Tier ${inv.tier}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: true, maxWidth: '350px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(mapInstance);
      });
    } else {
      const source = mapInstance.getSource(stateLevelSourceId) as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: stateLevelFeatures as any,
      });
    }


    // Handle DMA click from popup
    const handleDmaClick = (e: any) => {
      onDmaClick(e.detail);
    };
    window.addEventListener('dma-click', handleDmaClick);

    return () => {
      window.removeEventListener('dma-click', handleDmaClick);
    };
  }, [coverage, mapLoaded, onDmaClick, nationalCoverageData, searchQuery, stateLevelCoverage]);

  // Effect to show hover tooltip with investor details
  useEffect(() => {
    if (!map.current || !hoveredState || !investorDetails) return;

    const stateData = stateDataRef.current[hoveredState];

    const coordinates = stateCoordinates[hoveredState];
    if (!coordinates) return;

    // Remove previous hover popup
    if (hoverPopupRef.current) {
      hoverPopupRef.current.remove();
    }

    const { national, dmaSpecific } = investorDetails;
    const totalCount = national.length + dmaSpecific.length;

    const formatInvestor = (inv: any) => `
      <div style="padding: 2px 0; font-size: 11px;">
        • ${inv.company_name} <span style="color: #666;">(${inv.market_type === 'full_coverage' ? 'National' : inv.market_type})</span>
      </div>
    `;

    const html = `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="font-weight: bold; margin-bottom: 4px;">${hoveredState}</h3>
        <p style="font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">
          Total: ${totalCount} investor${totalCount !== 1 ? 's' : ''}
        </p>
        
        ${national.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-bottom: 4px;">
              National Coverage (${national.length}):
            </div>
            ${national.map(formatInvestor).join('')}
          </div>
        ` : ''}
        
        ${dmaSpecific.length > 0 ? `
          <div>
            <div style="font-size: 12px; font-weight: 600; color: #059669; margin-bottom: 4px;">
              DMA-Specific (${dmaSpecific.length}):
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
              ${dmaSpecific.map(formatInvestor).join('')}
            </div>
          </div>
        ` : ''}
        
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #666;">
                ${dmaSpecific.length > 0 ? 'Click for DMA breakdown' : 'Click for more details'}
              </div>
      </div>
    `;

    hoverPopupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "350px",
      className: "hover-popup",
    })
      .setLngLat(coordinates)
      .setHTML(html)
      .addTo(map.current);

  }, [hoveredState, investorDetails]);

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
