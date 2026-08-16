import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';

import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import MobileNav from '../components/layout/MobileNav.jsx';
import { IncidentProvider } from './providers/IncidentProvider.jsx';

import Home from '../pages/Home.jsx';
// The emergency path is NEVER lazy-loaded. Cross-cutting invariant 5.
import Sos from '../pages/Sos.jsx';
import Track from '../pages/Track.jsx';

const Services = lazy(() => import('../pages/Services.jsx'));
const Report = lazy(() => import('../pages/Report.jsx'));
const About = lazy(() => import('../pages/About.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    /* basename lets one build serve from a sub-path (GitHub Pages) or from root */
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <IncidentProvider>
        <ScrollToTop />

        {/* The hero is 300vh. Keyboard users must reach SOS without traversing it. */}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Link className="skip-link" to="/sos">
          Go straight to Emergency SOS
        </Link>

        <Header />

        <main id="main">
          <Suspense fallback={<div className="px-5 py-24 text-center text-small text-ink-3">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sos" element={<Sos />} />
              <Route path="/track/:incidentId" element={<Track />} />
              <Route path="/services" element={<Services />} />
              <Route path="/report" element={<Report />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
        <MobileNav />
      </IncidentProvider>
    </BrowserRouter>
  );
}
