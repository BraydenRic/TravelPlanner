/**
 * Complete list of UN-recognized countries for Driftmark.
 *
 * Used for:
 * - World map country selection
 * - Visited place entry country picker
 * - Travel stats and continent breakdowns
 *
 * totalCities: approximate count of seeded cities for each country.
 * Major countries (pop > 50M) get 10-15; smaller get 3-5.
 */

export interface CountryEntry {
  code: string
  name: string
  continent: string
  flag: string
  totalCities: number
}

export const COUNTRIES: CountryEntry[] = [
  // ─── Africa ───────────────────────────────────────────────────────────────
  { code: 'DZ', name: 'Algeria', continent: 'Africa', flag: '🇩🇿', totalCities: 8 },
  { code: 'AO', name: 'Angola', continent: 'Africa', flag: '🇦🇴', totalCities: 5 },
  { code: 'BJ', name: 'Benin', continent: 'Africa', flag: '🇧🇯', totalCities: 4 },
  { code: 'BW', name: 'Botswana', continent: 'Africa', flag: '🇧🇼', totalCities: 4 },
  { code: 'BF', name: 'Burkina Faso', continent: 'Africa', flag: '🇧🇫', totalCities: 4 },
  { code: 'BI', name: 'Burundi', continent: 'Africa', flag: '🇧🇮', totalCities: 3 },
  { code: 'CV', name: 'Cape Verde', continent: 'Africa', flag: '🇨🇻', totalCities: 3 },
  { code: 'CM', name: 'Cameroon', continent: 'Africa', flag: '🇨🇲', totalCities: 5 },
  { code: 'CF', name: 'Central African Republic', continent: 'Africa', flag: '🇨🇫', totalCities: 3 },
  { code: 'TD', name: 'Chad', continent: 'Africa', flag: '🇹🇩', totalCities: 3 },
  { code: 'KM', name: 'Comoros', continent: 'Africa', flag: '🇰🇲', totalCities: 3 },
  { code: 'CG', name: 'Republic of the Congo', continent: 'Africa', flag: '🇨🇬', totalCities: 4 },
  { code: 'CD', name: 'DR Congo', continent: 'Africa', flag: '🇨🇩', totalCities: 6 },
  { code: 'DJ', name: 'Djibouti', continent: 'Africa', flag: '🇩🇯', totalCities: 3 },
  { code: 'EG', name: 'Egypt', continent: 'Africa', flag: '🇪🇬', totalCities: 12 },
  { code: 'GQ', name: 'Equatorial Guinea', continent: 'Africa', flag: '🇬🇶', totalCities: 3 },
  { code: 'ER', name: 'Eritrea', continent: 'Africa', flag: '🇪🇷', totalCities: 3 },
  { code: 'SZ', name: 'Eswatini', continent: 'Africa', flag: '🇸🇿', totalCities: 3 },
  { code: 'ET', name: 'Ethiopia', continent: 'Africa', flag: '🇪🇹', totalCities: 7 },
  { code: 'GA', name: 'Gabon', continent: 'Africa', flag: '🇬🇦', totalCities: 4 },
  { code: 'GM', name: 'Gambia', continent: 'Africa', flag: '🇬🇲', totalCities: 3 },
  { code: 'GH', name: 'Ghana', continent: 'Africa', flag: '🇬🇭', totalCities: 6 },
  { code: 'GN', name: 'Guinea', continent: 'Africa', flag: '🇬🇳', totalCities: 4 },
  { code: 'GW', name: 'Guinea-Bissau', continent: 'Africa', flag: '🇬🇼', totalCities: 3 },
  { code: 'CI', name: "Côte d'Ivoire", continent: 'Africa', flag: '🇨🇮', totalCities: 5 },
  { code: 'KE', name: 'Kenya', continent: 'Africa', flag: '🇰🇪', totalCities: 8 },
  { code: 'LS', name: 'Lesotho', continent: 'Africa', flag: '🇱🇸', totalCities: 3 },
  { code: 'LR', name: 'Liberia', continent: 'Africa', flag: '🇱🇷', totalCities: 3 },
  { code: 'LY', name: 'Libya', continent: 'Africa', flag: '🇱🇾', totalCities: 5 },
  { code: 'MG', name: 'Madagascar', continent: 'Africa', flag: '🇲🇬', totalCities: 5 },
  { code: 'MW', name: 'Malawi', continent: 'Africa', flag: '🇲🇼', totalCities: 4 },
  { code: 'ML', name: 'Mali', continent: 'Africa', flag: '🇲🇱', totalCities: 4 },
  { code: 'MR', name: 'Mauritania', continent: 'Africa', flag: '🇲🇷', totalCities: 3 },
  { code: 'MU', name: 'Mauritius', continent: 'Africa', flag: '🇲🇺', totalCities: 4 },
  { code: 'MA', name: 'Morocco', continent: 'Africa', flag: '🇲🇦', totalCities: 10 },
  { code: 'MZ', name: 'Mozambique', continent: 'Africa', flag: '🇲🇿', totalCities: 5 },
  { code: 'NA', name: 'Namibia', continent: 'Africa', flag: '🇳🇦', totalCities: 4 },
  { code: 'NE', name: 'Niger', continent: 'Africa', flag: '🇳🇪', totalCities: 3 },
  { code: 'NG', name: 'Nigeria', continent: 'Africa', flag: '🇳🇬', totalCities: 12 },
  { code: 'RW', name: 'Rwanda', continent: 'Africa', flag: '🇷🇼', totalCities: 4 },
  { code: 'ST', name: 'São Tomé and Príncipe', continent: 'Africa', flag: '🇸🇹', totalCities: 3 },
  { code: 'SN', name: 'Senegal', continent: 'Africa', flag: '🇸🇳', totalCities: 5 },
  { code: 'SC', name: 'Seychelles', continent: 'Africa', flag: '🇸🇨', totalCities: 3 },
  { code: 'SL', name: 'Sierra Leone', continent: 'Africa', flag: '🇸🇱', totalCities: 3 },
  { code: 'SO', name: 'Somalia', continent: 'Africa', flag: '🇸🇴', totalCities: 4 },
  { code: 'ZA', name: 'South Africa', continent: 'Africa', flag: '🇿🇦', totalCities: 12 },
  { code: 'SS', name: 'South Sudan', continent: 'Africa', flag: '🇸🇸', totalCities: 3 },
  { code: 'SD', name: 'Sudan', continent: 'Africa', flag: '🇸🇩', totalCities: 5 },
  { code: 'TZ', name: 'Tanzania', continent: 'Africa', flag: '🇹🇿', totalCities: 7 },
  { code: 'TG', name: 'Togo', continent: 'Africa', flag: '🇹🇬', totalCities: 3 },
  { code: 'TN', name: 'Tunisia', continent: 'Africa', flag: '🇹🇳', totalCities: 7 },
  { code: 'UG', name: 'Uganda', continent: 'Africa', flag: '🇺🇬', totalCities: 5 },
  { code: 'ZM', name: 'Zambia', continent: 'Africa', flag: '🇿🇲', totalCities: 5 },
  { code: 'ZW', name: 'Zimbabwe', continent: 'Africa', flag: '🇿🇼', totalCities: 5 },

  // ─── Asia ─────────────────────────────────────────────────────────────────
  { code: 'AF', name: 'Afghanistan', continent: 'Asia', flag: '🇦🇫', totalCities: 5 },
  { code: 'AM', name: 'Armenia', continent: 'Asia', flag: '🇦🇲', totalCities: 4 },
  { code: 'AZ', name: 'Azerbaijan', continent: 'Asia', flag: '🇦🇿', totalCities: 5 },
  { code: 'BH', name: 'Bahrain', continent: 'Asia', flag: '🇧🇭', totalCities: 4 },
  { code: 'BD', name: 'Bangladesh', continent: 'Asia', flag: '🇧🇩', totalCities: 8 },
  { code: 'BT', name: 'Bhutan', continent: 'Asia', flag: '🇧🇹', totalCities: 3 },
  { code: 'BN', name: 'Brunei', continent: 'Asia', flag: '🇧🇳', totalCities: 3 },
  { code: 'KH', name: 'Cambodia', continent: 'Asia', flag: '🇰🇭', totalCities: 5 },
  { code: 'CN', name: 'China', continent: 'Asia', flag: '🇨🇳', totalCities: 15 },
  { code: 'CY', name: 'Cyprus', continent: 'Asia', flag: '🇨🇾', totalCities: 5 },
  { code: 'GE', name: 'Georgia', continent: 'Asia', flag: '🇬🇪', totalCities: 5 },
  { code: 'IN', name: 'India', continent: 'Asia', flag: '🇮🇳', totalCities: 15 },
  { code: 'ID', name: 'Indonesia', continent: 'Asia', flag: '🇮🇩', totalCities: 12 },
  { code: 'IR', name: 'Iran', continent: 'Asia', flag: '🇮🇷', totalCities: 10 },
  { code: 'IQ', name: 'Iraq', continent: 'Asia', flag: '🇮🇶', totalCities: 7 },
  { code: 'IL', name: 'Israel', continent: 'Asia', flag: '🇮🇱', totalCities: 7 },
  { code: 'JP', name: 'Japan', continent: 'Asia', flag: '🇯🇵', totalCities: 15 },
  { code: 'JO', name: 'Jordan', continent: 'Asia', flag: '🇯🇴', totalCities: 5 },
  { code: 'KZ', name: 'Kazakhstan', continent: 'Asia', flag: '🇰🇿', totalCities: 7 },
  { code: 'KW', name: 'Kuwait', continent: 'Asia', flag: '🇰🇼', totalCities: 4 },
  { code: 'KG', name: 'Kyrgyzstan', continent: 'Asia', flag: '🇰🇬', totalCities: 4 },
  { code: 'LA', name: 'Laos', continent: 'Asia', flag: '🇱🇦', totalCities: 4 },
  { code: 'LB', name: 'Lebanon', continent: 'Asia', flag: '🇱🇧', totalCities: 5 },
  { code: 'MY', name: 'Malaysia', continent: 'Asia', flag: '🇲🇾', totalCities: 10 },
  { code: 'MV', name: 'Maldives', continent: 'Asia', flag: '🇲🇻', totalCities: 3 },
  { code: 'MN', name: 'Mongolia', continent: 'Asia', flag: '🇲🇳', totalCities: 4 },
  { code: 'MM', name: 'Myanmar', continent: 'Asia', flag: '🇲🇲', totalCities: 6 },
  { code: 'NP', name: 'Nepal', continent: 'Asia', flag: '🇳🇵', totalCities: 5 },
  { code: 'KP', name: 'North Korea', continent: 'Asia', flag: '🇰🇵', totalCities: 4 },
  { code: 'OM', name: 'Oman', continent: 'Asia', flag: '🇴🇲', totalCities: 5 },
  { code: 'PK', name: 'Pakistan', continent: 'Asia', flag: '🇵🇰', totalCities: 10 },
  { code: 'PS', name: 'Palestine', continent: 'Asia', flag: '🇵🇸', totalCities: 4 },
  { code: 'PH', name: 'Philippines', continent: 'Asia', flag: '🇵🇭', totalCities: 10 },
  { code: 'QA', name: 'Qatar', continent: 'Asia', flag: '🇶🇦', totalCities: 4 },
  { code: 'SA', name: 'Saudi Arabia', continent: 'Asia', flag: '🇸🇦', totalCities: 10 },
  { code: 'SG', name: 'Singapore', continent: 'Asia', flag: '🇸🇬', totalCities: 5 },
  { code: 'KR', name: 'South Korea', continent: 'Asia', flag: '🇰🇷', totalCities: 12 },
  { code: 'LK', name: 'Sri Lanka', continent: 'Asia', flag: '🇱🇰', totalCities: 6 },
  { code: 'SY', name: 'Syria', continent: 'Asia', flag: '🇸🇾', totalCities: 5 },
  { code: 'TW', name: 'Taiwan', continent: 'Asia', flag: '🇹🇼', totalCities: 8 },
  { code: 'TJ', name: 'Tajikistan', continent: 'Asia', flag: '🇹🇯', totalCities: 4 },
  { code: 'TH', name: 'Thailand', continent: 'Asia', flag: '🇹🇭', totalCities: 12 },
  { code: 'TL', name: 'Timor-Leste', continent: 'Asia', flag: '🇹🇱', totalCities: 3 },
  { code: 'TR', name: 'Turkey', continent: 'Asia', flag: '🇹🇷', totalCities: 12 },
  { code: 'TM', name: 'Turkmenistan', continent: 'Asia', flag: '🇹🇲', totalCities: 4 },
  { code: 'AE', name: 'United Arab Emirates', continent: 'Asia', flag: '🇦🇪', totalCities: 7 },
  { code: 'UZ', name: 'Uzbekistan', continent: 'Asia', flag: '🇺🇿', totalCities: 6 },
  { code: 'VN', name: 'Vietnam', continent: 'Asia', flag: '🇻🇳', totalCities: 10 },
  { code: 'YE', name: 'Yemen', continent: 'Asia', flag: '🇾🇪', totalCities: 5 },

  // ─── Europe ───────────────────────────────────────────────────────────────
  { code: 'AL', name: 'Albania', continent: 'Europe', flag: '🇦🇱', totalCities: 5 },
  { code: 'AD', name: 'Andorra', continent: 'Europe', flag: '🇦🇩', totalCities: 3 },
  { code: 'AT', name: 'Austria', continent: 'Europe', flag: '🇦🇹', totalCities: 8 },
  { code: 'BY', name: 'Belarus', continent: 'Europe', flag: '🇧🇾', totalCities: 6 },
  { code: 'BE', name: 'Belgium', continent: 'Europe', flag: '🇧🇪', totalCities: 8 },
  { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'Europe', flag: '🇧🇦', totalCities: 5 },
  { code: 'BG', name: 'Bulgaria', continent: 'Europe', flag: '🇧🇬', totalCities: 7 },
  { code: 'HR', name: 'Croatia', continent: 'Europe', flag: '🇭🇷', totalCities: 7 },
  { code: 'CZ', name: 'Czech Republic', continent: 'Europe', flag: '🇨🇿', totalCities: 8 },
  { code: 'DK', name: 'Denmark', continent: 'Europe', flag: '🇩🇰', totalCities: 7 },
  { code: 'EE', name: 'Estonia', continent: 'Europe', flag: '🇪🇪', totalCities: 5 },
  { code: 'FI', name: 'Finland', continent: 'Europe', flag: '🇫🇮', totalCities: 7 },
  { code: 'FR', name: 'France', continent: 'Europe', flag: '🇫🇷', totalCities: 15 },
  { code: 'DE', name: 'Germany', continent: 'Europe', flag: '🇩🇪', totalCities: 15 },
  { code: 'GR', name: 'Greece', continent: 'Europe', flag: '🇬🇷', totalCities: 10 },
  { code: 'HU', name: 'Hungary', continent: 'Europe', flag: '🇭🇺', totalCities: 7 },
  { code: 'IS', name: 'Iceland', continent: 'Europe', flag: '🇮🇸', totalCities: 5 },
  { code: 'IE', name: 'Ireland', continent: 'Europe', flag: '🇮🇪', totalCities: 6 },
  { code: 'IT', name: 'Italy', continent: 'Europe', flag: '🇮🇹', totalCities: 15 },
  { code: 'XK', name: 'Kosovo', continent: 'Europe', flag: '🇽🇰', totalCities: 4 },
  { code: 'LV', name: 'Latvia', continent: 'Europe', flag: '🇱🇻', totalCities: 5 },
  { code: 'LI', name: 'Liechtenstein', continent: 'Europe', flag: '🇱🇮', totalCities: 3 },
  { code: 'LT', name: 'Lithuania', continent: 'Europe', flag: '🇱🇹', totalCities: 5 },
  { code: 'LU', name: 'Luxembourg', continent: 'Europe', flag: '🇱🇺', totalCities: 4 },
  { code: 'MT', name: 'Malta', continent: 'Europe', flag: '🇲🇹', totalCities: 4 },
  { code: 'MD', name: 'Moldova', continent: 'Europe', flag: '🇲🇩', totalCities: 4 },
  { code: 'MC', name: 'Monaco', continent: 'Europe', flag: '🇲🇨', totalCities: 3 },
  { code: 'ME', name: 'Montenegro', continent: 'Europe', flag: '🇲🇪', totalCities: 5 },
  { code: 'NL', name: 'Netherlands', continent: 'Europe', flag: '🇳🇱', totalCities: 10 },
  { code: 'MK', name: 'North Macedonia', continent: 'Europe', flag: '🇲🇰', totalCities: 5 },
  { code: 'NO', name: 'Norway', continent: 'Europe', flag: '🇳🇴', totalCities: 8 },
  { code: 'PL', name: 'Poland', continent: 'Europe', flag: '🇵🇱', totalCities: 12 },
  { code: 'PT', name: 'Portugal', continent: 'Europe', flag: '🇵🇹', totalCities: 8 },
  { code: 'RO', name: 'Romania', continent: 'Europe', flag: '🇷🇴', totalCities: 8 },
  { code: 'RU', name: 'Russia', continent: 'Europe', flag: '🇷🇺', totalCities: 15 },
  { code: 'SM', name: 'San Marino', continent: 'Europe', flag: '🇸🇲', totalCities: 3 },
  { code: 'RS', name: 'Serbia', continent: 'Europe', flag: '🇷🇸', totalCities: 6 },
  { code: 'SK', name: 'Slovakia', continent: 'Europe', flag: '🇸🇰', totalCities: 6 },
  { code: 'SI', name: 'Slovenia', continent: 'Europe', flag: '🇸🇮', totalCities: 5 },
  { code: 'ES', name: 'Spain', continent: 'Europe', flag: '🇪🇸', totalCities: 15 },
  { code: 'SE', name: 'Sweden', continent: 'Europe', flag: '🇸🇪', totalCities: 10 },
  { code: 'CH', name: 'Switzerland', continent: 'Europe', flag: '🇨🇭', totalCities: 8 },
  { code: 'UA', name: 'Ukraine', continent: 'Europe', flag: '🇺🇦', totalCities: 10 },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe', flag: '🇬🇧', totalCities: 15 },
  { code: 'VA', name: 'Vatican City', continent: 'Europe', flag: '🇻🇦', totalCities: 3 },

  // ─── North America ────────────────────────────────────────────────────────
  { code: 'AG', name: 'Antigua and Barbuda', continent: 'North America', flag: '🇦🇬', totalCities: 3 },
  { code: 'BS', name: 'Bahamas', continent: 'North America', flag: '🇧🇸', totalCities: 4 },
  { code: 'BB', name: 'Barbados', continent: 'North America', flag: '🇧🇧', totalCities: 3 },
  { code: 'BZ', name: 'Belize', continent: 'North America', flag: '🇧🇿', totalCities: 4 },
  { code: 'CA', name: 'Canada', continent: 'North America', flag: '🇨🇦', totalCities: 15 },
  { code: 'GL', name: 'Greenland', continent: 'North America', flag: '🇬🇱', totalCities: 3 },
  { code: 'CR', name: 'Costa Rica', continent: 'North America', flag: '🇨🇷', totalCities: 5 },
  { code: 'CU', name: 'Cuba', continent: 'North America', flag: '🇨🇺', totalCities: 6 },
  { code: 'DM', name: 'Dominica', continent: 'North America', flag: '🇩🇲', totalCities: 3 },
  { code: 'DO', name: 'Dominican Republic', continent: 'North America', flag: '🇩🇴', totalCities: 6 },
  { code: 'SV', name: 'El Salvador', continent: 'North America', flag: '🇸🇻', totalCities: 4 },
  { code: 'GD', name: 'Grenada', continent: 'North America', flag: '🇬🇩', totalCities: 3 },
  { code: 'GT', name: 'Guatemala', continent: 'North America', flag: '🇬🇹', totalCities: 5 },
  { code: 'HT', name: 'Haiti', continent: 'North America', flag: '🇭🇹', totalCities: 4 },
  { code: 'HN', name: 'Honduras', continent: 'North America', flag: '🇭🇳', totalCities: 5 },
  { code: 'JM', name: 'Jamaica', continent: 'North America', flag: '🇯🇲', totalCities: 5 },
  { code: 'MX', name: 'Mexico', continent: 'North America', flag: '🇲🇽', totalCities: 15 },
  { code: 'NI', name: 'Nicaragua', continent: 'North America', flag: '🇳🇮', totalCities: 4 },
  { code: 'PA', name: 'Panama', continent: 'North America', flag: '🇵🇦', totalCities: 5 },
  { code: 'KN', name: 'Saint Kitts and Nevis', continent: 'North America', flag: '🇰🇳', totalCities: 3 },
  { code: 'LC', name: 'Saint Lucia', continent: 'North America', flag: '🇱🇨', totalCities: 3 },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', continent: 'North America', flag: '🇻🇨', totalCities: 3 },
  { code: 'TT', name: 'Trinidad and Tobago', continent: 'North America', flag: '🇹🇹', totalCities: 4 },
  { code: 'US', name: 'United States', continent: 'North America', flag: '🇺🇸', totalCities: 15 },

  // ─── South America ────────────────────────────────────────────────────────
  { code: 'AR', name: 'Argentina', continent: 'South America', flag: '🇦🇷', totalCities: 12 },
  { code: 'BO', name: 'Bolivia', continent: 'South America', flag: '🇧🇴', totalCities: 6 },
  { code: 'BR', name: 'Brazil', continent: 'South America', flag: '🇧🇷', totalCities: 15 },
  { code: 'CL', name: 'Chile', continent: 'South America', flag: '🇨🇱', totalCities: 8 },
  { code: 'CO', name: 'Colombia', continent: 'South America', flag: '🇨🇴', totalCities: 10 },
  { code: 'EC', name: 'Ecuador', continent: 'South America', flag: '🇪🇨', totalCities: 6 },
  { code: 'GY', name: 'Guyana', continent: 'South America', flag: '🇬🇾', totalCities: 3 },
  { code: 'PY', name: 'Paraguay', continent: 'South America', flag: '🇵🇾', totalCities: 5 },
  { code: 'PE', name: 'Peru', continent: 'South America', flag: '🇵🇪', totalCities: 8 },
  { code: 'SR', name: 'Suriname', continent: 'South America', flag: '🇸🇷', totalCities: 3 },
  { code: 'UY', name: 'Uruguay', continent: 'South America', flag: '🇺🇾', totalCities: 5 },
  { code: 'VE', name: 'Venezuela', continent: 'South America', flag: '🇻🇪', totalCities: 8 },

  // ─── Oceania ──────────────────────────────────────────────────────────────
  { code: 'AU', name: 'Australia', continent: 'Oceania', flag: '🇦🇺', totalCities: 12 },
  { code: 'FJ', name: 'Fiji', continent: 'Oceania', flag: '🇫🇯', totalCities: 4 },
  { code: 'KI', name: 'Kiribati', continent: 'Oceania', flag: '🇰🇮', totalCities: 3 },
  { code: 'MH', name: 'Marshall Islands', continent: 'Oceania', flag: '🇲🇭', totalCities: 3 },
  { code: 'FM', name: 'Micronesia', continent: 'Oceania', flag: '🇫🇲', totalCities: 3 },
  { code: 'NR', name: 'Nauru', continent: 'Oceania', flag: '🇳🇷', totalCities: 3 },
  { code: 'NZ', name: 'New Zealand', continent: 'Oceania', flag: '🇳🇿', totalCities: 8 },
  { code: 'PW', name: 'Palau', continent: 'Oceania', flag: '🇵🇼', totalCities: 3 },
  { code: 'PG', name: 'Papua New Guinea', continent: 'Oceania', flag: '🇵🇬', totalCities: 4 },
  { code: 'WS', name: 'Samoa', continent: 'Oceania', flag: '🇼🇸', totalCities: 3 },
  { code: 'SB', name: 'Solomon Islands', continent: 'Oceania', flag: '🇸🇧', totalCities: 3 },
  { code: 'TO', name: 'Tonga', continent: 'Oceania', flag: '🇹🇴', totalCities: 3 },
  { code: 'TV', name: 'Tuvalu', continent: 'Oceania', flag: '🇹🇻', totalCities: 3 },
  { code: 'VU', name: 'Vanuatu', continent: 'Oceania', flag: '🇻🇺', totalCities: 3 },
]

/** Total country count — used for world percentage calculations. */
export const TOTAL_COUNTRIES = COUNTRIES.length

/** Look up a country entry by ISO 3166-1 alpha-2 code. */
export function getCountryByCode(code: string): CountryEntry | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

/** Get all countries for a given continent. */
export function getCountriesByContinent(continent: string): CountryEntry[] {
  return COUNTRIES.filter((c) => c.continent === continent)
}

/** All unique continent names in the dataset. */
export const CONTINENTS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
] as const

export type ContinentName = (typeof CONTINENTS)[number]
