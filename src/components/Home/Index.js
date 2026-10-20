'use client';
import dynamic from 'next/dynamic';
// Search is the above-fold hero — import it statically so it is included in
// the initial JS bundle and paints immediately (critical for LCP).
import Search from '@/components/Home/Search/Search';
// Everything below the fold is code-split and loaded only when needed.
const Package = dynamic(() => import('@/components/Home/Packages/Package'));
// const Services = dynamic(() => import('@/components/Home/Services/Services'));
const TopHotels = dynamic(() => import('@/components/Home/TopHotels/TopHotels'), { ssr: false });
const TopTransfers = dynamic(() => import('@/components/Home/TopTransfers/TopTransfers'));
const TopActivities = dynamic(() => import('@/components/Home/TopActivities/TopActivities'));
const TopDestination = dynamic(() => import('@/components/Home/TopDestination/TopDestination'));
const TopTravelsStories = dynamic(() => import('@/components/Home/TopTravelsStories/TopTravelsStories'));
const TopJornal = dynamic(() => import('@/components/Home/TopJornal/TopJornal'));
const TopContact = dynamic(() => import('@/components/Home/TopContact/TopContact'), { ssr: false });
const AboutUs = dynamic(() => import('@/components/Home/AboutUs/AboutUs'));
const ReasonTravling = dynamic(() => import('@/components/Home/ReasonTravling/ReasonTravling'));
export default function Index() {
  return (
    <div>
      <Search />
      <Package />
      <ReasonTravling />
      {/* <Services /> */}
      <TopHotels />
      <TopTransfers />
      <TopActivities />
      <TopDestination />
      <TopTravelsStories />
      <TopJornal />
      <TopContact />
      {/* <AboutUs /> */}
    </div>
  );
}
