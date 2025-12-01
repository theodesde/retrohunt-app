import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapPin, Gamepad2, Search, Plus, X, ExternalLink, Menu, Tag, Instagram, Loader2, Crown, ChevronUp, ChevronDown, Globe, Minus } from 'lucide-react';
import emailjs from '@emailjs/browser';
import Papa from 'papaparse';

// ==================================================================================
// ⚙️ CONFIGURATION & CONSTANTES
// ==================================================================================
const CONFIG = {
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS79h5TvhI7uVi0bKlipooX7h3AH4K5UwORpz6uyHZ8EW298KnZtpuQMNcHITUHm5zKs1X0JRXkCLSb/pub?gid=1712668653&single=true&output=csv",
  DEFAULT_COUNTRY: { 
    code: 'FR',
    center: [46.603354, 1.888334], 
    zoom: 6, 
    label: 'France',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/fr.svg'
  },
  EMAILJS: {
    SERVICE_ID: 'service_arqmija',
    TEMPLATE_ID: 'template_sdd0pom',
    PUBLIC_KEY: 'XeofrijQDBJpyYeWi'
  },
  COLORS: {
    PINK: '#ff5ac6',
    YELLOW: '#facc15',
    CYAN: '#72fffb',
    BG_DARK: '#11111b',
    BG_PANEL: '#1e1e2e'
  }
};

const AVAILABLE_TAGS = [
  "Rétrogaming", "Next Gen", "Import Japon", "Arcade", "Figurines", "Réparations", "Goodies"
];

