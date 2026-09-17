import type { Vehicle } from '@/types'

// Professional Unsplash photos — bus/coach/transport
export const vehicles: Vehicle[] = [
  {
    id: 'hiace',
    name: 'Toyota HiAce',
    slug: 'toyota-hiace',
    capacity: 14,
    category: 'Standard',
    bestFor: 'Airport Transfers · Executive Teams · Short Routes',
    imageUrl: '/vehicles/hiace.jpg',
    features: ['Air Conditioning', 'Tinted Windows', 'Professional Driver', 'GPS Tracked'],
    available: true,
    editorialStory: 'The Toyota HiAce is the backbone of Nigerian corporate mobility. Compact enough to navigate busy city centres yet spacious enough to comfortably seat 14 passengers, it is the definitive choice for daily staff movement, quick airport transfers, and short intercity routes. It balances supreme reliability with cost-effectiveness without compromising on passenger safety.',
    comfortRating: 'Standard',
    luggageSpace: 'Moderate (Suitable for day trips and cabin baggage)',
    airConditioning: 'Dual-Zone Air Conditioning',
    recommendedFor: ['Corporate Staff Transportation', 'Airport Transfers', 'Short Excursions'],
    gallery: [
      '/vehicles/hiace.jpg'
    ]
  },
  {
    id: 'coaster',
    name: 'Toyota Coaster',
    slug: 'toyota-coaster',
    capacity: 30,
    category: 'Executive',
    bestFor: 'Corporate Events · School Runs · Group Travel',
    imageUrl: '/vehicles/coaster.jpg',
    features: ['Air Conditioning', 'Reclining Seats', 'Professional Driver', 'GPS Tracked'],
    available: true,
    editorialStory: 'The benchmark for medium-scale group transportation. The Toyota Coaster delivers an executive travel experience for up to 30 passengers. With elevated seating, panoramic windows, and robust air conditioning designed for the Nigerian climate, it is the preferred vehicle for school fleets, factory staff, and corporate event shuttles.',
    comfortRating: 'Executive',
    luggageSpace: 'Generous (Rear compartment + overhead parcel racks)',
    airConditioning: 'High-Capacity Climate Control',
    recommendedFor: ['Corporate Staff Transportation', 'School Excursions', 'Weddings', 'Conferences'],
    gallery: [
      '/vehicles/coaster.jpg'
    ]
  },
  {
    id: 'suv',
    name: 'Executive SUV',
    slug: 'executive-suv',
    capacity: 4,
    category: 'Luxury',
    bestFor: 'VIP Transport · Executive Travel · Airport Pickups',
    imageUrl: '/vehicles/suv.png',
    features: ['Leather Interior', 'Air Conditioning', 'Professional Driver', 'Privacy Glass'],
    available: true,
    editorialStory: 'Commanding presence meets unparalleled comfort. Our Executive SUVs are reserved for VIPs, C-suite executives, and high-profile delegates requiring secure, discreet, and deeply comfortable transportation. With premium leather interiors, advanced sound insulation, and privacy glass, it provides a quiet sanctuary on the move.',
    comfortRating: 'Ultra Luxury',
    luggageSpace: 'Standard (Large boot for multiple suitcases)',
    airConditioning: 'Multi-Zone Automatic Climate Control',
    recommendedFor: ['VIP Transport', 'Airport Pickups', 'Executive Travel', 'Weddings'],
    gallery: [
      '/vehicles/suv.png'
    ]
  },

  {
    id: 'sedan',
    name: 'Executive Sedan',
    slug: 'executive-sedan',
    capacity: 3,
    category: 'Luxury',
    bestFor: 'VIP Transport · Executive Travel',
    imageUrl: '/vehicles/Sedan.jpeg',
    features: ['Leather Interior', 'Air Conditioning', 'Professional Driver', 'Privacy Glass'],
    available: true,
    editorialStory: 'Sleek and discreet transportation for executives and VIPs.',
    comfortRating: 'Ultra Luxury',
    luggageSpace: 'Standard',
    airConditioning: 'Multi-Zone Automatic Climate Control',
    recommendedFor: ['VIP Transport', 'Airport Pickups'],
    gallery: ['/vehicles/Sedan.jpeg']
  }
]
