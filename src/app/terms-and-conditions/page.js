import TermsAndConditions from './TermsAndConditions';

export const metadata = {
  title: 'Terms and Conditions | Al Hijaz Tours UK Hajj & Umrah Travel',
  description:
    'Read the terms and conditions of Al Hijaz Tours for Hajj and Umrah bookings from the UK. Understand our travel policies, payments and booking rules.',
  keywords: [
    'Al Hijaz Tours terms',
    'Hajj Umrah booking policy UK',
    'travel terms and conditions',
    'Islamic travel booking rules',
  ],
  alternates: {
    canonical: 'https://alhijaztours.net/terms-and-conditions',
  },
};

export default function page() {
  return <TermsAndConditions />;
}