// Fonction de sécurité standard
const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  const map = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": "'"
  };
  return unsafe.replace(/[&<>"']/g, (m) => map[m]);
};

// ==================================================================================

export default function App() {
  // États
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const [newShopForm, setNewShopForm] = useState({ 
    name: '', city: '', address: '', tags: [], note: '' 
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  
  // Refs pour la gestion du Swipe fluide
  const drawerRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);

  // --- 1. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    Papa.parse(CONFIG.SHEET_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!isMounted) return;

        const cleanedShops = results.data
          .filter(row => row.name && row.Latitude && row.Longitude && row.isPublished?.toLowerCase() === 'true') 
          .map((row, index) => ({
            id: index + 1,
            name: row.name,
            city: row.city,
            address: row.address,
            country: row.country ? row.country.toUpperCase() : 'FR', 
            lat: parseFloat(row.Latitude.toString().replace(',', '.')), 
            lng: parseFloat(row.Longitude.toString().replace(',', '.')),
            specialty: row.specialty,
            tags: row.tags ? row.tags.split(',').map(tag => tag.trim()).filter(t => t !== "") : [],
            description: row.description,
            verified: row.verified?.toLowerCase() === 'true',
            hallOfFame: row.hallOfFame?.toLowerCase() === 'true'
          }));

        setShops(cleanedShops);
        setIsLoading(false);
      },
      error: (error) => {
        console.error("Erreur loading Sheet:", error);
        if (isMounted) {
          setIsLoading(false);
          alert("Erreur de connexion à la base de données.");
        }
      }
    });

    return () => { isMounted = false; };
  }, []);

  // --- 2. GESTION DE LA CARTE ---
  
  const flyToShopWithOffset = useCallback((shop) => {
    if (!mapInstanceRef.current || !shop.lat || !shop.lng) return;

    const map = mapInstanceRef.current;
    const targetZoom = 15; 

    if (window.innerWidth < 768) {
        const point = map.project([shop.lat, shop.lng], targetZoom);
        // Offset réduit car le tiroir est plus bas
        point.y = point.y + 50; 
        const targetLatLng = map.unproject(point, targetZoom);
        
        map.flyTo(targetLatLng, targetZoom, { duration: 1.5 });
    } else {
        map.flyTo([shop.lat, shop.lng], targetZoom, { duration: 1.5 });
    }

    const marker = markersRef.current[shop.id];
    if (marker) marker.openPopup();

  }, []);

  const flyToShop = useCallback((shop) => {
    if (selectedShop && selectedShop.id === shop.id) {
        setSelectedShop(null);
    } else {
        setSelectedShop(shop);
        if (window.innerWidth < 768) {
            setIsDrawerExpanded(false);
        }
        flyToShopWithOffset(shop);
    }
  }, [selectedShop, flyToShopWithOffset]);

  const resetMapToDefault = useCallback(() => {
    if (mapInstanceRef.current) {
        setSelectedShop(null);
        mapInstanceRef.current.flyTo(CONFIG.DEFAULT_COUNTRY.center, CONFIG.DEFAULT_COUNTRY.zoom, { duration: 1.5 });
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
        mapInstanceRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
        mapInstanceRef.current.zoomOut();
    }
  }, []);

  const updateMarkers = useCallback((map) => {
    if (!window.L) return;

    const retroIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${CONFIG.COLORS.PINK}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px ${CONFIG.COLORS.PINK}, 0 0 20px ${CONFIG.COLORS.PINK};"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const yellowIcon = window.L.divIcon({
      className: 'custom-div-icon-selected',
      html: `<div style="background-color: ${CONFIG.COLORS.YELLOW}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 15px ${CONFIG.COLORS.YELLOW}, 0 0 30px ${CONFIG.COLORS.YELLOW}; transform: scale(1.2);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    Object.values(markersRef.current).forEach(marker => map.removeLayer(marker));
    markersRef.current = {};

    shops.forEach(shop => {
      if (shop.lat && shop.lng && !isNaN(shop.lat) && !isNaN(shop.lng)) {
        const safeName = escapeHtml(shop.name);
        const safeCity = escapeHtml(shop.city);
        
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; color: #111;">
              <strong style="font-family: 'Courier New', monospace; text-transform: uppercase;">${safeName}</strong>
              ${shop.hallOfFame ? `<span style="background-color: ${CONFIG.COLORS.YELLOW}; color: black; font-size: 9px; padding: 1px 4px; margin-left: 6px; border-radius: 2px; font-weight: bold;">👑 HALL OF FAME</span>` : ''}
              <br/>
              ${safeCity}
            </div>
          `;

        const isSelected = selectedShop?.id === shop.id;

        const marker = window.L.marker([shop.lat, shop.lng], { 
            icon: isSelected ? yellowIcon : retroIcon,
            zIndexOffset: isSelected ? 1000 : 0 
        })
          .addTo(map)
          .bindPopup(popupContent);
        
        if (isSelected) {
            setTimeout(() => marker.openPopup(), 100);
        }
        
        marker.on('click', () => {
          flyToShop(shop); 
        });

        markersRef.current[shop.id] = marker;
      }
    });
  }, [shops, flyToShop, selectedShop]);

  const initMap = useCallback(() => {
    if (!window.L || mapInstanceRef.current) return;
    
    const map = window.L.map(mapRef.current, {
        zoomControl: false
    }).setView(CONFIG.DEFAULT_COUNTRY.center, CONFIG.DEFAULT_COUNTRY.zoom);
    
    mapInstanceRef.current = map;

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      updateWhenZooming: false 
    }).addTo(map);

    updateMarkers(map);
  }, [updateMarkers]);

  // Initialisation Leaflet
  useEffect(() => {
    if (window.L) {
      initMap();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = initMap;
    document.body.appendChild(script);

    return () => {
        if(mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, [initMap]);

  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
        updateMarkers(mapInstanceRef.current);
    }
  }, [shops, updateMarkers]);

  useEffect(() => {
    let timeoutId;
    if (mapInstanceRef.current) {
      timeoutId = setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 350);
    }
    return () => clearTimeout(timeoutId);
  }, [isSidebarOpen, isDrawerExpanded]);

  useEffect(() => {
    let timeoutId;
    if (!mapInstanceRef.current || isLoading || shops.length === 0 || !window.L) return;
    
    if (!selectedShop) {
        mapInstanceRef.current.setView(CONFIG.DEFAULT_COUNTRY.center, CONFIG.DEFAULT_COUNTRY.zoom);
    }
    return () => clearTimeout(timeoutId);
  }, [isLoading]);


  // --- 3. LOGIQUE MÉTIER ---

  const filteredShops = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return shops.filter(shop => 
      shop.name.toLowerCase().includes(term) ||
      shop.city.toLowerCase().includes(term) ||
      (shop.tags && shop.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }, [shops, searchTerm]);

  const toggleTag = (tag) => {
    setNewShopForm(prev => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tag) };
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const handleSuggestSubmit = (e) => {
    e.preventDefault();
    setSubmitStatus('loading');

    const templateParams = {
      name: newShopForm.name,
      city: newShopForm.city,
      address: newShopForm.address,
      tags: newShopForm.tags.join(', '),
      note: newShopForm.note,
      country: CONFIG.DEFAULT_COUNTRY.code 
    };

    emailjs.send(CONFIG.EMAILJS.SERVICE_ID, CONFIG.EMAILJS.TEMPLATE_ID, templateParams, CONFIG.EMAILJS.PUBLIC_KEY)
      .then(() => {
         setSubmitStatus('success');
         setTimeout(() => {
           setSubmitStatus(null);
           setIsModalOpen(false);
           setNewShopForm({ name: '', city: '', address: '', tags: [], note: '' });
         }, 2500);
      }, (error) => {
         console.error('ÉCHEC...', error);
         setSubmitStatus('error');
         alert("Erreur lors de l'envoi.");
         setSubmitStatus(null);
      });
  };

  const searchByTag = (e, tag) => {
    e?.stopPropagation();
    setSearchTerm(prev => prev === tag ? "" : tag);
  };

  // --- GESTION DU SWIPE FLUIDE ---
  const handleTouchStart = (e) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    
    if (drawerRef.current) {
        drawerRef.current.style.transition = 'none';
        dragStartHeight.current = drawerRef.current.getBoundingClientRect().height;
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !drawerRef.current) return;

    const currentY = e.touches[0].clientY;
    const deltaY = dragStartY.current - currentY;
    const newHeight = dragStartHeight.current + deltaY;
    
    const maxHeight = window.innerHeight * 0.85;
    // MODIF : Hauteur minimale passée à 60px
    if (newHeight >= 60 && newHeight <= maxHeight) {
        drawerRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging.current || !drawerRef.current) return;
    isDragging.current = false;

    drawerRef.current.style.transition = 'height 0.3s ease-out';

    const threshold = 50; 
    const deltaY = dragStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) { 
            setIsDrawerExpanded(true);
            drawerRef.current.style.height = '85%';
        } else {
            setIsDrawerExpanded(false);
            drawerRef.current.style.height = '60px'; // MODIF : 60px
        }
    } else {
        if (isDrawerExpanded) {
             drawerRef.current.style.height = '85%';
        } else {
             drawerRef.current.style.height = '60px'; // MODIF : 60px
        }
    }
  };

  const toggleDrawer = () => {
    if (!isDrawerExpanded) {
        setSelectedShop(null);
    }
    setIsDrawerExpanded(!isDrawerExpanded);
  };

  // --- 5. RENDU ---

  return (
    <div className="flex flex-col h-screen text-gray-100 font-sans overflow-hidden relative" style={{ backgroundColor: CONFIG.COLORS.BG_DARK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Press+Start+2P&display=swap');
        .font-pixel { font-family: 'Press Start 2P', cursive; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${CONFIG.COLORS.PINK}; }
        .scanlines {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 50; opacity: 0.3;
        }
        .shop-name-color { color: ${CONFIG.COLORS.CYAN}; }
        .leaflet-container { background-color: #1D1D1D !important; }
        #map { filter: grayscale(20%) contrast(1.1); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .cursor-wait { cursor: wait; }
        
        .custom-map-controls {
            position: absolute;
            bottom: 24px;
            right: 12px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        .reset-view-btn {
            width: 40px;
            height: 40px;
            background-color: white;
            color: #666666;
            border: none;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
        }
        .reset-view-btn:hover {
            background-color: #f3f3f3;
            color: #333333;
        }

        .zoom-buttons {
            display: flex;
            flex-direction: column;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        
        .zoom-btn {
            width: 40px;
            height: 40px;
            background-color: white;
            color: #666666;
            border: none;
            border-bottom: 1px solid #e6e6e6;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        .zoom-btn:last-child {
            border-bottom: none;
        }
        .zoom-btn:hover { background-color: #f3f3f3; color: #333333; }

        @media (max-width: 768px) {
            .custom-map-controls {
                bottom: 80px !important; /* MODIF : Ajusté pour être juste au-dessus du tiroir réduit */
                right: 10px;
            }
        }
      `}</style>

      {/* --- HEADER (Fixe) --- */}
      <header className="h-16 flex items-center justify-between px-4 z-30 shrink-0 relative"
              style={{ 
                backgroundColor: CONFIG.COLORS.BG_DARK,
                borderBottom: `4px solid ${CONFIG.COLORS.PINK}`,
                boxShadow: `0 0 15px ${CONFIG.COLORS.PINK}`
              }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:block transition-colors hover:text-white"
            style={{ color: CONFIG.COLORS.PINK }}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="text-2xl animate-bounce">🕹️</div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
               <h1 className="font-pixel text-[10px] md:text-xs text-white tracking-widest text-shadow-sm uppercase">
                 RetroHunt
               </h1>
               <span className="inline-block text-[9px] text-black px-1 font-bold font-pixel shadow-[2px_2px_0_rgba(0,0,0,0.5)] self-start mt-1" style={{ backgroundColor: CONFIG.COLORS.YELLOW }}>BETA</span>
            </div>

            <a href="https://www.instagram.com/videogamesplace/" target="_blank" rel="noreferrer" 
               className="flex items-center gap-1 text-[8px] font-sans font-bold mt-1 hover:text-white transition-colors"
               style={{ color: CONFIG.COLORS.PINK }}>
              <Instagram size={10} /> by Videogamesplace
            </a>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-transparent border-2 hover:text-black transition-all px-3 py-2 font-pixel text-[8px] md:text-[10px] flex items-center gap-2"
          style={{ 
            borderColor: CONFIG.COLORS.YELLOW, 
            color: CONFIG.COLORS.YELLOW,
            boxShadow: `0 0 15px ${CONFIG.COLORS.YELLOW}`
          }}
          onMouseEnter={(e) => {
             e.currentTarget.style.backgroundColor = CONFIG.COLORS.YELLOW;
             e.currentTarget.style.color = 'black';
          }}
          onMouseLeave={(e) => {
             e.currentTarget.style.backgroundColor = 'transparent';
             e.currentTarget.style.color = CONFIG.COLORS.YELLOW;
          }}
        >
          <Plus size={14} /> 
          <span className="hidden sm:inline">Ajout shop</span>
          <span className="sm:hidden">Ajout</span>
        </button>
      </header>

      {/* --- CONTENEUR PRINCIPAL --- */}
      <div className="flex-1 relative overflow-hidden flex md:flex-row">
        
        {/* --- MOBILE UI OVERLAY (Recherche + Drawer) --- */}
        <div className="md:hidden absolute inset-0 z-[2000] pointer-events-none flex flex-col justify-between">
            
            {/* 1. BARRE DE RECHERCHE FLOTTANTE */}
            <div className="p-4 pointer-events-auto mt-2">
                <div className="relative shadow-lg rounded-full overflow-hidden">
                  <Search className="absolute left-4 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder={`Rechercher ici ${CONFIG.DEFAULT_COUNTRY.label}...`} 
                    className="w-full border-0 pl-12 pr-12 py-3 text-sm text-white focus:outline-none focus:ring-0 rounded-full"
                    style={{ 
                        backgroundColor: 'rgba(24, 24, 37, 0.95)',
                    }}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                    }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-3 text-gray-500 hover:text-white">
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                {/* Tags de filtre */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2 hide-scrollbar px-1">
                    {AVAILABLE_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={(e) => searchByTag(e, tag)}
                            className="px-3 py-1.5 text-[10px] rounded-full border transition-all font-medium font-pixel whitespace-nowrap shadow-sm"
                            style={{
                                backgroundColor: searchTerm === tag ? CONFIG.COLORS.PINK : 'rgba(30, 30, 46, 0.9)',
                                color: searchTerm === tag ? 'white' : '#9ca3af',
                                borderColor: searchTerm === tag ? CONFIG.COLORS.PINK : 'transparent',
                            }}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. TIROIR (DRAWER) EN BAS AVEC SWIPE */}
            <div 
                ref={drawerRef}
                className={`pointer-events-auto bg-[#181825]/95 backdrop-blur-md border-t border-gray-700 rounded-t-3xl transition-all duration-300 ease-in-out flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)]`}
                style={{ 
                    height: isDrawerExpanded ? '85%' : '60px', // MODIF : 60px
                    touchAction: 'none',
                    zIndex: 2000
                }}
            >
                {/* Poignée du tiroir (Zone de swipe) */}
                <div 
                    className="w-full flex justify-center items-center p-2 cursor-pointer hover:bg-white/5 rounded-t-3xl pt-3 select-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={toggleDrawer}
                >
                    <div className="w-10 h-1 bg-gray-500 rounded-full mb-1"></div>
                </div>
                <div 
                    className="text-center text-[10px] text-gray-500 font-pixel mb-3 uppercase tracking-wider select-none flex items-center justify-center gap-2" 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={toggleDrawer}
                >
                    {/* Chevron animé */}
                    {!isDrawerExpanded ? <ChevronUp size={14} className="animate-bounce text-[#facc15]" /> : <ChevronDown size={14} />}
                    {isDrawerExpanded ? 'Réduire' : `${filteredShops.length} boutiques référencées`}
                </div>

                {/* BLOC D'APPEL À L'ACTION TOUJOURS VISIBLE EN HAUT DU CONTENU */}
                <div className="px-4 pb-2 select-none pointer-events-auto">
                     <div className="text-center p-3 bg-[#1e1e2e]/80 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                        <p className="text-[10px] text-gray-400 mb-1">
                            Tu connais une adresse qui manque ?
                        </p>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="text-[10px] font-pixel font-bold text-[#facc15] hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                            <Plus size={10} /> AJOUTER UN SHOP
                        </button>
                     </div>
                </div>

                {/* Contenu du tiroir */}
                <div className={`flex-1 overflow-y-auto p-4 pt-0 space-y-3 pb-8 ${!isDrawerExpanded ? 'hidden' : ''}`}>
                    {filteredShops.map(shop => (
                        <div 
                            key={shop.id}
                            onClick={() => flyToShop(shop)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedShop?.id === shop.id ? '' : 'bg-[#1e1e2e] border-gray-700'}`}
                            style={selectedShop?.id === shop.id ? {
                                backgroundColor: `${CONFIG.COLORS.PINK}20`,
                                borderColor: CONFIG.COLORS.PINK,
                                boxShadow: `inset 0 0 10px ${CONFIG.COLORS.PINK}33`
                            } : {}}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-sm uppercase tracking-wide shop-name-color">{shop.name}</h3>
                              {shop.hallOfFame && (
                                <span className="text-black text-[8px] px-1.5 py-0.5 font-pixel flex items-center gap-1 rounded-sm" style={{ backgroundColor: CONFIG.COLORS.YELLOW }}>
                                  <Crown size={8} />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                              <MapPin size={12} /> {shop.city}
                            </div>
                        </div>
                    ))}
                     {filteredShops.length === 0 && (
                        <div className="text-center p-4 text-gray-500 text-sm">
                            Aucune boutique trouvée...
                        </div>
                    )}
                </div>
            </div>
        </div>


        {/* --- DESKTOP SIDEBAR --- */}
        <div className={`
          hidden md:flex z-10 bg-[#181825]/95 backdrop-blur-md 
          border-r border-gray-800 
          flex-col transition-all duration-300 ease-in-out overflow-hidden
          h-full
          ${isSidebarOpen ? 'w-80' : 'w-0'}
        `}>
          <div className="p-4 border-b border-gray-700 flex flex-col gap-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder={`Rechercher...`} 
                className="w-full bg-[#11111b] border border-gray-600 rounded p-2 pl-10 text-sm text-white focus:outline-none"
                style={{ borderColor: '#4b5563' }}
                onFocus={(e) => e.target.style.borderColor = CONFIG.COLORS.PINK}
                onBlur={(e) => e.target.style.borderColor = '#4b5563'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={(e) => searchByTag(e, tag)}
                        className={`px-2 py-1 text-[8px] rounded-full border transition-all font-medium font-pixel`}
                        style={{
                            backgroundColor: searchTerm === tag ? CONFIG.COLORS.PINK : '#1e1e2e',
                            color: searchTerm === tag ? 'white' : '#9ca3af',
                            borderColor: searchTerm === tag ? CONFIG.COLORS.PINK : '#4b5563',
                        }}
                    >
                        {tag}
                    </button>
                ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {filteredShops.map(shop => (
                  <div 
                    key={shop.id}
                    onClick={() => flyToShop(shop)}
                    className={`
                      p-3 rounded border cursor-pointer transition-all hover:translate-x-1
                      ${selectedShop?.id === shop.id ? '' : 'bg-[#1e1e2e] border-gray-700 hover:border-gray-500'}
                    `}
                    style={selectedShop?.id === shop.id ? {
                        backgroundColor: `${CONFIG.COLORS.PINK}20`,
                        borderColor: CONFIG.COLORS.PINK,
                        boxShadow: `inset 0 0 10px ${CONFIG.COLORS.PINK}33`
                    } : {}}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm uppercase tracking-wide shop-name-color">{shop.name}</h3>
                      {shop.hallOfFame && (
                        <span className="text-black text-[8px] px-1.5 py-0.5 font-pixel flex items-center gap-1" style={{ backgroundColor: CONFIG.COLORS.YELLOW }}>
                          <Crown size={8} /> HALL OF FAME
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                      <MapPin size={12} /> {shop.city}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shop.tags && shop.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx} 
                          onClick={(e) => searchByTag(e, tag)}
                          className="text-[9px] bg-[#111] border border-gray-700 px-1 rounded transition-colors cursor-pointer"
                          style={{ 
                              borderColor: searchTerm === tag ? CONFIG.COLORS.PINK : '#374151',
                              color: searchTerm === tag ? CONFIG.COLORS.PINK : '#9ca3af'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
          </div>
           <div className="p-3 text-[10px] text-gray-500 text-center border-t border-gray-800 font-pixel shrink-0">
                {filteredShops.length} BOUTIQUES
            </div>
        </div>


        {/* --- MAP CONTAINER --- */}
        <div className="flex-1 relative bg-[#0f0f15] h-full overflow-hidden">
          <div id="map" ref={mapRef} className="w-full h-full z-0 grayscale-[20%] contrast-[1.1]" />
          
          {/* CONTROLES GOOGLE MAPS STYLE (Masqués si modal ouverte) */}
          {(!isModalOpen && !(isDrawerExpanded && window.innerWidth < 768)) && (
              <div className="custom-map-controls pointer-events-auto">
                 <button 
                    className="reset-view-btn"
                    onClick={resetMapToDefault}
                    title="Vue globale"
                 >
                    <Globe size={20} />
                 </button>
                 
                 <div className="zoom-buttons">
                     <button 
                        className="zoom-btn"
                        onClick={handleZoomIn}
                        title="Zoom avant"
                     >
                        <Plus size={20} />
                     </button>
                     
                     <button 
                        className="zoom-btn"
                        onClick={handleZoomOut}
                        title="Zoom arrière"
                     >
                        <Minus size={20} />
                     </button>
                 </div>
              </div>
          )}

          {/* --- INFO PANEL (Tuile) --- */}
          {/* Affiché seulement si sélectionné ET tiroir réduit */}
          {selectedShop && !isDrawerExpanded && (
            <div className="absolute 
                        /* MODIF : Remonté à 80px pour matcher le tiroir réduit */
                        bottom-[80px] left-4 right-[66px] 
                        md:left-auto md:right-16 md:bottom-4 md:w-96 
                        bg-[#11111b]/95 backdrop-blur border-t-4 md:border-2 rounded-lg p-3 md:p-5 z-[401] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300"
                 style={{ borderColor: CONFIG.COLORS.PINK }}>
               <button 
                onClick={() => {setSelectedShop(null); if(mapInstanceRef.current) mapInstanceRef.current.flyTo(CONFIG.DEFAULT_COUNTRY.center, CONFIG.DEFAULT_COUNTRY.zoom, { duration: 1.5 });}}
                className="absolute top-2 right-2 text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
              
              <div className="flex flex-wrap items-center gap-3 mb-3 pr-6">
                <div className="flex items-center gap-2">
                  <Gamepad2 style={{ color: CONFIG.COLORS.CYAN }} size={20} />
                  <h2 className="font-pixel text-xs uppercase leading-relaxed" style={{ color: CONFIG.COLORS.CYAN }}>{selectedShop.name}</h2>
                </div>
                {selectedShop.hallOfFame && (
                    <span className="text-black text-[9px] px-2 py-1 font-pixel flex items-center gap-1 shadow-[2px_2px_0_rgba(0,0,0,0.5)] animate-pulse" style={{ backgroundColor: CONFIG.COLORS.YELLOW }}>
                      <Crown size={10} /> HALL OF FAME
                    </span>
                )}
              </div>
              
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {selectedShop.description}
              </p>
              
              <div className="space-y-2 text-xs text-gray-400 bg-black/30 p-3 rounded border border-gray-800">
                <div className="flex gap-2">
                  <span className="text-gray-500 min-w-[60px]">Adresse:</span>
                  <span className="text-gray-200 select-all">{selectedShop.address}</span>
                </div>
              </div>

              <a 
                href={`http://maps.google.com/?q=${encodeURIComponent(selectedShop.name + ' ' + selectedShop.address)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full text-center py-3 border font-pixel text-[10px] hover:text-black transition-all uppercase"
                style={{ 
                  color: CONFIG.COLORS.CYAN, 
                  borderColor: CONFIG.COLORS.CYAN,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = CONFIG.COLORS.CYAN; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Y aller (GPS) <ExternalLink size={10} className="inline ml-1 mb-0.5"/>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE PROPOSITION --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-[#181825] border-2 w-full max-w-lg p-6 relative shadow-[0_0_30px_rgba(250,204,21,0.2)] my-8`} style={{ borderColor: CONFIG.COLORS.YELLOW }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              className={`absolute top-3 right-3 text-gray-500 hover:text-[${CONFIG.COLORS.YELLOW}]`}
            >
              <X size={24} />
            </button>

            <h2 className={`font-pixel text-[${CONFIG.COLORS.YELLOW}] text-xs mb-6 text-center border-b border-gray-700 pb-4`} style={{ color: CONFIG.COLORS.YELLOW }}>
              Let's go hunt !
            </h2>

            {submitStatus === 'success' ? (
              <div className="text-center py-8 animate-in fade-in zoom-in">
                <div className="text-4xl mb-4">📨</div>
                <p className="font-pixel text-[10px] text-green-400 leading-6 uppercase">
                  Transmission réussie !<br/>
                  Le QG analyse ta proposition.<br/>
                  Merci chasseur.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-4">
                <p className="text-xs text-gray-400 mb-4 italic text-center">
                  Aide-nous à cartographier les meilleures adresses. N'oublie pas de préciser le pays !
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Nom de la boutique*</label>
                    <input 
                      required
                      type="text" 
                      className={`w-full bg-black border border-gray-700 text-white p-3 outline-none transition-colors text-sm`}
                      style={{ borderColor: '#374151' }}
                      onFocus={(e) => e.target.style.borderColor = CONFIG.COLORS.YELLOW}
                      onBlur={(e) => e.target.style.borderColor = '#374151'}
                      placeholder="Ex: Super Potato"
                      value={newShopForm.name}
                      onChange={e => setNewShopForm({...newShopForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Ville et Pays*</label>
                    <input 
                      required
                      type="text" 
                      className={`w-full bg-black border border-gray-700 text-white p-3 outline-none transition-colors text-sm`}
                      style={{ borderColor: '#374151' }}
                      onFocus={(e) => e.target.style.borderColor = CONFIG.COLORS.YELLOW}
                      onBlur={(e) => e.target.style.borderColor = '#374151'}
                      placeholder="Ex: Tokyo, Japon"
                      value={newShopForm.city}
                      onChange={e => setNewShopForm({...newShopForm, city: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Adresse précise*</label>
                  <input 
                    required
                    type="text" 
                    className={`w-full bg-black border border-gray-700 text-white p-3 outline-none transition-colors text-sm`}
                    style={{ borderColor: '#374151' }}
                    onFocus={(e) => e.target.style.borderColor = CONFIG.COLORS.YELLOW}
                    onBlur={(e) => e.target.style.borderColor = '#374151'}
                    placeholder="Ex: 1 Chome-11-2 Sotokanda, Chiyoda City"
                    value={newShopForm.address}
                    onChange={e => setNewShopForm({...newShopForm, address: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-2 font-bold flex items-center gap-2">
                    <Tag size={12} /> Catégories (Tags)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-black/40 border border-gray-800 rounded">
                    {AVAILABLE_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="text-[10px] px-2 py-1 rounded border transition-all font-medium"
                        style={{ 
                            backgroundColor: newShopForm.tags.includes(tag) ? CONFIG.COLORS.YELLOW : '#181825',
                            color: newShopForm.tags.includes(tag) ? 'black' : '#9ca3af',
                            borderColor: newShopForm.tags.includes(tag) ? CONFIG.COLORS.YELLOW : '#4b5563',
                            boxShadow: newShopForm.tags.includes(tag) ? `0 0 10px ${CONFIG.COLORS.YELLOW}4D` : 'none'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1 text-right">
                    {newShopForm.tags.length} sélectionné(s)
                  </p>
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Infos complémentaires</label>
                  <textarea 
                    className={`w-full bg-black border border-gray-700 text-white p-3 outline-none transition-colors h-20 resize-none text-sm`}
                    style={{ borderColor: '#374151' }}
                    onFocus={(e) => e.target.style.borderColor = CONFIG.COLORS.YELLOW}
                    onBlur={(e) => e.target.style.borderColor = '#374151'}
                    placeholder="Pourquoi cette boutique est top ? Horaires spécifiques ? Anecdote ?"
                    value={newShopForm.note}
                    onChange={e => setNewShopForm({...newShopForm, note: e.target.value})}
                  ></textarea>
                </div>

                <button 
                  disabled={submitStatus === 'loading'}
                  type="submit" 
                  className={`w-full text-black font-pixel text-[10px] py-4 transition-colors uppercase disabled:opacity-50 disabled:cursor-wait shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1 ${submitStatus === 'loading' ? 'cursor-wait' : ''}`}
                  style={{ backgroundColor: CONFIG.COLORS.YELLOW }}
                >
                  {submitStatus === 'loading' ? 'ENVOI EN COURS...' : 'ENVOYER LA PROPOSITION'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="scanlines pointer-events-none"></div>
    </div>
  );
}