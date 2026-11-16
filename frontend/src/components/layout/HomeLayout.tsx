'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroVideo from '@/features/booking/HeroVideo';
import { EditorialRideBanner } from '@/features/home/EditorialRideBanner';
import { BrandShowcaseStrip } from '@/features/home/BrandShowcaseStrip';
import { TrackExperienceBentoSection } from '@/features/home/TrackExperienceBentoSection';
import { ApexPaySection } from '@/features/home/ApexPaySection';
import type { Automovel } from '@/features/cars/components/BookingModal';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function HomeLayout() {
  const { user } = useAuthStore();
  const showApexPay = !user || user.role === 'CLIENTE';
  const [cars, setCars] = useState<Automovel[]>([]);

  useEffect(() => {
    api
      .get('/api/automoveis')
      .then((res) => setCars(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCars([]));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#08090C] text-white selection:bg-[#FF1717] selection:text-white">
      <Header transparent={true} />

      <main className="flex-1">
        {/* 1. Hero Cinematográfica */}
        <HeroVideo videoSrc="/hero.mp4" posterSrc="/hero-poster.jpg" />

        <div id="main-content" />

        {/* 2. Retrato do Piloto + Telemetria */}
        <EditorialRideBanner />

        {/* 3. Engenharia Homologada (com link direto para detalhes do carro) */}
        <BrandShowcaseStrip cars={cars} />

        {/* 4. Experiência em Pista (Calendário animado, Serviços, Carrossel & Circuito) */}
        <TrackExperienceBentoSection />

        {/* 5. Seção ApexPay (Cartão Sandbox + Globo Global + Patrocinadores) - Exclusiva para Pilotos/Clientes */}
        {showApexPay && <ApexPaySection />}
      </main>

      <Footer />
    </div>
  );
}
