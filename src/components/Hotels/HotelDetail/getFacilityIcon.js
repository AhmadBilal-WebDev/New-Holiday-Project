import {
  FaWifi,
  FaUtensils,
  FaCocktail,
  FaBus,
  FaBell,
  FaSmokingBan,
  FaDumbbell,
  FaSwimmer,
  FaParking,
  FaSpa,
  FaConciergeBell,
  FaCheck,
  FaArrowsAltV,
} from 'react-icons/fa';

export default function getFacilityIcon(name = '') {
  const n = String(name).toLowerCase();

  if (n.includes('wifi') || n.includes('wi-fi') || n.includes('internet')) return FaWifi;
  if (n.includes('restaurant') || n.includes('cafe') || n.includes('dining') || n.includes('food')) return FaUtensils;
  if (n.includes('bar') || n.includes('lounge') || n.includes('cocktail')) return FaCocktail;
  if (n.includes('lift') || n.includes('elevator')) return FaArrowsAltV;
  if (n.includes('airport') || n.includes('shuttle') || n.includes('transfer') || n.includes('transport')) return FaBus;
  if (n.includes('room service') || n.includes('concierge')) return n.includes('concierge') ? FaConciergeBell : FaBell;
  if (n.includes('non-smoking') || n.includes('no smoking') || n.includes('non smoking') || n.includes('smoke free')) return FaSmokingBan;
  if (n.includes('fitness') || n.includes('gym') || n.includes('workout')) return FaDumbbell;
  if (n.includes('pool') || n.includes('swim')) return FaSwimmer;
  if (n.includes('parking') || n.includes('garage')) return FaParking;
  if (n.includes('spa') || n.includes('sauna') || n.includes('massage')) return FaSpa;
  if (n.includes('bell')) return FaBell;

  return FaCheck;
}
