import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Gamepad2, Search, Plus, X, ExternalLink, Menu, Tag, Instagram, Mail, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
// IMPORT DU PARSEUR CSV
import Papa from 'papaparse';

// ==================================================================================
// ⚙️ CONFIGURATION GOOGLE SHEET
// ==================================================================================
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS79h5TvhI7uVi0bKlipooX7h3AH4K5UwORpz6uyHZ8EW298KnZtpuQMNcHITUHm5zKs1X0JRXkCLSb/pub?gid=1712668653&single=true&output=csv";


// On démarre avec une liste vide, elle sera remplie par le Sheet.
const INITIAL_SHOPS = [];

// 🛠️ ZONE ADMIN : LISTE DES TAGS (Reste utile pour le filtre et le formulaire)
const AVAILABLE_TAGS = [
  "Rétrogaming",
  "Next Gen",
  "Import Japon",
  "Arcade",
  "Figurines",
  "Réparations",
  "Goodies"
];

// ==================================================================================

export default function App() {
  // On initialise les shops avec une liste vide
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Nouvel état pour gérer le chargement
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newShopForm, setNewShopForm] = useState({ 
    name: '', city: '', address: '', tags: [], note: '' 
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // COULEURS
  const BRAND_PINK = '#ff5ac6';   
  const BRAND_YELLOW = '#facc15'; 
  const SHOP_NAME_COLOR = '#72fffb'; 

  // --- NOUVEAU : CHARGEMENT DES DONNÉES GOOGLE SHEET ---
  useEffect(() => {
    setIsLoading(true); // On commence le chargement
    
    Papa.parse(GOOGLE_SHEET_CSV_URL, {
      download: true,
      header: true, // Dit à PapaParse d'utiliser la première ligne comme clés (name, city...)
      skipEmptyLines: true, // Ignore les lignes vides du tableau
      complete: (results) => {
        console.log("Données brutes reçues de Google Sheet:", results.data);

        // On nettoie et transforme les données pour qu'elles soient utilisables
        const cleanedShops = results.data
          // --- MODIFIÉ ICI : On vérifie les nouveaux noms de colonnes ---
          .filter(row => row.name && row.Latitude && row.Longitude) 
          .map((row, index) => ({
            id: index + 1, // On crée un ID numérique à la volée
            name: row.name,
            city: row.city,
            address: row.address,
            // --- MODIFIÉ ICI : On lit 'Latitude' et 'Longitude' du Sheet ---
            // IMPORTANT : On convertit en nombre décimal (gère points et virgules)
            // On garde les clés internes 'lat' et 'lng' en minuscules pour que le reste de l'app fonctionne
            lat: parseFloat(row.Latitude.toString().replace(',', '.')), 
            lng: parseFloat(row.Longitude.toString().replace(',', '.')),
            specialty: row.specialty,
            // IMPORTANT : Transformer la chaîne "Tag1, Tag2" en tableau ["Tag1", "Tag2"]
            tags: row.tags ? row.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== "") : [],
            description: row.description,
            verified: row.verified && row.verified.toLowerCase() === 'true' // Convertit le texte "true" en vrai booléen
          }));

        console.log("Données nettoyées:", cleanedShops);
        setShops(cleanedShops); // On met à jour l'application avec les vraies données
        setIsLoading(false); // Le chargement est fini
      },
      error: (error) => {
        console.error("Erreur lors du chargement du Sheet:", error);
        setIsLoading(false);
        alert("Erreur de connexion à la base de données Google Sheet. Vérifiez le lien.");
      }
    });
  }, []); // Le tableau vide [] veut dire "Fais ça une seule fois au démarrage"


  // --- INITIALISATION CARTE ---
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => initMap();
    document.body.appendChild(script);

    return () => {
      if(mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // --- FIX REDIMENSIONNEMENT CARTE ---
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 350);
    }
  }, [isSidebarOpen]);

  const initMap = () => {
    if (!window.L || mapInstanceRef.current) return;

    // On centre la carte par défaut sur la France
    const map = window.L.map(mapRef.current).setView([46.603354, 1.888334], 6);
    mapInstanceRef.current = map;

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // On ne lance updateMarkers ici que si on a déjà des shops chargés
    if (shops.length > 0) {
      updateMarkers(map);
    }
  };

  // Ce useEffect se lance quand la liste 'shops' change (donc après le chargement Google)
  useEffect(() => {
    if (!window.L || !mapInstanceRef.current || shops.length === 0) return;
    
    updateMarkers(mapInstanceRef.current);
    
    // Si le chargement est fini et qu'on a des boutiques, on ajuste la vue pour toutes les voir
    if (!isLoading && shops.length > 0 && Object.keys(markersRef.current).length > 0) {
       const group = new window.L.featureGroup(Object.values(markersRef.current));
       try {
          // Petit délai pour laisser la carte s'initialiser
          setTimeout(() => {
             mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
          }, 500);
       } catch(e) {
          // Parfois fitBounds échoue si un seul point ou carte pas prête, on ignore
          console.log("Fitbounds ignoré");
       }
    }
  }, [shops, isLoading]);

  const updateMarkers = (map) => {
    const retroIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${BRAND_PINK}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px ${BRAND_PINK}, 0 0 20px ${BRAND_PINK};"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    Object.values(markersRef.current).forEach(marker => map.removeLayer(marker));
    markersRef.current = {};

    shops.forEach(shop => {
      // Sécurité : on vérifie qu'on a bien des coordonnées valides
      if (shop.lat && shop.lng && !isNaN(shop.lat) && !isNaN(shop.lng)) {
        const marker = window.L.marker([shop.lat, shop.lng], { icon: retroIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'Inter', sans-serif; color: #111;">
              <strong style="font-family: 'Courier New', monospace; text-transform: uppercase;">${shop.name}</strong><br/>
              ${shop.city}
            </div>
          `);
        
        marker.on('click', () => {
          setSelectedShop(shop);
        });

        markersRef.current[shop.id] = marker;
      }
    });
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.tags && shop.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const toggleTag = (tag) => {
    setNewShopForm(prev => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...prev.tags, tag] };
      }
    });
  };

  // --- GESTION ENVOI PAR EMAIL (EMAILJS) ---
  const handleSuggestSubmit = (e) => {
    e.preventDefault();
    setSubmitStatus('loading');

    const templateParams = {
      name: newShopForm.name,
      city: newShopForm.city,
      address: newShopForm.address,
      tags: newShopForm.tags.join(', '),
      note: newShopForm.note
    };

    // Tes identifiants EmailJS sont ici
    const serviceID = 'service_arqmija';
    const templateID = 'template_sdd0pom';
    const publicKey = 'XeofrijQDBJpyYeWi';

    emailjs.send(serviceID, templateID, templateParams, publicKey)
      .then((response) => {
         setSubmitStatus('success');
         setTimeout(() => {
           setSubmitStatus(null);
           setIsModalOpen(false);
           setNewShopForm({ name: '', city: '', address: '', tags: [], note: '' });
         }, 2500);
      }, (error) => {
         console.error('ÉCHEC...', error);
         setSubmitStatus('error');
         alert("Oups, une erreur est survenue lors de l'envoi. Réessaie plus tard.");
         setSubmitStatus(null);
      });
  };

  const flyToShop = (shop) => {
    setSelectedShop(shop);
    if (mapInstanceRef.current && shop.lat && shop.lng) {
      mapInstanceRef.current.flyTo([shop.lat, shop.lng], 13, { duration: 1.5 });
      const marker = markersRef.current[shop.id];
      if (marker) marker.openPopup();
    }
  };

  const searchByTag = (e, tag) => {
    e?.stopPropagation();
    if (searchTerm === tag) {
        setSearchTerm("");
    } else {
        setSearchTerm(tag);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#11111b] text-gray-100 font-sans overflow-hidden relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Press+Start+2P&display=swap');
        .font-pixel { font-family: 'Press Start 2P', cursive; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${BRAND_PINK}; }
        .scanlines {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 50; opacity: 0.3;
        }
        .shop-name-color { color: ${SHOP_NAME_COLOR}; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .cursor-wait { cursor: wait; }
      `}</style>

      {/* --- HEADER --- */}
      <header className="h-16 bg-[#11111b] flex items-center justify-between px-4 z-20 shrink-0"
              style={{ 
                borderBottom: `4px solid ${BRAND_PINK}`,
                boxShadow: `0 0 15px ${BRAND_PINK}`
              }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="transition-colors hover:text-white"
            style={{ color: BRAND_PINK }}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="text-2xl animate-bounce">🕹️</div>
          <div className="flex flex-col justify-center">
            <h1 className="font-pixel text-[10px] md:text-xs text-white tracking-widest text-shadow-sm uppercase">
              RetroHunt <span style={{ color: BRAND_PINK }}>FR</span>
            </h1>
            <a href="https://www.instagram.com/videogamesplace/" target="_blank" rel="noreferrer" 
               className="flex items-center gap-1 text-[8px] font-sans font-bold mt-1 hover:text-white transition-colors"
               style={{ color: BRAND_PINK }}>
              <Instagram size={10} /> by Videogamesplace
            </a>
          </div>
          <span className="hidden md:inline-block text-[9px] bg-[#facc15] text-black px-1 font-bold font-pixel shadow-[2px_2px_0_rgba(0,0,0,0.5)] self-start mt-1">BETA</span>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-transparent border-2 border-[#facc15] text-[#facc15] hover:bg-[#facc15] hover:text-black hover:shadow-[0_0_15px_#facc15] transition-all px-3 py-2 font-pixel text-[8px] md:text-[10px] flex items-center gap-2"
        >
          <Plus size={14} /> 
          <span className="hidden sm:inline">Ajout shop</span>
          <span className="sm:hidden">Ajout</span>
        </button>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-col-reverse md:flex-row flex-1 relative overflow-hidden">
        
        {/* --- SIDEBAR LIST --- */}
        <div className={`
          z-10 bg-[#181825]/95 backdrop-blur-md 
          border-t md:border-t-0 md:border-r border-gray-800 
          flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          w-full
          ${isSidebarOpen ? 'h-[60%]' : 'h-0'}
          md:h-full
          ${isSidebarOpen ? 'md:w-80' : 'md:w-0'}
        `}>
          
          {/* --- ÉTAT DE CHARGEMENT --- */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#facc15] p-8 text-center gap-4 animate-pulse">
               <Loader2 size={32} className="animate-spin" />
               <p className="font-pixel text-xs leading-relaxed">
                 CONNEXION AU SATELLITE GOOGLE...<br/>
                 TÉLÉCHARGEMENT DES DONNÉES...
               </p>
            </div>
          ) : (
            /* --- CONTENU NORMAL QUAND CHARGÉ --- */
            <>
              <div className="p-4 border-b border-gray-700 flex flex-col gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Ville, boutique, tag..." 
                    className="w-full bg-[#11111b] border border-gray-600 rounded p-2 pl-10 text-sm text-white focus:outline-none focus:border-[#ff5ac6] focus:ring-1 focus:ring-[#ff5ac6]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-500 hover:text-white">
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pb-2">
                    {AVAILABLE_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={(e) => searchByTag(e, tag)}
                            className={`
                                px-2 py-1 text-[8px] rounded-full border transition-all font-medium font-pixel
                                ${searchTerm === tag 
                                    ? `bg-[${BRAND_PINK}] text-white border-[${BRAND_PINK}] shadow-[0_0_8px_${BRAND_PINK}]` 
                                    : 'bg-[#1e1e2e] text-gray-400 border-gray-600 hover:border-gray-400 hover:text-white'}
                            `}
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
                      ${selectedShop?.id === shop.id 
                        ? `bg-[${BRAND_PINK}]/20 border-[${BRAND_PINK}] shadow-[inset_0_0_10px_rgba(255,90,198,0.2)]` 
                        : 'bg-[#1e1e2e] border-gray-700 hover:border-gray-500'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm uppercase tracking-wide shop-name-color">{shop.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                      <MapPin size={12} /> {shop.city}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shop.tags && shop.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx} 
                          onClick={(e) => searchByTag(e, tag)}
                          className={`text-[9px] bg-[#111] border border-gray-700 px-1 rounded hover:border-[${BRAND_PINK}] hover:text-[${BRAND_PINK}] transition-colors cursor-pointer ${searchTerm === tag ? 'text-[#ff5ac6] border-[#ff5ac6]' : 'text-gray-400'}`}
                        >
                          {tag}
                        </span>
                      ))}
                      {shop.tags && shop.tags.length > 3 && <span className="text-[9px] text-gray-500">...</span>}
                    </div>
                  </div>
                ))}
                
                {filteredShops.length === 0 && (
                  <div className="text-center p-8 text-gray-500 text-sm">
                    Aucune boutique trouvée pour "{searchTerm}".<br/>
                    <button onClick={() => setSearchTerm('')} style={{ color: BRAND_PINK }} className="underline mt-2">Effacer le filtre</button>
                  </div>
                )}
              </div>

              <div className="p-3 text-[10px] text-gray-500 text-center border-t border-gray-800 font-pixel shrink-0">
                {filteredShops.length} BOUTIQUES RÉPERTORIÉES
              </div>
            </>
          )}
        </div>

        {/* --- MAP CONTAINER --- */}
        <div className="flex-1 relative bg-[#0f0f15] min-h-0">
          <div id="map" ref={mapRef} className="w-full h-full z-0 grayscale-[20%] contrast-[1.1]" />
          
          {/* --- INFO PANEL --- */}
          {selectedShop && (
            <div className="absolute bottom-2 left-2 right-2 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-[#11111b]/95 backdrop-blur border-t-4 md:border-2 border-[#d8b4fe] md:rounded-lg p-5 z-[401] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
               <button 
                onClick={() => setSelectedShop(null)}
                className="absolute top-2 right-2 text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-2 mb-3">
                <Gamepad2 style={{ color: SHOP_NAME_COLOR }} size={20} />
                <h2 className="font-pixel text-xs uppercase leading-relaxed" style={{ color: SHOP_NAME_COLOR }}>{selectedShop.name}</h2>
              </div>
              
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {selectedShop.description}
              </p>
              
              {selectedShop.tags && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedShop.tags.map((tag, idx) => (
                    <button 
                      key={idx} 
                      onClick={(e) => searchByTag(e, tag)}
                      className="text-[10px] font-pixel border px-2 py-1 bg-opacity-10 hover:bg-opacity-30 transition-all cursor-pointer"
                      style={{ 
                        color: searchTerm === tag ? BRAND_PINK : SHOP_NAME_COLOR, 
                        borderColor: searchTerm === tag ? BRAND_PINK : SHOP_NAME_COLOR, 
                        backgroundColor: searchTerm === tag ? `${BRAND_PINK}20` : `${SHOP_NAME_COLOR}20` 
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="space-y-2 text-xs text-gray-400 bg-black/30 p-3 rounded border border-gray-800">
                <div className="flex gap-2">
                  <span className="text-gray-500 min-w-[60px]">Adresse:</span>
                  <span className="text-gray-200 select-all">{selectedShop.address}</span>
                </div>
              </div>

              <a 
                // C'est cette ligne qui a été corrigée pour un lien Google Maps propre :
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedShop.name + ' ' + selectedShop.address)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full text-center py-3 border font-pixel text-[10px] hover:text-black transition-all uppercase"
                style={{ 
                  color: SHOP_NAME_COLOR, 
                  borderColor: SHOP_NAME_COLOR,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = SHOP_NAME_COLOR; }}
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
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181825] border-2 border-[#facc15] w-full max-w-lg p-6 relative shadow-[0_0_30px_rgba(250,204,21,0.2)] my-8">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-[#facc15]"
            >
              <X size={24} />
            </button>

            <h2 className="font-pixel text-[#facc15] text-xs mb-6 text-center border-b border-gray-700 pb-4">
              PROPOSER UN AJOUT
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
                  Aide-nous à cartographier les meilleures adresses de France.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Nom de la boutique*</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors text-sm"
                      placeholder="Ex: Retro Cave"
                      value={newShopForm.name}
                      onChange={e => setNewShopForm({...newShopForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">Ville*</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors text-sm"
                      placeholder="Ex: Bordeaux"
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
                    className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors text-sm"
                    placeholder="Ex: 12 Rue des Gamers, 33000 Bordeaux"
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
                        className={`
                          text-[10px] px-2 py-1 rounded border transition-all font-medium
                          ${newShopForm.tags.includes(tag) 
                            ? 'bg-[#facc15] text-black border-[#facc15] shadow-[0_0_10px_rgba(250,204,21,0.3)]' 
                            : 'bg-[#181825] text-gray-400 border-gray-600 hover:border-gray-400'}
                        `}
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
                    className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors h-20 resize-none text-sm"
                    placeholder="Pourquoi cette boutique est top ? Horaires spécifiques ? Anecdote ?"
                    value={newShopForm.note}
                    onChange={e => setNewShopForm({...newShopForm, note: e.target.value})}
                  ></textarea>
                </div>

                <button 
                  disabled={submitStatus === 'loading'}
                  type="submit" 
                  className={`w-full bg-[#facc15] text-black font-pixel text-[10px] py-4 hover:bg-yellow-300 transition-colors uppercase disabled:opacity-50 disabled:cursor-wait shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1 ${submitStatus === 'loading' ? 'cursor-wait' : ''}`}
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