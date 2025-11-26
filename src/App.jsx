import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Gamepad2,
  Search,
  Plus,
  X,
  ExternalLink,
  Menu,
  Tag,
  Instagram,
  Filter,
  Mail,
} from 'lucide-react';

// ==================================================================================
// 🛠️ ZONE ADMIN : GESTION DES BOUTIQUES
// ==================================================================================
const INITIAL_SHOPS = [
  {
    id: 1,
    name: 'Game Spirit',
    city: 'Lyon',
    address: '23 Quai Jean Moulin, 69002 Lyon',
    lat: 45.764,
    lng: 4.8357,
    specialty: 'Import Japon & Arcade',
    tags: ['Import Japon', 'Arcade', 'Rétrogaming'],
    description:
      "Une institution lyonnaise. Un sous-sol arcade incroyable et énormément d'import.",
    verified: true,
  },
  {
    id: 2,
    name: 'Trader Games',
    city: 'Paris',
    address: '4 Blvd Voltaire, 75011 Paris',
    lat: 48.8665,
    lng: 2.3675,
    specialty: 'Rétrogaming généraliste',
    tags: ['Rétrogaming', 'Import Japon', 'Figurines'],
    description:
      'Le boulevard Voltaire est légendaire. Trader Games a un stock massif.',
    verified: true,
  },
  {
    id: 3,
    name: 'Retrogameplay',
    city: 'Nantes',
    address: '16 Rue des 3 Croissants, 44000 Nantes',
    lat: 47.2163,
    lng: -1.5539,
    specialty: 'Hardware & Réparations',
    tags: ['Réparations', 'Rétrogaming'],
    description: 'Super boutique avec un atelier de réparation sur place.',
    verified: true,
  },
  {
    id: 4,
    name: 'Gemba Games',
    city: 'Lille',
    address: '12 Rue du Sec Arembault, 59800 Lille',
    lat: 50.6365,
    lng: 3.0635,
    specialty: 'Current gen & Goodies',
    tags: ['Next Gen', 'Goodies'],
    description: 'Petite boutique très sympa au coeur de Lille.',
    verified: false,
  },
];

// 🛠️ ZONE ADMIN : LISTE DES TAGS
const AVAILABLE_TAGS = [
  'Rétrogaming',
  'Next Gen',
  'Import Japon',
  'Arcade',
  'Figurines',
  'Réparations',
  'Goodies',
];

const CONTACT_EMAIL = 'ton-email@exemple.com';

// ==================================================================================
// ⛔ FIN DE LA ZONE ADMIN
// ==================================================================================

