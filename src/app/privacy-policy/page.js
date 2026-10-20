import PrivacyPolicy from './PrivacyPolicy';

export const metadata = {
  title: 'Privacy Policy | Al Hijaz Tours UK Travel Agency',
  description:
    'Al Hijaz Tours respects your privacy. Learn how we collect, use and protect your personal information when booking Hajj and Umrah packages.',
  keywords: [
    'Al Hijaz Tours privacy policy',
    'travel data protection UK',
    'Islamic travel privacy',
    'customer information security',
  ],
  alternates: {
    canonical: 'https://alhijaztours.net/privacy-policy',
  },
};

export default function page() {
  return <PrivacyPolicy />;
}
