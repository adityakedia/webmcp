import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebMcp, type CartItem, type NavigationRequest, type NavigationResult } from './hooks/useWebMcp';
import { apiUrl } from './lib/api';
import { getNeonJwt } from './lib/neonAuth';
import { readLocalBuilds, writeLocalBuilds, type LocalBuild } from './lib/localBuilds';
import { hydrateBuildsFromAccount, syncAnonymousBuildsToAccount } from './lib/customBuildRepository';
import SimulatorPage from './components/SimulatorPage';
import ComparisonPage from './components/ComparisonPage';
import CustomDesignBuilder from './components/CustomDesignBuilder';
import './catalog-custom.css';

export type Product = { name: string; type: string; price: string; image: string; tone: string; category: string; description: string; specs: [string, string][] };

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [customBuilds, setCustomBuilds] = useState<LocalBuild[]>(() => readLocalBuilds()?.builds ?? []);
  const [menuOpen, setMenuOpen] = useState(false); const [detail, setDetail] = useState<Product | null>(null); const [customOpen, setCustomOpen] = useState(false); const [liked, setLiked] = useState<string[]>([]); const [cart, setCart] = useState<CartItem[]>(() => { try { const saved = window.localStorage.getItem('acoustom-cart'); return saved ? JSON.parse(saved) as CartItem[] : []; } catch { return []; } });
  const cartRef = useRef(cart); const likedRef = useRef(liked);
  useEffect(() => { cartRef.current = cart; likedRef.current = liked; }, [cart, liked]);
  const pathProduct = products.find((product) => `/speakers/${product.name.toLowerCase().replace(/\s+/g, '-')}` === location.pathname);
  const activeDetail = detail ?? pathProduct ?? null;
  const simulatorOpen = location.pathname === '/simulator';
  const comparisonOpen = location.pathname === '/compare';
  const goHome = () => { setDetail(null); setCustomOpen(false); setMenuOpen(false); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goTo = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); setDetail(null); setCustomOpen(false); setMenuOpen(false); navigate(id === 'speakers' ? '/speakers' : `/#${id}`); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
  const goCustom = () => { setDetail(null); setCustomOpen(true); setMenuOpen(false); navigate('/custom-design'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goSimulator = (product?: Product) => { setDetail(null); setCustomOpen(false); setMenuOpen(false); if (product) window.sessionStorage.setItem('acoustom-preview-speaker', product.name); navigate('/simulator'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goCompare = () => { setDetail(null); setCustomOpen(false); setMenuOpen(false); navigate('/compare'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openProduct = (product: Product) => { setDetail(product); setCustomOpen(false); navigate(`/speakers/${product.name.toLowerCase().replace(/\s+/g, '-')}`); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const backToSpeakers = () => { setDetail(null); setCustomOpen(false); navigate('/speakers'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const getNavigationContext = () => {
    const page = activeDetail ? 'product_detail' : simulatorOpen ? 'listening_lab' : comparisonOpen ? 'compare' : customOpen || location.pathname === '/custom-design' ? 'custom_design' : location.pathname === '/speakers' ? 'catalog' : 'home';
    const sections = activeDetail ? ['top', 'specifications'] : page === 'home' || page === 'catalog' ? ['top', 'story', 'speakers', 'journal', 'support'] : page === 'compare' ? ['top', 'comparison'] : ['top'];
    const navigationSchema = {
      destinations: {
        home: { path: '/', sections: ['top', 'story', 'speakers', 'journal', 'support'] },
        catalog: { path: '/speakers', sections: ['top', 'speakers', 'journal'] },
        product_detail: { pathPattern: '/speakers/:productSlug', sections: ['top', 'specifications'], requires: ['productName'] },
        compare: { path: '/compare', sections: ['top', 'comparison'] },
        listening_lab: { path: '/simulator', sections: ['top'] },
        custom_design: { path: '/custom-design', sections: ['top'] },
      },
      actions: ['get_navigation_context', 'navigate_acoustom'],
    };
    return { path: location.pathname, page, ...(activeDetail ? { selectedProductName: activeDetail.name } : {}), destinations: Object.keys(navigationSchema.destinations), sections, navigationSchema, navigationPolicy: 'Use navigate_acoustom only to show editable or reviewable in-app context. There is no checkout, payment, or purchase destination.' };
  };
  const navigateForAgent = ({ destination, productName, sectionId }: NavigationRequest): NavigationResult => {
    let path = '/'; let reviewHint = 'The user can review the collection and choose a product.';
    setMenuOpen(false);
    const sectionMap: Record<NavigationRequest['destination'], string[]> = { home: ['top', 'story', 'speakers', 'journal', 'support'], catalog: ['top', 'speakers', 'journal'], product_detail: ['top', 'specifications'], compare: ['top', 'comparison'], listening_lab: ['top'], custom_design: ['top'] };
    if (sectionId && !sectionMap[destination].includes(sectionId)) throw new Error(`sectionId must be valid for the ${destination} destination.`);
    if (destination === 'product_detail') {
      const product = products.find((item) => item.name.toLowerCase() === productName?.toLowerCase());
      if (!product) throw new Error('The requested product is no longer in the catalog.');
      setDetail(product); setCustomOpen(false); path = `/speakers/${product.name.toLowerCase().replace(/\s+/g, '-')}`; reviewHint = `The user can now review ${product.name} and its specifications.`;
    } else if (destination === 'catalog') { setDetail(null); setCustomOpen(false); path = '/speakers'; reviewHint = 'The user can now review the speaker collection.'; }
    else if (destination === 'compare') { setDetail(null); setCustomOpen(false); path = '/compare'; reviewHint = 'The user can now review the speaker comparison.'; }
    else if (destination === 'listening_lab') { setDetail(null); setCustomOpen(false); path = '/simulator'; reviewHint = 'The user can now adjust room controls and review the listening simulation.'; }
    else if (destination === 'custom_design') { setDetail(null); setCustomOpen(true); path = '/custom-design'; reviewHint = 'The user can now review and edit the custom speaker design.'; }
    else { setDetail(null); setCustomOpen(false); reviewHint = 'The user can now review the Acoustom home page.'; }
    navigate(path);
    window.setTimeout(() => {
      if (sectionId && sectionId !== 'top') document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
    return { navigated: true, destination, path, ...(productName ? { productName } : {}), ...(sectionId ? { sectionId } : {}), userReviewHint: reviewHint };
  };
  const toggleLike = (name: string) => setLiked((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);
  const addToCart = (productName: string, quantity: number) => { const existing = cartRef.current.find((item) => item.productName === productName); const next = existing ? cartRef.current.map((item) => item.productName === productName ? { ...item, quantity: item.quantity + quantity } : item) : [...cartRef.current, { productName, quantity }]; cartRef.current = next; setCart(next); return next; };
  const updateCartQuantity = (productName: string, quantity: number) => { const next = quantity === 0 ? cartRef.current.filter((item) => item.productName !== productName) : cartRef.current.map((item) => item.productName === productName ? { ...item, quantity } : item); cartRef.current = next; setCart(next); return next; };
  const removeFromCart = (productName: string) => updateCartQuantity(productName, 0);
  const toggleLikeAndReturn = (name: string) => { const currentlyLiked = !likedRef.current.includes(name); const next = currentlyLiked ? [...likedRef.current, name] : likedRef.current.filter((item) => item !== name); likedRef.current = next; setLiked(next); return currentlyLiked; };
  const refreshCustomBuilds = () => setCustomBuilds(readLocalBuilds()?.builds ?? []);
  useEffect(() => { window.addEventListener('acoustom-builds-updated', refreshCustomBuilds); return () => window.removeEventListener('acoustom-builds-updated', refreshCustomBuilds); }, []);
  useEffect(() => { void syncAnonymousBuildsToAccount().then(hydrateBuildsFromAccount).catch(() => undefined); }, []);
  useEffect(() => { void fetch(apiUrl('/api/speakers/catalog')).then(async (response) => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json() as Promise<{ products: Product[] }>; }).then(({ products: catalog }) => setProducts(catalog)).catch(() => undefined); }, []);
  useEffect(() => { window.localStorage.setItem('acoustom-cart', JSON.stringify(cart)); }, [cart]);
  useWebMcp({ products, getCart: () => cartRef.current, getLiked: () => likedRef.current, getAccessToken: getNeonJwt, addToCart, updateCartQuantity, removeFromCart, toggleLike: toggleLikeAndReturn, getNavigationContext, navigate: navigateForAgent });
  return <div className="site-shell">
    <div className="announcement">Free delivery on all orders over $500 <ArrowRight size={14} /></div>
    <header className="nav-wrap"><button className="menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}<span>Menu</span></button><button className="wordmark" onClick={goHome}>ACOUSTOM<span>®</span></button><nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#speakers" onClick={goTo('speakers')}>Speakers</a><button onClick={goCompare}>Compare</button><button onClick={() => goSimulator()}>Listening lab</button><a href="#journal" onClick={goTo('journal')}>Journal</a><button onClick={goCustom}>Custom design</button></nav><div className="nav-actions"><button aria-label="Search"><Search /></button><button aria-label={`Bag, ${cart.reduce((total, item) => total + item.quantity, 0)} items`}><ShoppingBag /><sup>{cart.reduce((total, item) => total + item.quantity, 0)}</sup></button></div></header>
    {activeDetail ? <ProductDetail product={activeDetail} onBack={backToSpeakers} onAddToCart={(name) => addToCart(name, 1)} /> : simulatorOpen ? <SimulatorPage products={products} onBack={goHome} /> : comparisonOpen ? <ComparisonPage products={products} onBack={backToSpeakers} onPreview={goSimulator} /> : customOpen || location.pathname === '/custom-design' ? <CustomDesign onBack={goHome} products={products} /> : <><main>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">The new Contour i series</p><h1>Sound.<br /><em>Refined.</em></h1><p className="hero-intro">A century of acoustic craft, distilled into a listening experience that feels like nothing else.</p>{products[0] && <button className="button light" onClick={() => openProduct(products[0])}>Explore Contour 20i <ArrowRight size={16} /></button>}</div><div className="hero-image"><img src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1800&q=90" alt="Premium speaker in a warm listening room" /><div className="hero-caption">01 / 03<br /><span>Designed for the moments that matter.</span></div></div></section>
      <section className="intro-band" id="story"><p className="eyebrow">The Acoustom difference</p><h2>Made for <em>music.</em><br />Built for life.</h2><p>We believe great sound should disappear into the room and leave only the feeling behind. Every Acoustom loudspeaker is designed, tuned, and hand-finished in our studio.</p><a href="#journal" className="text-link">Discover our approach <ArrowRight size={15} /></a></section>
      <section className="catalog" id="speakers"><div className="section-head"><div><p className="eyebrow">Find your sound</p><h2>Explore the collection</h2></div><button className="filter">All speakers <ChevronDown size={16} /></button></div><div className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><div className="product-image"><img src={product.image} alt={product.name} /><span>{product.tone}</span><button className="heart" onClick={() => toggleLike(product.name)} aria-label="Save product"><Heart fill={liked.includes(product.name) ? 'currentColor' : 'none'} /></button></div><button className="product-info" onClick={() => openProduct(product)}><div><h3>{product.name}</h3><p>{product.type}</p></div><strong>{product.price}</strong><ArrowRight size={17} /></button></article>)}</div>{customBuilds.length > 0 && <><div className="catalog-subhead"><p className="eyebrow">Your designs</p><span>Saved in this browser · {customBuilds.length}</span></div><div className="product-grid custom-product-grid">{customBuilds.map((item) => <article className="product-card custom-product-card" key={item.id}><div className="custom-product-image"><span>CUSTOM</span><div className="custom-silhouette">●<br />●</div></div><button className="product-info" onClick={() => { const stored = readLocalBuilds(); if (stored) writeLocalBuilds({ ...stored, activeBuildId: item.id }); goCustom(); }}><div><h3>{item.name}</h3><p>{item.configuration.brief.format} · {item.configuration.platformId.replaceAll('_', ' ')}</p>{item.derived && <small className="custom-build-ref">{item.derived.simulationProfile.referenceName}</small>}</div><strong>{item.configuration.cabinet.finish.replaceAll('_', ' ')}</strong><ArrowRight size={17} /></button></article>)}</div></>}</section>
      <section className="feature" id="journal"><img src="https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1600&q=85" alt="Listening room details" /><div><p className="eyebrow">The art of listening</p><h2>Hear more.<br /><em>Feel more.</em></h2><p>From the first note to the last, every detail matters. Learn how our engineers turn sound into something you can feel.</p><a href="#story" className="text-link">Read the story <ArrowRight size={15} /></a></div></section>
    </main><footer id="support"><div className="footer-brand">ACOUSTOM®<p>Beautiful sound, honestly made.</p></div><div><p className="footer-title">Explore</p><a href="#speakers" onClick={goTo('speakers')}>Speakers</a><a href="#story" onClick={goTo('story')}>Our story</a><a href="#journal" onClick={goTo('journal')}>Journal</a><button onClick={goCustom}>Custom design</button></div><div><p className="footer-title">Stay in the room</p><p>Join our newsletter for new releases,<br />listening notes, and studio stories.</p><div className="email"><span>Your email address</span><ArrowRight size={16} /></div></div></footer></>}
  </div>;
}
function ProductDetail({ product, onBack, onAddToCart }: { product: Product; onBack: () => void; onAddToCart: (name: string) => void }) { return <main className="detail-page"><button className="back-link" onClick={onBack}>← Back to collection</button><div className="detail-grid"><div className="detail-image"><img src={product.image} alt={product.name} /></div><div className="detail-copy"><p className="eyebrow">{product.tone} / {product.category}</p><h1>{product.name}</h1><p className="detail-type">{product.type}</p><p className="detail-price">{product.price} <span>per pair</span></p><p className="detail-description">{product.description}</p><button className="button dark" onClick={() => onAddToCart(product.name)}>Add to bag <ArrowRight size={16} /></button><p className="detail-note">Complimentary delivery · 30-day listening trial</p></div></div><section className="detail-intro"><p className="eyebrow">The listening experience</p><h2>Everything you need.<br /><em>Nothing you don't.</em></h2><p>{product.name} is tuned for a natural, uncoloured presentation. Its controlled bass, open midrange, and effortless high frequencies let you hear the intent behind every recording.</p></section><section className="detail-panels"><div className="detail-panel"><p className="eyebrow">Engineering</p><h3>Built around the music</h3><p>Every cabinet, driver, and crossover decision is made to keep the signal clean and the timing coherent. This is the kind of detail you notice in the first bar—and appreciate for years.</p><a className="text-link" href="#specifications">See specifications <ArrowRight size={15} /></a></div><div className="detail-panel dark-panel"><p className="eyebrow">Room placement</p><h3>Give it room to breathe</h3><p>Start with the speakers slightly angled toward your listening position, then adjust by ear. We recommend a little space from the rear wall for the most open presentation.</p><button className="text-link">Open room guide <ArrowRight size={15} /></button></div></section><section className="specifications" id="specifications"><div className="spec-heading"><p className="eyebrow">Technical details</p><h2>Specifications</h2><p>Reference values for the {product.name}. These fields are structured to connect with the room simulator later.</p></div><div className="spec-table">{product.specs.map(([label, value]) => <div className="spec-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section><section className="detail-bottom"><p className="eyebrow">Find your fit</p><h2>Ready to hear<br /><em>the difference?</em></h2><button className="button dark" onClick={onBack}>Explore the collection <ArrowRight size={16} /></button></section></main>; }

function CustomDesign({ onBack, products }: { onBack: () => void; products: Product[] }) { return <CustomDesignBuilder onBack={onBack} products={products} />; }