export default function App() {
  const [shops, setShops] = useState(INITIAL_SHOPS);
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newShopForm, setNewShopForm] = useState({
    name: '',
    city: '',
    address: '',
    tags: [],
    note: '',
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // COULEURS
  const BRAND_PINK = '#ff5ac6';
  const BRAND_YELLOW = '#facc15';
  const SHOP_NAME_COLOR = '#72fffb';

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
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // --- FIX REDIMENSIONNEMENT CARTE ---
  // Quand la sidebar s'ouvre/ferme, on force la carte à recalculer sa taille
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 350); // Petit délai pour attendre la fin de l'animation CSS
    }
  }, [isSidebarOpen]);

  const initMap = () => {
    if (!window.L || mapInstanceRef.current) return;

    const map = window.L.map(mapRef.current).setView([46.603354, 1.888334], 6);
    mapInstanceRef.current = map;

    window.L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    updateMarkers(map);
  };

  useEffect(() => {
    if (!window.L || !mapInstanceRef.current) return;
    updateMarkers(mapInstanceRef.current);
  }, [shops]);

  const updateMarkers = (map) => {
    const retroIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${BRAND_PINK}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px ${BRAND_PINK}, 0 0 20px ${BRAND_PINK};"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    Object.values(markersRef.current).forEach((marker) =>
      map.removeLayer(marker)
    );
    markersRef.current = {};

    shops.forEach((shop) => {
      const marker = window.L.marker([shop.lat, shop.lng], {
        icon: retroIcon,
      }).addTo(map).bindPopup(`
          <div style="font-family: 'Inter', sans-serif; color: #111;">
            <strong style="font-family: 'Courier New', monospace; text-transform: uppercase;">${shop.name}</strong><br/>
            ${shop.city}
          </div>
        `);

      marker.on('click', () => {
        setSelectedShop(shop);
        // SUR MOBILE : On ne ferme plus la sidebar, on scrolle juste vers elle si besoin
        // Mais le comportement "Split View" rend ça moins nécessaire.
      });

      markersRef.current[shop.id] = marker;
    });
  };

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shop.tags &&
        shop.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  const toggleTag = (tag) => {
    setNewShopForm((prev) => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      } else {
        return { ...prev, tags: [...prev.tags, tag] };
      }
    });
  };

  const handleSuggestSubmit = (e) => {
    e.preventDefault();
    setSubmitStatus('loading');

    const subject = `[RetroHunt] Nouvelle proposition : ${newShopForm.name}`;
    const body = `
      Nom: ${newShopForm.name}
      Ville: ${newShopForm.city}
      Adresse: ${newShopForm.address}
      Tags: ${newShopForm.tags.join(', ')}
      
      Infos complémentaires:
      ${newShopForm.note}
    `;

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    setTimeout(() => {
      setSubmitStatus('success');
      setTimeout(() => {
        setSubmitStatus(null);
        setIsModalOpen(false);
        setNewShopForm({ name: '', city: '', address: '', tags: [], note: '' });
      }, 2500);
    }, 1000);
  };

  const flyToShop = (shop) => {
    setSelectedShop(shop);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([shop.lat, shop.lng], 13, { duration: 1.5 });
      const marker = markersRef.current[shop.id];
      if (marker) marker.openPopup();
    }
  };

  const searchByTag = (e, tag) => {
    e?.stopPropagation();
    if (searchTerm === tag) {
      setSearchTerm('');
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
      `}</style>

      {/* --- HEADER --- */}
      <header
        className="h-16 bg-[#11111b] flex items-center justify-between px-4 z-20 shrink-0"
        style={{
          borderBottom: `4px solid ${BRAND_PINK}`,
          boxShadow: `0 0 15px ${BRAND_PINK}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="transition-colors hover:text-white"
            style={{ color: BRAND_PINK }}
          >
            {/* Icône Menu dynamique selon état */}
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="text-2xl animate-bounce">🕹️</div>
          <div className="flex flex-col justify-center">
            <h1 className="font-pixel text-[10px] md:text-xs text-white tracking-widest text-shadow-sm uppercase">
              RetroHunt <span style={{ color: BRAND_PINK }}>FR</span>
            </h1>
            <a
              href="https://www.instagram.com/videogamesplace/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[8px] font-sans font-bold mt-1 hover:text-white transition-colors"
              style={{ color: BRAND_PINK }}
            >
              <Instagram size={10} /> by Videogamesplace
            </a>
          </div>
          <span className="hidden md:inline-block text-[9px] bg-[#facc15] text-black px-1 font-bold font-pixel shadow-[2px_2px_0_rgba(0,0,0,0.5)] self-start mt-1">
            BETA
          </span>
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

      {/* --- MAIN LAYOUT (MODIFIÉ POUR SPLIT VIEW MOBILE) --- */}
      {/* flex-col-reverse sur mobile met la Sidebar (1er élément) en bas et la Map (2e élément) en haut */}
      <div className="flex flex-col-reverse md:flex-row flex-1 relative overflow-hidden">
        {/* --- SIDEBAR LIST --- */}
        <div
          className={`
          z-10 bg-[#181825]/95 backdrop-blur-md 
          border-t md:border-t-0 md:border-r border-gray-800 
          flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          
          /* MOBILE: Largeur 100%, Hauteur variable (60% si ouvert) */
          w-full
          ${isSidebarOpen ? 'h-[60%]' : 'h-0'}
          
          /* DESKTOP: Hauteur 100%, Largeur variable (80 ou 0) */
          md:h-full
          ${isSidebarOpen ? 'md:w-80' : 'md:w-0'}
        `}
        >
          <div className="p-4 border-b border-gray-700 flex flex-col gap-3 shrink-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Ville, boutique, tag..."
                className="w-full bg-[#11111b] border border-gray-600 rounded p-2 pl-10 text-sm text-white focus:outline-none focus:border-[#ff5ac6] focus:ring-1 focus:ring-[#ff5ac6]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pb-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => searchByTag(e, tag)}
                  className={`
                            px-2 py-1 text-[8px] rounded-full border transition-all font-medium font-pixel
                            ${
                              searchTerm === tag
                                ? `bg-[${BRAND_PINK}] text-white border-[${BRAND_PINK}] shadow-[0_0_8px_${BRAND_PINK}]`
                                : 'bg-[#1e1e2e] text-gray-400 border-gray-600 hover:border-gray-400 hover:text-white'
                            }
                        `}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => flyToShop(shop)}
                className={`
                  p-3 rounded border cursor-pointer transition-all hover:translate-x-1
                  ${
                    selectedShop?.id === shop.id
                      ? `bg-[${BRAND_PINK}]/20 border-[${BRAND_PINK}] shadow-[inset_0_0_10px_rgba(255,90,198,0.2)]`
                      : 'bg-[#1e1e2e] border-gray-700 hover:border-gray-500'
                  }
                `}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm uppercase tracking-wide shop-name-color">
                    {shop.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                  <MapPin size={12} /> {shop.city}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {shop.tags &&
                    shop.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        onClick={(e) => searchByTag(e, tag)}
                        className={`text-[9px] bg-[#111] border border-gray-700 px-1 rounded hover:border-[${BRAND_PINK}] hover:text-[${BRAND_PINK}] transition-colors cursor-pointer ${
                          searchTerm === tag
                            ? 'text-[#ff5ac6] border-[#ff5ac6]'
                            : 'text-gray-400'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  {shop.tags && shop.tags.length > 3 && (
                    <span className="text-[9px] text-gray-500">...</span>
                  )}
                </div>
              </div>
            ))}

            {filteredShops.length === 0 && (
              <div className="text-center p-8 text-gray-500 text-sm">
                Aucune boutique trouvée pour "{searchTerm}".
                <br />
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ color: BRAND_PINK }}
                  className="underline mt-2"
                >
                  Effacer le filtre
                </button>
              </div>
            )}
          </div>

          <div className="p-3 text-[10px] text-gray-500 text-center border-t border-gray-800 font-pixel shrink-0">
            {filteredShops.length} BOUTIQUES RÉPERTORIÉES
          </div>
        </div>

        {/* --- MAP CONTAINER --- */}
        {/* flex-1 permet à la carte de prendre TOUT l'espace restant (si la liste est fermée, elle prend 100%, si ouverte, elle prend le reste) */}
        <div className="flex-1 relative bg-[#0f0f15] min-h-0">
          <div
            id="map"
            ref={mapRef}
            className="w-full h-full z-0 grayscale-[20%] contrast-[1.1]"
          />

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
                <h2
                  className="font-pixel text-xs uppercase leading-relaxed"
                  style={{ color: SHOP_NAME_COLOR }}
                >
                  {selectedShop.name}
                </h2>
              </div>

              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {selectedShop.description}
              </p>

              {/* Tags détaillés cliquables */}
              {selectedShop.tags && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedShop.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => searchByTag(e, tag)}
                      className="text-[10px] font-pixel border px-2 py-1 bg-opacity-10 hover:bg-opacity-30 transition-all cursor-pointer"
                      style={{
                        color:
                          searchTerm === tag ? BRAND_PINK : SHOP_NAME_COLOR,
                        borderColor:
                          searchTerm === tag ? BRAND_PINK : SHOP_NAME_COLOR,
                        backgroundColor:
                          searchTerm === tag
                            ? `${BRAND_PINK}20`
                            : `${SHOP_NAME_COLOR}20`,
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
                  <span className="text-gray-200 select-all">
                    {selectedShop.address}
                  </span>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  selectedShop.name + ' ' + selectedShop.address
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full text-center py-3 border font-pixel text-[10px] hover:text-black transition-all uppercase"
                style={{
                  color: SHOP_NAME_COLOR,
                  borderColor: SHOP_NAME_COLOR,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = SHOP_NAME_COLOR;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Y aller (GPS){' '}
                <ExternalLink size={10} className="inline ml-1 mb-0.5" />
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
                <p className="font-pixel text-[10px] text-green-400 leading-6">
                  CLIENT MAIL OUVERT.
                  <br />
                  VERIFIE ET ENVOIE LE MAIL
                  <br />
                  POUR QUE LE QG REÇOIVE L'INFO.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-4">
                <p className="text-xs text-gray-400 mb-4 italic text-center">
                  Aide-nous à cartographier les meilleures adresses de France.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">
                      Nom de la boutique*
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors text-sm"
                      placeholder="Ex: Retro Cave"
                      value={newShopForm.name}
                      onChange={(e) =>
                        setNewShopForm({ ...newShopForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">
                      Ville*
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors text-sm"
                      placeholder="Ex: Bordeaux"
                      value={newShopForm.city}
                      onChange={(e) =>
                        setNewShopForm({ ...newShopForm, city: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">
                    Adresse précise*
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors text-sm"
                    placeholder="Ex: 12 Rue des Gamers, 33000 Bordeaux"
                    value={newShopForm.address}
                    onChange={(e) =>
                      setNewShopForm({
                        ...newShopForm,
                        address: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-2 font-bold flex items-center gap-2">
                    <Tag size={12} /> Catégories (Tags)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-black/40 border border-gray-800 rounded">
                    {AVAILABLE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`
                          text-[10px] px-2 py-1 rounded border transition-all font-medium
                          ${
                            newShopForm.tags.includes(tag)
                              ? 'bg-[#facc15] text-black border-[#facc15] shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                              : 'bg-[#181825] text-gray-400 border-gray-600 hover:border-gray-400'
                          }
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
                  <label className="block text-xs uppercase text-gray-500 mb-1 font-bold">
                    Infos complémentaires
                  </label>
                  <textarea
                    className="w-full bg-black border border-gray-700 text-white p-3 focus:border-[#facc15] outline-none transition-colors h-20 resize-none text-sm"
                    placeholder="Pourquoi cette boutique est top ? Horaires spécifiques ? Anecdote ?"
                    value={newShopForm.note}
                    onChange={(e) =>
                      setNewShopForm({ ...newShopForm, note: e.target.value })
                    }
                  ></textarea>
                </div>

                <button
                  disabled={submitStatus === 'loading'}
                  type="submit"
                  className={`w-full bg-[#facc15] text-black font-pixel text-[10px] py-4 hover:bg-yellow-300 transition-colors uppercase disabled:opacity-50 disabled:cursor-wait shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1`}
                >
                  {submitStatus === 'loading'
                    ? 'OUVRIR EMAIL...'
                    : "PRÉPARER L'EMAIL"}
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
