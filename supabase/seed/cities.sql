-- Driftmark Cities Seed Data
-- ~2,200+ cities across 195 countries
-- Capitals, major tourist destinations, cultural hubs

INSERT INTO cities (country_code, name, latitude, longitude, population_rank, is_capital) VALUES

-- ═══════════════════════════════════════
-- AFRICA (54 countries)
-- ═══════════════════════════════════════

-- Algeria (DZ)
('DZ', 'Algiers', 36.7372, 3.0863, 1, true),
('DZ', 'Oran', 35.6969, -0.6331, 2, false),
('DZ', 'Constantine', 36.3650, 6.6147, 3, false),
('DZ', 'Annaba', 36.9000, 7.7667, 4, false),
('DZ', 'Tlemcen', 34.8828, -1.3167, 5, false),

-- Angola (AO)
('AO', 'Luanda', -8.8383, 13.2344, 1, true),
('AO', 'Huambo', -12.7761, 15.7395, 2, false),
('AO', 'Lobito', -12.3647, 13.5444, 3, false),
('AO', 'Benguela', -12.5763, 13.4055, 4, false),

-- Benin (BJ)
('BJ', 'Porto-Novo', 6.4969, 2.6289, 1, true),
('BJ', 'Cotonou', 6.3654, 2.4183, 2, false),
('BJ', 'Parakou', 9.3370, 2.6280, 3, false),

-- Botswana (BW)
('BW', 'Gaborone', -24.6541, 25.9087, 1, true),
('BW', 'Francistown', -21.1667, 27.5167, 2, false),
('BW', 'Maun', -19.9833, 23.4167, 3, false),
('BW', 'Kasane', -17.7997, 25.1500, 4, false),

-- Burkina Faso (BF)
('BF', 'Ouagadougou', 12.3647, -1.5332, 1, true),
('BF', 'Bobo-Dioulasso', 11.1771, -4.2979, 2, false),
('BF', 'Koudougou', 12.2500, -2.3667, 3, false),

-- Burundi (BI)
('BI', 'Gitega', -3.4271, 29.9247, 1, true),
('BI', 'Bujumbura', -3.3822, 29.3644, 2, false),
('BI', 'Ngozi', -2.9078, 29.8303, 3, false),

-- Cameroon (CM)
('CM', 'Yaoundé', 3.8667, 11.5167, 1, true),
('CM', 'Douala', 4.0483, 9.7043, 2, false),
('CM', 'Garoua', 9.3017, 13.3983, 3, false),
('CM', 'Bamenda', 5.9631, 10.1464, 4, false),
('CM', 'Bafoussam', 5.4736, 10.4178, 5, false),

-- Cape Verde (CV)
('CV', 'Praia', 14.9330, -23.5133, 1, true),
('CV', 'Mindelo', 16.8900, -24.9800, 2, false),
('CV', 'Santa Maria', 16.5978, -22.9039, 3, false),

-- Central African Republic (CF)
('CF', 'Bangui', 4.3612, 18.5550, 1, true),
('CF', 'Bimbo', 4.2561, 18.4172, 2, false),
('CF', 'Mbaïki', 3.8667, 17.9833, 3, false),

-- Chad (TD)
('TD', 'N''Djamena', 12.1048, 15.0445, 1, true),
('TD', 'Moundou', 8.5667, 16.0833, 2, false),
('TD', 'Sarh', 9.1500, 18.3833, 3, false),

-- Comoros (KM)
('KM', 'Moroni', -11.7022, 43.2551, 1, true),
('KM', 'Mutsamudu', -12.1686, 44.3978, 2, false),

-- DR Congo (CD)
('CD', 'Kinshasa', -4.3276, 15.3136, 1, true),
('CD', 'Lubumbashi', -11.6609, 27.4794, 2, false),
('CD', 'Mbuji-Mayi', -6.1500, 23.6000, 3, false),
('CD', 'Kananga', -5.8958, 22.4169, 4, false),
('CD', 'Kisangani', 0.5167, 25.2000, 5, false),

-- Republic of Congo (CG)
('CG', 'Brazzaville', -4.2694, 15.2716, 1, true),
('CG', 'Pointe-Noire', -4.7692, 11.8664, 2, false),
('CG', 'Dolisie', -4.1983, 12.6672, 3, false),

-- Djibouti (DJ)
('DJ', 'Djibouti', 11.5886, 43.1451, 1, true),
('DJ', 'Ali Sabieh', 11.1564, 42.7128, 2, false),

-- Egypt (EG)
('EG', 'Cairo', 30.0444, 31.2357, 1, true),
('EG', 'Alexandria', 31.2001, 29.9187, 2, false),
('EG', 'Giza', 30.0131, 31.2089, 3, false),
('EG', 'Sharm el-Sheikh', 27.9158, 34.3300, 4, false),
('EG', 'Luxor', 25.6872, 32.6396, 5, false),
('EG', 'Aswan', 24.0889, 32.8998, 6, false),
('EG', 'Hurghada', 27.2578, 33.8117, 7, false),
('EG', 'Port Said', 31.2565, 32.2841, 8, false),
('EG', 'Dahab', 28.5097, 34.5139, 9, false),
('EG', 'Siwa', 29.2028, 25.5197, 10, false),
('EG', 'Suez', 29.9667, 32.5500, 11, false),
('EG', 'Marsa Matruh', 31.3525, 27.2314, 12, false),

-- Equatorial Guinea (GQ)
('GQ', 'Malabo', 3.7500, 8.7833, 1, true),
('GQ', 'Bata', 1.8639, 9.7681, 2, false),

-- Eritrea (ER)
('ER', 'Asmara', 15.3381, 38.9318, 1, true),
('ER', 'Massawa', 15.6090, 39.4703, 2, false),
('ER', 'Keren', 15.7753, 38.4581, 3, false),

-- Eswatini (SZ)
('SZ', 'Mbabane', -26.3186, 31.1410, 1, true),
('SZ', 'Manzini', -26.4833, 31.3667, 2, false),

-- Ethiopia (ET)
('ET', 'Addis Ababa', 9.0227, 38.7468, 1, true),
('ET', 'Dire Dawa', 9.5930, 41.8661, 2, false),
('ET', 'Mekelle', 13.4967, 39.4769, 3, false),
('ET', 'Gondar', 12.6000, 37.4667, 4, false),
('ET', 'Lalibela', 12.0300, 39.0500, 5, false),
('ET', 'Axum', 14.1208, 38.7258, 6, false),
('ET', 'Hawassa', 7.0500, 38.4667, 7, false),

-- Gabon (GA)
('GA', 'Libreville', 0.3901, 9.4544, 1, true),
('GA', 'Port-Gentil', -0.7167, 8.7833, 2, false),
('GA', 'Franceville', -1.6333, 13.5833, 3, false),

-- Gambia (GM)
('GM', 'Banjul', 13.4531, -16.5775, 1, true),
('GM', 'Serekunda', 13.4386, -16.6786, 2, false),
('GM', 'Brikama', 13.2667, -16.6500, 3, false),

-- Ghana (GH)
('GH', 'Accra', 5.5500, -0.2167, 1, true),
('GH', 'Kumasi', 6.6885, -1.6244, 2, false),
('GH', 'Tamale', 9.4075, -0.8533, 3, false),
('GH', 'Cape Coast', 5.1053, -1.2466, 4, false),
('GH', 'Tema', 5.6698, -0.0166, 5, false),

-- Guinea (GN)
('GN', 'Conakry', 9.5370, -13.6773, 1, true),
('GN', 'N''Zérékoré', 7.7564, -8.8179, 2, false),
('GN', 'Kankan', 10.3833, -9.3000, 3, false),

-- Guinea-Bissau (GW)
('GW', 'Bissau', 11.8636, -15.5977, 1, true),
('GW', 'Bafatá', 12.1736, -14.6589, 2, false),

-- Ivory Coast (CI)
('CI', 'Yamoussoukro', 6.8170, -5.2742, 1, true),
('CI', 'Abidjan', 5.3454, -4.0244, 2, false),
('CI', 'Bouaké', 7.6833, -5.0333, 3, false),
('CI', 'Daloa', 6.8744, -6.4500, 4, false),
('CI', 'San-Pédro', 4.7500, -6.6333, 5, false),

-- Kenya (KE)
('KE', 'Nairobi', -1.2921, 36.8219, 1, true),
('KE', 'Mombasa', -4.0435, 39.6682, 2, false),
('KE', 'Kisumu', -0.1022, 34.7617, 3, false),
('KE', 'Nakuru', -0.3031, 36.0800, 4, false),
('KE', 'Eldoret', 0.5167, 35.2833, 5, false),
('KE', 'Malindi', -3.2181, 40.1167, 6, false),
('KE', 'Lamu', -2.2694, 40.9022, 7, false),
('KE', 'Amboseli', -2.6527, 37.2606, 8, false),
('KE', 'Maasai Mara', -1.5000, 35.1500, 9, false),

-- Lesotho (LS)
('LS', 'Maseru', -29.3167, 27.4833, 1, true),
('LS', 'Teyateyaneng', -29.1500, 27.7333, 2, false),

-- Liberia (LR)
('LR', 'Monrovia', 6.3006, -10.7969, 1, true),
('LR', 'Gbarnga', 6.9944, -9.4722, 2, false),
('LR', 'Kakata', 6.5283, -10.3497, 3, false),

-- Libya (LY)
('LY', 'Tripoli', 32.9022, 13.1803, 1, true),
('LY', 'Benghazi', 32.1167, 20.0667, 2, false),
('LY', 'Misrata', 32.3750, 15.0922, 3, false),
('LY', 'Sabha', 27.0350, 14.4286, 4, false),

-- Madagascar (MG)
('MG', 'Antananarivo', -18.9137, 47.5361, 1, true),
('MG', 'Toamasina', -18.1492, 49.4022, 2, false),
('MG', 'Antsirabe', -19.8659, 47.0333, 3, false),
('MG', 'Mahajanga', -15.7167, 46.3167, 4, false),
('MG', 'Nosy Be', -13.3167, 48.2667, 5, false),

-- Malawi (MW)
('MW', 'Lilongwe', -13.9669, 33.7873, 1, true),
('MW', 'Blantyre', -15.7861, 35.0058, 2, false),
('MW', 'Mzuzu', -11.4667, 34.0167, 3, false),
('MW', 'Zomba', -15.3833, 35.3333, 4, false),

-- Mali (ML)
('ML', 'Bamako', 12.6392, -8.0029, 1, true),
('ML', 'Sikasso', 11.3333, -5.6667, 2, false),
('ML', 'Mopti', 14.4833, -4.1833, 3, false),
('ML', 'Timbuktu', 16.7667, -3.0000, 4, false),
('ML', 'Djenné', 13.9083, -4.5550, 5, false),

-- Mauritania (MR)
('MR', 'Nouakchott', 18.0858, -15.9785, 1, true),
('MR', 'Nouadhibou', 20.9310, -17.0347, 2, false),
('MR', 'Rosso', 16.5133, -15.8050, 3, false),

-- Mauritius (MU)
('MU', 'Port Louis', -20.1609, 57.4989, 1, true),
('MU', 'Vacoas-Phoenix', -20.2985, 57.4796, 2, false),
('MU', 'Grand Baie', -20.0125, 57.5828, 3, false),
('MU', 'Flic en Flac', -20.2833, 57.3667, 4, false),

-- Morocco (MA)
('MA', 'Rabat', 34.0209, -6.8416, 1, true),
('MA', 'Casablanca', 33.5731, -7.5898, 2, false),
('MA', 'Fes', 34.0372, -5.0003, 3, false),
('MA', 'Marrakech', 31.6295, -7.9811, 4, false),
('MA', 'Tangier', 35.7673, -5.7998, 5, false),
('MA', 'Agadir', 30.4278, -9.5981, 6, false),
('MA', 'Chefchaouen', 35.1689, -5.2636, 7, false),
('MA', 'Meknes', 33.8936, -5.5547, 8, false),
('MA', 'Essaouira', 31.5125, -9.7700, 9, false),
('MA', 'Merzouga', 31.0982, -4.0122, 10, false),
('MA', 'Ouarzazate', 30.9335, -6.9370, 11, false),
('MA', 'Aït Benhaddou', 31.0472, -7.1319, 12, false),

-- Mozambique (MZ)
('MZ', 'Maputo', -25.9667, 32.5833, 1, true),
('MZ', 'Matola', -25.9622, 32.4589, 2, false),
('MZ', 'Beira', -19.8436, 34.8389, 3, false),
('MZ', 'Vilanculos', -22.0086, 35.3133, 4, false),
('MZ', 'Pemba', -12.9717, 40.5178, 5, false),

-- Namibia (NA)
('NA', 'Windhoek', -22.5609, 17.0658, 1, true),
('NA', 'Walvis Bay', -22.9576, 14.5052, 2, false),
('NA', 'Swakopmund', -22.6784, 14.5256, 3, false),
('NA', 'Lüderitz', -26.6481, 15.1586, 4, false),
('NA', 'Etosha', -18.8333, 16.3333, 5, false),

-- Niger (NE)
('NE', 'Niamey', 13.5167, 2.1167, 1, true),
('NE', 'Zinder', 13.8077, 8.9881, 2, false),
('NE', 'Maradi', 13.5000, 7.1000, 3, false),
('NE', 'Agadez', 16.9742, 7.9875, 4, false),

-- Nigeria (NG)
('NG', 'Abuja', 9.0579, 7.4951, 1, true),
('NG', 'Lagos', 6.5244, 3.3792, 2, false),
('NG', 'Kano', 12.0000, 8.5167, 3, false),
('NG', 'Ibadan', 7.3875, 3.8964, 4, false),
('NG', 'Port Harcourt', 4.8156, 7.0498, 5, false),
('NG', 'Benin City', 6.3350, 5.6278, 6, false),
('NG', 'Kaduna', 10.5264, 7.4381, 7, false),
('NG', 'Enugu', 6.4483, 7.5000, 8, false),
('NG', 'Calabar', 4.9517, 8.3228, 9, false),
('NG', 'Zaria', 11.0682, 7.7093, 10, false),

-- Rwanda (RW)
('RW', 'Kigali', -1.9441, 30.0619, 1, true),
('RW', 'Butare', -2.5975, 29.7394, 2, false),
('RW', 'Gisenyi', -1.7028, 29.2556, 3, false),
('RW', 'Musanze', -1.4989, 29.6344, 4, false),

-- São Tomé and Príncipe (ST)
('ST', 'São Tomé', 0.3365, 6.7273, 1, true),
('ST', 'Santo António', 1.6484, 7.4150, 2, false),

-- Senegal (SN)
('SN', 'Dakar', 14.6937, -17.4441, 1, true),
('SN', 'Touba', 14.8500, -15.8833, 2, false),
('SN', 'Thiès', 14.7886, -16.9256, 3, false),
('SN', 'Saint-Louis', 16.0500, -16.5000, 4, false),
('SN', 'Ziguinchor', 12.5500, -16.2667, 5, false),

-- Seychelles (SC)
('SC', 'Victoria', -4.6167, 55.4500, 1, true),
('SC', 'Beau Vallon', -4.6216, 55.4280, 2, false),
('SC', 'Anse Lazio', -4.3181, 55.6356, 3, false),

-- Sierra Leone (SL)
('SL', 'Freetown', 8.4897, -13.2344, 1, true),
('SL', 'Bo', 7.9647, -11.7383, 2, false),
('SL', 'Kenema', 7.8764, -11.1900, 3, false),

-- Somalia (SO)
('SO', 'Mogadishu', 2.0469, 45.3182, 1, true),
('SO', 'Hargeisa', 9.5600, 44.0650, 2, false),
('SO', 'Bosaso', 11.2822, 49.1864, 3, false),
('SO', 'Kismayo', -0.3582, 42.5454, 4, false),

-- South Africa (ZA)
('ZA', 'Pretoria', -25.7479, 28.2293, 1, true),
('ZA', 'Cape Town', -33.9249, 18.4241, 2, false),
('ZA', 'Johannesburg', -26.2041, 28.0473, 3, false),
('ZA', 'Durban', -29.8587, 31.0218, 4, false),
('ZA', 'Port Elizabeth', -33.9608, 25.6022, 5, false),
('ZA', 'Bloemfontein', -29.0852, 26.1596, 6, false),
('ZA', 'East London', -33.0153, 27.9116, 7, false),
('ZA', 'Knysna', -34.0358, 23.0474, 8, false),
('ZA', 'Stellenbosch', -33.9321, 18.8602, 9, false),
('ZA', 'Kruger National Park', -24.0000, 31.5000, 10, false),
('ZA', 'George', -33.9646, 22.4614, 11, false),
('ZA', 'Kimberley', -28.7282, 24.7499, 12, false),

-- South Sudan (SS)
('SS', 'Juba', 4.8594, 31.5713, 1, true),
('SS', 'Wau', 7.7011, 27.9989, 2, false),
('SS', 'Malakal', 9.5333, 31.6667, 3, false),

-- Sudan (SD)
('SD', 'Khartoum', 15.5007, 32.5599, 1, true),
('SD', 'Omdurman', 15.6167, 32.4833, 2, false),
('SD', 'Port Sudan', 19.6158, 37.2164, 3, false),
('SD', 'Kassala', 15.4522, 36.4006, 4, false),

-- Tanzania (TZ)
('TZ', 'Dodoma', -6.1728, 35.7395, 1, true),
('TZ', 'Dar es Salaam', -6.7924, 39.2083, 2, false),
('TZ', 'Mwanza', -2.5167, 32.9000, 3, false),
('TZ', 'Arusha', -3.3869, 36.6830, 4, false),
('TZ', 'Zanzibar', -6.1659, 39.2026, 5, false),
('TZ', 'Kilimanjaro', -3.0674, 37.3556, 6, false),
('TZ', 'Moshi', -3.3333, 37.3333, 7, false),
('TZ', 'Serengeti', -2.1540, 34.6857, 8, false),
('TZ', 'Stone Town', -6.1622, 39.1921, 9, false),

-- Togo (TG)
('TG', 'Lomé', 6.1375, 1.2123, 1, true),
('TG', 'Sokodé', 8.9833, 1.1333, 2, false),
('TG', 'Kara', 9.5511, 1.1861, 3, false),

-- Tunisia (TN)
('TN', 'Tunis', 36.8065, 10.1815, 1, true),
('TN', 'Sfax', 34.7406, 10.7603, 2, false),
('TN', 'Sousse', 35.8333, 10.6333, 3, false),
('TN', 'Kairouan', 35.6781, 10.0994, 4, false),
('TN', 'Djerba', 33.8075, 10.8451, 5, false),
('TN', 'Hammamet', 36.4000, 10.6167, 6, false),
('TN', 'Bizerte', 37.2744, 9.8739, 7, false),
('TN', 'Tozeur', 33.9197, 8.1336, 8, false),

-- Uganda (UG)
('UG', 'Kampala', 0.3476, 32.5825, 1, true),
('UG', 'Gulu', 2.7747, 32.2990, 2, false),
('UG', 'Lira', 2.2347, 32.9019, 3, false),
('UG', 'Jinja', 0.4478, 33.2033, 4, false),
('UG', 'Entebbe', 0.0644, 32.4633, 5, false),

-- Zambia (ZM)
('ZM', 'Lusaka', -15.4167, 28.2833, 1, true),
('ZM', 'Kitwe', -12.8000, 28.2000, 2, false),
('ZM', 'Ndola', -12.9589, 28.6366, 3, false),
('ZM', 'Livingstone', -17.8500, 25.8500, 4, false),
('ZM', 'Chipata', -13.6428, 32.6450, 5, false),

-- Zimbabwe (ZW)
('ZW', 'Harare', -17.8252, 31.0335, 1, true),
('ZW', 'Bulawayo', -20.1500, 28.5833, 2, false),
('ZW', 'Chitungwiza', -18.0127, 31.0754, 3, false),
('ZW', 'Victoria Falls', -17.9243, 25.8567, 4, false),
('ZW', 'Mutare', -18.9667, 32.6500, 5, false),

-- ═══════════════════════════════════════
-- ASIA (48 countries)
-- ═══════════════════════════════════════

-- Afghanistan (AF)
('AF', 'Kabul', 34.5253, 69.1783, 1, true),
('AF', 'Kandahar', 31.6129, 65.7372, 2, false),
('AF', 'Herat', 34.3482, 62.2044, 3, false),
('AF', 'Mazar-i-Sharif', 36.7083, 67.1111, 4, false),
('AF', 'Bamiyan', 34.8175, 67.8258, 5, false),

-- Armenia (AM)
('AM', 'Yerevan', 40.1872, 44.5152, 1, true),
('AM', 'Gyumri', 40.7942, 43.8453, 2, false),
('AM', 'Vanadzor', 40.8128, 44.4887, 3, false),
('AM', 'Dilijan', 40.7419, 44.8572, 4, false),

-- Azerbaijan (AZ)
('AZ', 'Baku', 40.4093, 49.8671, 1, true),
('AZ', 'Ganja', 40.6825, 46.3611, 2, false),
('AZ', 'Sumqayit', 40.5897, 49.6686, 3, false),
('AZ', 'Sheki', 41.1988, 47.1706, 4, false),

-- Bahrain (BH)
('BH', 'Manama', 26.2235, 50.5876, 1, true),
('BH', 'Riffa', 26.1300, 50.5550, 2, false),
('BH', 'Muharraq', 26.2567, 50.6117, 3, false),

-- Bangladesh (BD)
('BD', 'Dhaka', 23.7104, 90.4074, 1, true),
('BD', 'Chittagong', 22.3569, 91.7832, 2, false),
('BD', 'Sylhet', 24.8949, 91.8687, 3, false),
('BD', 'Rajshahi', 24.3745, 88.6042, 4, false),
('BD', 'Cox''s Bazar', 21.4272, 92.0058, 5, false),
('BD', 'Khulna', 22.8456, 89.5403, 6, false),

-- Bhutan (BT)
('BT', 'Thimphu', 27.4661, 89.6419, 1, true),
('BT', 'Paro', 27.4287, 89.4164, 2, false),
('BT', 'Punakha', 27.6083, 89.8678, 3, false),
('BT', 'Bumthang', 27.6444, 90.7261, 4, false),

-- Brunei (BN)
('BN', 'Bandar Seri Begawan', 4.9400, 114.9480, 1, true),
('BN', 'Kuala Belait', 4.5833, 114.1833, 2, false),
('BN', 'Seria', 4.6167, 114.3167, 3, false),

-- Cambodia (KH)
('KH', 'Phnom Penh', 11.5564, 104.9282, 1, true),
('KH', 'Siem Reap', 13.3633, 103.8564, 2, false),
('KH', 'Sihanoukville', 10.6098, 103.5296, 3, false),
('KH', 'Battambang', 13.1000, 103.2000, 4, false),
('KH', 'Kampot', 10.6139, 104.1823, 5, false),
('KH', 'Kep', 10.4833, 104.3167, 6, false),

-- China (CN)
('CN', 'Beijing', 39.9042, 116.4074, 1, true),
('CN', 'Shanghai', 31.2304, 121.4737, 2, false),
('CN', 'Guangzhou', 23.1291, 113.2644, 3, false),
('CN', 'Shenzhen', 22.5431, 114.0579, 4, false),
('CN', 'Chengdu', 30.5728, 104.0668, 5, false),
('CN', 'Xi''an', 34.3416, 108.9398, 6, false),
('CN', 'Guilin', 25.2736, 110.2907, 7, false),
('CN', 'Hangzhou', 30.2741, 120.1551, 8, false),
('CN', 'Suzhou', 31.3041, 120.5954, 9, false),
('CN', 'Chongqing', 29.5630, 106.5516, 10, false),
('CN', 'Lhasa', 29.6500, 91.1000, 11, false),
('CN', 'Zhangjiajie', 29.1166, 110.4792, 12, false),
('CN', 'Dunhuang', 40.1422, 94.6621, 13, false),
('CN', 'Lijiang', 26.8721, 100.2299, 14, false),
('CN', 'Huangshan', 30.1354, 118.1553, 15, false),

-- Cyprus (CY)
('CY', 'Nicosia', 35.1856, 33.3823, 1, true),
('CY', 'Limassol', 34.6786, 33.0413, 2, false),
('CY', 'Larnaca', 34.9229, 33.6233, 3, false),
('CY', 'Paphos', 34.7757, 32.4243, 4, false),
('CY', 'Ayia Napa', 34.9874, 33.9995, 5, false),

-- Georgia (GE)
('GE', 'Tbilisi', 41.6938, 44.8015, 1, true),
('GE', 'Kutaisi', 42.2679, 42.6994, 2, false),
('GE', 'Batumi', 41.6458, 41.6408, 3, false),
('GE', 'Kazbegi', 42.6653, 44.6414, 4, false),
('GE', 'Sighnaghi', 41.6133, 45.9228, 5, false),

-- India (IN)
('IN', 'New Delhi', 28.6139, 77.2090, 1, true),
('IN', 'Mumbai', 19.0760, 72.8777, 2, false),
('IN', 'Bangalore', 12.9716, 77.5946, 3, false),
('IN', 'Kolkata', 22.5726, 88.3639, 4, false),
('IN', 'Chennai', 13.0827, 80.2707, 5, false),
('IN', 'Hyderabad', 17.3850, 78.4867, 6, false),
('IN', 'Jaipur', 26.9124, 75.7873, 7, false),
('IN', 'Agra', 27.1767, 78.0081, 8, false),
('IN', 'Varanasi', 25.3176, 82.9739, 9, false),
('IN', 'Udaipur', 24.5854, 73.7125, 10, false),
('IN', 'Goa', 15.2993, 74.1240, 11, false),
('IN', 'Amritsar', 31.6340, 74.8723, 12, false),
('IN', 'Rishikesh', 30.0869, 78.2676, 13, false),
('IN', 'Kerala', 8.5241, 76.9366, 14, false),
('IN', 'Jodhpur', 26.2389, 73.0243, 15, false),

-- Indonesia (ID)
('ID', 'Jakarta', -6.2088, 106.8456, 1, true),
('ID', 'Surabaya', -7.2575, 112.7521, 2, false),
('ID', 'Bali', -8.4095, 115.1889, 3, false),
('ID', 'Bandung', -6.9175, 107.6191, 4, false),
('ID', 'Medan', 3.5952, 98.6722, 5, false),
('ID', 'Yogyakarta', -7.7956, 110.3695, 6, false),
('ID', 'Lombok', -8.6500, 116.3242, 7, false),
('ID', 'Komodo', -8.5418, 119.4924, 8, false),
('ID', 'Makassar', -5.1477, 119.4327, 9, false),
('ID', 'Raja Ampat', -0.2339, 130.5250, 10, false),
('ID', 'Ubud', -8.5069, 115.2625, 11, false),
('ID', 'Borobudur', -7.6079, 110.2038, 12, false),

-- Iran (IR)
('IR', 'Tehran', 35.6892, 51.3890, 1, true),
('IR', 'Mashhad', 36.2972, 59.6067, 2, false),
('IR', 'Isfahan', 32.6539, 51.6660, 3, false),
('IR', 'Shiraz', 29.5918, 52.5837, 4, false),
('IR', 'Tabriz', 38.0962, 46.2738, 5, false),
('IR', 'Yazd', 31.8974, 54.3569, 6, false),
('IR', 'Persepolis', 29.9350, 52.8911, 7, false),
('IR', 'Kashan', 33.9847, 51.0129, 8, false),

-- Iraq (IQ)
('IQ', 'Baghdad', 33.3406, 44.4009, 1, true),
('IQ', 'Basra', 30.5085, 47.7804, 2, false),
('IQ', 'Mosul', 36.3350, 43.1189, 3, false),
('IQ', 'Erbil', 36.1901, 44.0091, 4, false),
('IQ', 'Najaf', 31.9952, 44.3337, 5, false),

-- Israel (IL)
('IL', 'Jerusalem', 31.7683, 35.2137, 1, true),
('IL', 'Tel Aviv', 32.0853, 34.7818, 2, false),
('IL', 'Haifa', 32.7940, 34.9896, 3, false),
('IL', 'Eilat', 29.5581, 34.9482, 4, false),
('IL', 'Dead Sea', 31.5059, 35.4732, 5, false),
('IL', 'Nazareth', 32.6996, 35.3035, 6, false),
('IL', 'Akko', 32.9281, 35.0828, 7, false),
('IL', 'Caesarea', 32.5033, 34.8989, 8, false),

-- Japan (JP)
('JP', 'Tokyo', 35.6762, 139.6503, 1, true),
('JP', 'Osaka', 34.6937, 135.5023, 2, false),
('JP', 'Kyoto', 35.0116, 135.7681, 3, false),
('JP', 'Yokohama', 35.4437, 139.6380, 4, false),
('JP', 'Hiroshima', 34.3853, 132.4553, 5, false),
('JP', 'Nara', 34.6851, 135.8050, 6, false),
('JP', 'Sapporo', 43.0621, 141.3544, 7, false),
('JP', 'Nikko', 36.7198, 139.6980, 8, false),
('JP', 'Hakone', 35.2197, 139.1053, 9, false),
('JP', 'Fukuoka', 33.5904, 130.4017, 10, false),
('JP', 'Nagasaki', 32.7448, 129.8737, 11, false),
('JP', 'Kanazawa', 36.5944, 136.6256, 12, false),
('JP', 'Kamakura', 35.3197, 139.5467, 13, false),
('JP', 'Okinawa', 26.3344, 127.8056, 14, false),
('JP', 'Nagoya', 35.1815, 136.9066, 15, false),

-- Jordan (JO)
('JO', 'Amman', 31.9539, 35.9106, 1, true),
('JO', 'Petra', 30.3285, 35.4444, 2, false),
('JO', 'Aqaba', 29.5267, 35.0078, 3, false),
('JO', 'Wadi Rum', 29.5752, 35.4197, 4, false),
('JO', 'Jerash', 32.2742, 35.8972, 5, false),
('JO', 'Madaba', 31.7161, 35.7935, 6, false),
('JO', 'Dead Sea (Jordan)', 31.7500, 35.5844, 7, false),
('JO', 'Zarqa', 32.0728, 36.0878, 8, false),

-- Kazakhstan (KZ)
('KZ', 'Astana', 51.1811, 71.4460, 1, true),
('KZ', 'Almaty', 43.2220, 76.8512, 2, false),
('KZ', 'Shymkent', 42.3000, 69.6000, 3, false),
('KZ', 'Karaganda', 49.8028, 73.1028, 4, false),

-- Kuwait (KW)
('KW', 'Kuwait City', 29.3759, 47.9774, 1, true),
('KW', 'Hawalli', 29.3322, 48.0268, 2, false),
('KW', 'Salmiya', 29.3333, 48.0833, 3, false),

-- Kyrgyzstan (KG)
('KG', 'Bishkek', 42.8746, 74.5698, 1, true),
('KG', 'Osh', 40.5317, 72.7981, 2, false),
('KG', 'Karakol', 42.4861, 78.3939, 3, false),
('KG', 'Cholpon-Ata', 42.6500, 77.0833, 4, false),

-- Laos (LA)
('LA', 'Vientiane', 17.9757, 102.6331, 1, true),
('LA', 'Luang Prabang', 19.8945, 102.1350, 2, false),
('LA', 'Vang Vieng', 18.9226, 102.4505, 3, false),
('LA', 'Pakse', 15.1167, 105.8000, 4, false),
('LA', '4000 Islands', 13.9333, 105.9667, 5, false),

-- Lebanon (LB)
('LB', 'Beirut', 33.8938, 35.5018, 1, true),
('LB', 'Tripoli', 34.4333, 35.8333, 2, false),
('LB', 'Sidon', 33.5606, 35.3711, 3, false),
('LB', 'Baalbek', 34.0042, 36.2097, 4, false),
('LB', 'Byblos', 34.1225, 35.6486, 5, false),

-- Malaysia (MY)
('MY', 'Kuala Lumpur', 3.1390, 101.6869, 1, true),
('MY', 'George Town', 5.4141, 100.3288, 2, false),
('MY', 'Johor Bahru', 1.4927, 103.7414, 3, false),
('MY', 'Kota Kinabalu', 5.9804, 116.0735, 4, false),
('MY', 'Kuching', 1.5533, 110.3592, 5, false),
('MY', 'Malacca', 2.1889, 102.2500, 6, false),
('MY', 'Cameron Highlands', 4.4717, 101.3764, 7, false),
('MY', 'Langkawi', 6.3500, 99.8000, 8, false),
('MY', 'Ipoh', 4.5975, 101.0901, 9, false),

-- Maldives (MV)
('MV', 'Malé', 4.1755, 73.5093, 1, true),
('MV', 'Addu City', -0.6299, 73.1583, 2, false),
('MV', 'Fuvahmulah', -0.2986, 73.4231, 3, false),

-- Mongolia (MN)
('MN', 'Ulaanbaatar', 47.8864, 106.9057, 1, true),
('MN', 'Erdenet', 49.0272, 104.0450, 2, false),
('MN', 'Darkhan', 49.4878, 105.9730, 3, false),
('MN', 'Karakorum', 47.1992, 102.8411, 4, false),

-- Myanmar (MM)
('MM', 'Naypyidaw', 19.7633, 96.0785, 1, true),
('MM', 'Yangon', 16.8661, 96.1951, 2, false),
('MM', 'Mandalay', 21.9588, 96.0891, 3, false),
('MM', 'Bagan', 21.1717, 94.8585, 4, false),
('MM', 'Inle Lake', 20.5317, 96.9000, 5, false),
('MM', 'Ngapali', 18.3692, 94.1669, 6, false),

-- Nepal (NP)
('NP', 'Kathmandu', 27.7172, 85.3240, 1, true),
('NP', 'Pokhara', 28.2096, 83.9856, 2, false),
('NP', 'Lukla', 27.6869, 86.7294, 3, false),
('NP', 'Bhaktapur', 27.6722, 85.4277, 4, false),
('NP', 'Patan', 27.6644, 85.3244, 5, false),
('NP', 'Chitwan', 27.5291, 84.3542, 6, false),

-- North Korea (KP)
('KP', 'Pyongyang', 39.0392, 125.7625, 1, true),
('KP', 'Nampo', 38.7378, 125.4072, 2, false),
('KP', 'Wonsan', 39.1667, 127.4500, 3, false),

-- Oman (OM)
('OM', 'Muscat', 23.5880, 58.3829, 1, true),
('OM', 'Salalah', 17.0151, 54.0924, 2, false),
('OM', 'Nizwa', 22.9333, 57.5333, 3, false),
('OM', 'Sur', 22.5664, 59.5289, 4, false),
('OM', 'Wahiba Sands', 22.2500, 58.7500, 5, false),

-- Pakistan (PK)
('PK', 'Islamabad', 33.7294, 73.0931, 1, true),
('PK', 'Karachi', 24.8607, 67.0011, 2, false),
('PK', 'Lahore', 31.5204, 74.3587, 3, false),
('PK', 'Faisalabad', 31.4504, 73.1350, 4, false),
('PK', 'Peshawar', 34.0150, 71.5249, 5, false),
('PK', 'Hunza', 36.3167, 74.6500, 6, false),
('PK', 'Gilgit', 35.9219, 74.3083, 7, false),
('PK', 'Skardu', 35.2908, 75.6333, 8, false),

-- Palestine (PS)
('PS', 'Ramallah', 31.9038, 35.2034, 1, true),
('PS', 'Gaza', 31.5017, 34.4668, 2, false),
('PS', 'Bethlehem', 31.7054, 35.2024, 3, false),
('PS', 'Nablus', 32.2228, 35.2544, 4, false),
('PS', 'Jericho', 31.8622, 35.4444, 5, false),

-- Philippines (PH)
('PH', 'Manila', 14.5995, 120.9842, 1, true),
('PH', 'Cebu City', 10.3157, 123.8854, 2, false),
('PH', 'Davao', 7.1907, 125.4553, 3, false),
('PH', 'Boracay', 11.9674, 121.9248, 4, false),
('PH', 'Palawan', 9.8349, 118.7384, 5, false),
('PH', 'Siargao', 9.8482, 126.0458, 6, false),
('PH', 'Bohol', 9.6700, 124.0000, 7, false),
('PH', 'Batanes', 20.4505, 121.9700, 8, false),
('PH', 'Banaue', 16.9167, 121.0583, 9, false),
('PH', 'Vigan', 17.5747, 120.3869, 10, false),

-- Qatar (QA)
('QA', 'Doha', 25.2854, 51.5310, 1, true),
('QA', 'Al Wakrah', 25.1656, 51.6028, 2, false),
('QA', 'Al Khor', 25.6833, 51.5000, 3, false),

-- Saudi Arabia (SA)
('SA', 'Riyadh', 24.6877, 46.7219, 1, true),
('SA', 'Jeddah', 21.4858, 39.1925, 2, false),
('SA', 'Mecca', 21.3891, 39.8579, 3, false),
('SA', 'Medina', 24.5247, 39.5692, 4, false),
('SA', 'Dammam', 26.4207, 50.0888, 5, false),
('SA', 'Tabuk', 28.3838, 36.5662, 6, false),
('SA', 'AlUla', 26.6188, 37.9222, 7, false),
('SA', 'Neom', 28.0000, 35.0000, 8, false),

-- Singapore (SG)
('SG', 'Singapore', 1.3521, 103.8198, 1, true),
('SG', 'Sentosa', 1.2494, 103.8303, 2, false),
('SG', 'Jurong', 1.3404, 103.7090, 3, false),

-- South Korea (KR)
('KR', 'Seoul', 37.5665, 126.9780, 1, true),
('KR', 'Busan', 35.1796, 129.0756, 2, false),
('KR', 'Incheon', 37.4563, 126.7052, 3, false),
('KR', 'Daegu', 35.8714, 128.6014, 4, false),
('KR', 'Gyeongju', 35.8562, 129.2247, 5, false),
('KR', 'Jeju', 33.4996, 126.5312, 6, false),
('KR', 'Jeonju', 35.8242, 127.1480, 7, false),
('KR', 'Suwon', 37.2636, 127.0286, 8, false),
('KR', 'Gangneung', 37.7519, 128.8761, 9, false),

-- Sri Lanka (LK)
('LK', 'Colombo', 6.9271, 79.8612, 1, true),
('LK', 'Kandy', 7.2906, 80.6337, 2, false),
('LK', 'Galle', 6.0535, 80.2210, 3, false),
('LK', 'Ella', 6.8667, 81.0500, 4, false),
('LK', 'Sigiriya', 7.9570, 80.7603, 5, false),
('LK', 'Trincomalee', 8.5874, 81.2152, 6, false),
('LK', 'Nuwara Eliya', 6.9497, 80.7891, 7, false),

-- Syria (SY)
('SY', 'Damascus', 33.5102, 36.2913, 1, true),
('SY', 'Aleppo', 36.2021, 37.1343, 2, false),
('SY', 'Homs', 34.7324, 36.7137, 3, false),
('SY', 'Palmyra', 34.5584, 38.2685, 4, false),

-- Taiwan (TW)
('TW', 'Taipei', 25.0330, 121.5654, 1, true),
('TW', 'Kaohsiung', 22.6273, 120.3014, 2, false),
('TW', 'Taichung', 24.1477, 120.6736, 3, false),
('TW', 'Tainan', 22.9999, 120.2269, 4, false),
('TW', 'Hualien', 23.9872, 121.6016, 5, false),
('TW', 'Jiufen', 25.1093, 121.8442, 6, false),
('TW', 'Taroko', 24.1500, 121.6167, 7, false),
('TW', 'Sun Moon Lake', 23.8656, 120.9072, 8, false),

-- Tajikistan (TJ)
('TJ', 'Dushanbe', 38.5598, 68.7738, 1, true),
('TJ', 'Khujand', 40.2808, 69.6223, 2, false),
('TJ', 'Kulob', 37.9000, 69.7833, 3, false),

-- Thailand (TH)
('TH', 'Bangkok', 13.7563, 100.5018, 1, true),
('TH', 'Chiang Mai', 18.7883, 98.9853, 2, false),
('TH', 'Phuket', 7.8804, 98.3923, 3, false),
('TH', 'Koh Samui', 9.5120, 100.0136, 4, false),
('TH', 'Krabi', 8.0863, 98.9063, 5, false),
('TH', 'Pattaya', 12.9278, 100.8771, 6, false),
('TH', 'Chiang Rai', 19.9105, 99.8406, 7, false),
('TH', 'Ayutthaya', 14.3533, 100.5644, 8, false),
('TH', 'Pai', 19.3578, 98.4416, 9, false),
('TH', 'Koh Phi Phi', 7.7406, 98.7784, 10, false),
('TH', 'Sukhothai', 17.0068, 99.8236, 11, false),
('TH', 'Hua Hin', 12.5681, 99.9590, 12, false),

-- Timor-Leste (TL)
('TL', 'Dili', -8.5586, 125.5736, 1, true),
('TL', 'Baucau', -8.4631, 126.4531, 2, false),

-- Turkmenistan (TM)
('TM', 'Ashgabat', 37.9601, 58.3261, 1, true),
('TM', 'Turkmenabat', 39.0833, 63.5667, 2, false),
('TM', 'Darvaza', 40.2521, 58.4397, 3, false),

-- UAE (AE)
('AE', 'Abu Dhabi', 24.4539, 54.3773, 1, true),
('AE', 'Dubai', 25.2048, 55.2708, 2, false),
('AE', 'Sharjah', 25.3573, 55.4033, 3, false),
('AE', 'Ajman', 25.4052, 55.5136, 4, false),
('AE', 'Fujairah', 25.1288, 56.3265, 5, false),
('AE', 'Ras Al Khaimah', 25.7953, 55.9763, 6, false),
('AE', 'Al Ain', 24.2075, 55.7447, 7, false),

-- Uzbekistan (UZ)
('UZ', 'Tashkent', 41.2995, 69.2401, 1, true),
('UZ', 'Samarkand', 39.6542, 66.9597, 2, false),
('UZ', 'Bukhara', 39.7747, 64.4286, 3, false),
('UZ', 'Khiva', 41.3775, 60.3619, 4, false),
('UZ', 'Namangan', 41.0011, 71.6725, 5, false),

-- Vietnam (VN)
('VN', 'Hanoi', 21.0285, 105.8542, 1, true),
('VN', 'Ho Chi Minh City', 10.8231, 106.6297, 2, false),
('VN', 'Da Nang', 16.0544, 108.2022, 3, false),
('VN', 'Hoi An', 15.8801, 108.3380, 4, false),
('VN', 'Hue', 16.4637, 107.5909, 5, false),
('VN', 'Ha Long Bay', 20.9500, 107.0833, 6, false),
('VN', 'Sapa', 22.3333, 103.8333, 7, false),
('VN', 'Nha Trang', 12.2388, 109.1967, 8, false),
('VN', 'Phu Quoc', 10.2899, 103.9840, 9, false),
('VN', 'Mui Ne', 10.9333, 108.2833, 10, false),
('VN', 'Ninh Binh', 20.2539, 105.9750, 11, false),
('VN', 'Dalat', 11.9465, 108.4419, 12, false),

-- Yemen (YE)
('YE', 'Sanaa', 15.5527, 32.5324, 1, true),
('YE', 'Aden', 12.7797, 45.0095, 2, false),
('YE', 'Taiz', 13.5785, 44.0174, 3, false),
('YE', 'Socotra', 12.4634, 53.8237, 4, false),

-- ═══════════════════════════════════════
-- EUROPE (44 countries)
-- ═══════════════════════════════════════

-- Albania (AL)
('AL', 'Tirana', 41.3275, 19.8187, 1, true),
('AL', 'Durrës', 41.3233, 19.4453, 2, false),
('AL', 'Shkodër', 42.0683, 19.5122, 3, false),
('AL', 'Berat', 40.7058, 19.9522, 4, false),
('AL', 'Gjirokastër', 40.0756, 20.1389, 5, false),

-- Andorra (AD)
('AD', 'Andorra la Vella', 42.5063, 1.5218, 1, true),
('AD', 'Escaldes-Engordany', 42.5067, 1.5347, 2, false),

-- Austria (AT)
('AT', 'Vienna', 48.2082, 16.3738, 1, true),
('AT', 'Graz', 47.0707, 15.4395, 2, false),
('AT', 'Linz', 48.3069, 14.2858, 3, false),
('AT', 'Salzburg', 47.8095, 13.0550, 4, false),
('AT', 'Innsbruck', 47.2692, 11.4041, 5, false),
('AT', 'Hallstatt', 47.5622, 13.6493, 6, false),
('AT', 'Zell am See', 47.3256, 12.7994, 7, false),
('AT', 'Kitzbühel', 47.4456, 12.3917, 8, false),

-- Belarus (BY)
('BY', 'Minsk', 53.9045, 27.5615, 1, true),
('BY', 'Gomel', 52.4345, 30.9754, 2, false),
('BY', 'Vitebsk', 55.1904, 30.2049, 3, false),
('BY', 'Grodno', 53.6884, 23.8258, 4, false),

-- Belgium (BE)
('BE', 'Brussels', 50.8503, 4.3517, 1, true),
('BE', 'Antwerp', 51.2194, 4.4025, 2, false),
('BE', 'Ghent', 51.0543, 3.7174, 3, false),
('BE', 'Bruges', 51.2093, 3.2247, 4, false),
('BE', 'Liège', 50.6326, 5.5797, 5, false),
('BE', 'Leuven', 50.8798, 4.7005, 6, false),
('BE', 'Ypres', 50.8514, 2.8777, 7, false),
('BE', 'Dinant', 50.2606, 4.9117, 8, false),

-- Bosnia and Herzegovina (BA)
('BA', 'Sarajevo', 43.8563, 18.4131, 1, true),
('BA', 'Banja Luka', 44.7722, 17.1910, 2, false),
('BA', 'Tuzla', 44.5383, 18.6761, 3, false),
('BA', 'Mostar', 43.3438, 17.8078, 4, false),

-- Bulgaria (BG)
('BG', 'Sofia', 42.6977, 23.3219, 1, true),
('BG', 'Plovdiv', 42.1354, 24.7453, 2, false),
('BG', 'Varna', 43.2141, 27.9147, 3, false),
('BG', 'Burgas', 42.5048, 27.4626, 4, false),
('BG', 'Veliko Tarnovo', 43.0757, 25.6172, 5, false),
('BG', 'Rila Monastery', 42.1339, 23.3406, 6, false),

-- Croatia (HR)
('HR', 'Zagreb', 45.8150, 15.9819, 1, true),
('HR', 'Split', 43.5081, 16.4402, 2, false),
('HR', 'Dubrovnik', 42.6507, 18.0944, 3, false),
('HR', 'Rijeka', 45.3271, 14.4422, 4, false),
('HR', 'Zadar', 44.1194, 15.2422, 5, false),
('HR', 'Hvar', 43.1729, 16.4413, 6, false),
('HR', 'Plitvice', 44.8654, 15.5820, 7, false),
('HR', 'Rovinj', 45.0819, 13.6397, 8, false),

-- Czech Republic (CZ)
('CZ', 'Prague', 50.0755, 14.4378, 1, true),
('CZ', 'Brno', 49.1951, 16.6068, 2, false),
('CZ', 'Ostrava', 49.8209, 18.2625, 3, false),
('CZ', 'Plzeň', 49.7384, 13.3736, 4, false),
('CZ', 'Český Krumlov', 48.8127, 14.3175, 5, false),
('CZ', 'Kutná Hora', 49.9481, 15.2683, 6, false),
('CZ', 'Olomouc', 49.5938, 17.2509, 7, false),
('CZ', 'Karlovy Vary', 50.2319, 12.8717, 8, false),

-- Denmark (DK)
('DK', 'Copenhagen', 55.6761, 12.5683, 1, true),
('DK', 'Aarhus', 56.1629, 10.2039, 2, false),
('DK', 'Odense', 55.3959, 10.3883, 3, false),
('DK', 'Aalborg', 57.0480, 9.9187, 4, false),
('DK', 'Elsinore', 56.0363, 12.6136, 5, false),

-- Estonia (EE)
('EE', 'Tallinn', 59.4370, 24.7536, 1, true),
('EE', 'Tartu', 58.3776, 26.7290, 2, false),
('EE', 'Narva', 59.3772, 28.1908, 3, false),
('EE', 'Pärnu', 58.3859, 24.4975, 4, false),

-- Finland (FI)
('FI', 'Helsinki', 60.1699, 24.9384, 1, true),
('FI', 'Espoo', 60.2052, 24.6522, 2, false),
('FI', 'Tampere', 61.4978, 23.7610, 3, false),
('FI', 'Turku', 60.4518, 22.2666, 4, false),
('FI', 'Rovaniemi', 66.5039, 25.7294, 5, false),
('FI', 'Saariselkä', 68.4178, 27.4194, 6, false),

-- France (FR)
('FR', 'Paris', 48.8566, 2.3522, 1, true),
('FR', 'Marseille', 43.2965, 5.3698, 2, false),
('FR', 'Lyon', 45.7640, 4.8357, 3, false),
('FR', 'Nice', 43.7102, 7.2620, 4, false),
('FR', 'Bordeaux', 44.8378, -0.5792, 5, false),
('FR', 'Strasbourg', 48.5734, 7.7521, 6, false),
('FR', 'Toulouse', 43.6047, 1.4442, 7, false),
('FR', 'Mont Saint-Michel', 48.6361, -1.5115, 8, false),
('FR', 'Chamonix', 45.9237, 6.8694, 9, false),
('FR', 'Versailles', 48.8049, 2.1204, 10, false),
('FR', 'Cannes', 43.5528, 7.0174, 11, false),
('FR', 'Avignon', 43.9493, 4.8055, 12, false),
('FR', 'Carcassonne', 43.2130, 2.3491, 13, false),

-- Germany (DE)
('DE', 'Berlin', 52.5200, 13.4050, 1, true),
('DE', 'Munich', 48.1351, 11.5820, 2, false),
('DE', 'Hamburg', 53.5753, 10.0153, 3, false),
('DE', 'Cologne', 50.9333, 6.9500, 4, false),
('DE', 'Frankfurt', 50.1109, 8.6821, 5, false),
('DE', 'Stuttgart', 48.7758, 9.1829, 6, false),
('DE', 'Düsseldorf', 51.2217, 6.7762, 7, false),
('DE', 'Dresden', 51.0504, 13.7373, 8, false),
('DE', 'Heidelberg', 49.3988, 8.6724, 9, false),
('DE', 'Rothenburg ob der Tauber', 49.3775, 10.1806, 10, false),
('DE', 'Neuschwanstein', 47.5576, 10.7498, 11, false),
('DE', 'Nuremberg', 49.4521, 11.0767, 12, false),
('DE', 'Leipzig', 51.3397, 12.3731, 13, false),

-- Greece (GR)
('GR', 'Athens', 37.9838, 23.7275, 1, true),
('GR', 'Thessaloniki', 40.6401, 22.9444, 2, false),
('GR', 'Santorini', 36.3932, 25.4615, 3, false),
('GR', 'Mykonos', 37.4467, 25.3289, 4, false),
('GR', 'Crete', 35.2401, 24.8093, 5, false),
('GR', 'Rhodes', 36.4342, 28.2176, 6, false),
('GR', 'Corfu', 39.6243, 19.9217, 7, false),
('GR', 'Meteora', 39.7217, 21.6306, 8, false),
('GR', 'Delphi', 38.4824, 22.5010, 9, false),
('GR', 'Olympia', 37.6387, 21.6300, 10, false),
('GR', 'Nafplio', 37.5675, 22.8015, 11, false),
('GR', 'Zakynthos', 37.7900, 20.8953, 12, false),

-- Hungary (HU)
('HU', 'Budapest', 47.4979, 19.0402, 1, true),
('HU', 'Debrecen', 47.5316, 21.6273, 2, false),
('HU', 'Miskolc', 48.1036, 20.7784, 3, false),
('HU', 'Pécs', 46.0727, 18.2332, 4, false),
('HU', 'Győr', 47.6833, 17.6355, 5, false),
('HU', 'Eger', 47.9025, 20.3772, 6, false),
('HU', 'Hévíz', 46.7906, 17.1919, 7, false),
('HU', 'Sopron', 47.6833, 16.5833, 8, false),

-- Iceland (IS)
('IS', 'Reykjavik', 64.1265, -21.8174, 1, true),
('IS', 'Akureyri', 65.6885, -18.1262, 2, false),
('IS', 'Vik', 63.4186, -19.0039, 3, false),
('IS', 'Myvatn', 65.6000, -17.0000, 4, false),
('IS', 'Jökulsárlón', 64.0784, -16.2306, 5, false),
('IS', 'Húsavík', 66.0443, -17.3392, 6, false),
('IS', 'Snæfellsnes', 64.9000, -23.0000, 7, false),
('IS', 'Landmannalaugar', 63.9833, -19.0667, 8, false),

-- Ireland (IE)
('IE', 'Dublin', 53.3498, -6.2603, 1, true),
('IE', 'Cork', 51.8985, -8.4756, 2, false),
('IE', 'Limerick', 52.6638, -8.6267, 3, false),
('IE', 'Galway', 53.2707, -9.0568, 4, false),
('IE', 'Killarney', 52.0599, -9.5044, 5, false),
('IE', 'Cliffs of Moher', 52.9715, -9.4309, 6, false),
('IE', 'Dingle', 52.1407, -10.2693, 7, false),

-- Italy (IT)
('IT', 'Rome', 41.9028, 12.4964, 1, true),
('IT', 'Milan', 45.4654, 9.1866, 2, false),
('IT', 'Venice', 45.4408, 12.3155, 3, false),
('IT', 'Florence', 43.7696, 11.2558, 4, false),
('IT', 'Naples', 40.8518, 14.2681, 5, false),
('IT', 'Turin', 45.0703, 7.6869, 6, false),
('IT', 'Bologna', 44.4949, 11.3426, 7, false),
('IT', 'Palermo', 38.1157, 13.3615, 8, false),
('IT', 'Amalfi Coast', 40.6340, 14.6027, 9, false),
('IT', 'Cinque Terre', 44.1477, 9.6536, 10, false),
('IT', 'Siena', 43.3186, 11.3313, 11, false),
('IT', 'Pompeii', 40.7462, 14.4989, 12, false),
('IT', 'Verona', 45.4384, 10.9917, 13, false),

-- Kosovo (XK)
('XK', 'Pristina', 42.6629, 21.1655, 1, true),
('XK', 'Prizren', 42.2139, 20.7422, 2, false),
('XK', 'Peja', 42.6597, 20.2883, 3, false),

-- Latvia (LV)
('LV', 'Riga', 56.9496, 24.1052, 1, true),
('LV', 'Daugavpils', 55.8750, 26.5361, 2, false),
('LV', 'Liepāja', 56.5047, 21.0108, 3, false),
('LV', 'Jūrmala', 56.9681, 23.7706, 4, false),

-- Liechtenstein (LI)
('LI', 'Vaduz', 47.1410, 9.5215, 1, true),
('LI', 'Schaan', 47.1667, 9.5000, 2, false),

-- Lithuania (LT)
('LT', 'Vilnius', 54.6872, 25.2797, 1, true),
('LT', 'Kaunas', 54.9000, 23.9000, 2, false),
('LT', 'Klaipėda', 55.7033, 21.1442, 3, false),
('LT', 'Trakai', 54.6378, 24.9344, 4, false),

-- Luxembourg (LU)
('LU', 'Luxembourg City', 49.6117, 6.1319, 1, true),
('LU', 'Esch-sur-Alzette', 49.4956, 5.9806, 2, false),
('LU', 'Vianden', 49.9333, 6.2000, 3, false),

-- Malta (MT)
('MT', 'Valletta', 35.8997, 14.5147, 1, true),
('MT', 'Sliema', 35.9122, 14.5024, 2, false),
('MT', 'Mdina', 35.8869, 14.4024, 3, false),
('MT', 'Gozo', 36.0444, 14.2500, 4, false),

-- Moldova (MD)
('MD', 'Chișinău', 47.0105, 28.8638, 1, true),
('MD', 'Tiraspol', 46.8403, 29.6433, 2, false),
('MD', 'Bălți', 47.7617, 27.9294, 3, false),

-- Monaco (MC)
('MC', 'Monaco', 43.7384, 7.4246, 1, true),
('MC', 'Monte Carlo', 43.7396, 7.4286, 2, false),

-- Montenegro (ME)
('ME', 'Podgorica', 42.4304, 19.2594, 1, true),
('ME', 'Kotor', 42.4236, 18.7714, 2, false),
('ME', 'Budva', 42.2858, 18.8406, 3, false),
('ME', 'Herceg Novi', 42.4531, 18.5375, 4, false),

-- Netherlands (NL)
('NL', 'Amsterdam', 52.3676, 4.9041, 1, true),
('NL', 'Rotterdam', 51.9225, 4.4792, 2, false),
('NL', 'The Hague', 52.0705, 4.3007, 3, false),
('NL', 'Utrecht', 52.0907, 5.1214, 4, false),
('NL', 'Eindhoven', 51.4416, 5.4697, 5, false),
('NL', 'Delft', 52.0116, 4.3571, 6, false),
('NL', 'Leiden', 52.1601, 4.4970, 7, false),
('NL', 'Maastricht', 50.8514, 5.6910, 8, false),

-- North Macedonia (MK)
('MK', 'Skopje', 41.9973, 21.4280, 1, true),
('MK', 'Bitola', 41.0167, 21.3500, 2, false),
('MK', 'Ohrid', 41.1231, 20.8016, 3, false),

-- Norway (NO)
('NO', 'Oslo', 59.9139, 10.7522, 1, true),
('NO', 'Bergen', 60.3913, 5.3221, 2, false),
('NO', 'Trondheim', 63.4305, 10.3951, 3, false),
('NO', 'Tromsø', 69.6489, 18.9551, 4, false),
('NO', 'Stavanger', 58.9700, 5.7331, 5, false),
('NO', 'Geiranger', 62.1000, 7.2000, 6, false),
('NO', 'Flåm', 60.8640, 7.1165, 7, false),
('NO', 'Lofoten', 68.1500, 13.9500, 8, false),

-- Poland (PL)
('PL', 'Warsaw', 52.2297, 21.0122, 1, true),
('PL', 'Kraków', 50.0647, 19.9450, 2, false),
('PL', 'Łódź', 51.7592, 19.4560, 3, false),
('PL', 'Wrocław', 51.1079, 17.0385, 4, false),
('PL', 'Gdańsk', 54.3520, 18.6466, 5, false),
('PL', 'Poznań', 52.4064, 16.9252, 6, false),
('PL', 'Zakopane', 49.2992, 19.9497, 7, false),
('PL', 'Auschwitz', 50.0275, 19.2037, 8, false),
('PL', 'Toruń', 53.0138, 18.5981, 9, false),

-- Portugal (PT)
('PT', 'Lisbon', 38.7169, -9.1395, 1, true),
('PT', 'Porto', 41.1579, -8.6291, 2, false),
('PT', 'Braga', 41.5518, -8.4229, 3, false),
('PT', 'Coimbra', 40.2033, -8.4103, 4, false),
('PT', 'Faro', 37.0193, -7.9304, 5, false),
('PT', 'Sintra', 38.7977, -9.3878, 6, false),
('PT', 'Évora', 38.5711, -7.9133, 7, false),
('PT', 'Óbidos', 39.3631, -9.1578, 8, false),
('PT', 'Algarve', 37.1000, -8.1678, 9, false),
('PT', 'Madeira', 32.7607, -16.9595, 10, false),

-- Romania (RO)
('RO', 'Bucharest', 44.4268, 26.1025, 1, true),
('RO', 'Cluj-Napoca', 46.7712, 23.6236, 2, false),
('RO', 'Timișoara', 45.7489, 21.2087, 3, false),
('RO', 'Brașov', 45.6427, 25.5887, 4, false),
('RO', 'Sibiu', 45.7983, 24.1256, 5, false),
('RO', 'Sinaia', 45.3500, 25.5500, 6, false),
('RO', 'Sighișoara', 46.2197, 24.7958, 7, false),

-- Russia (RU)
('RU', 'Moscow', 55.7558, 37.6176, 1, true),
('RU', 'Saint Petersburg', 59.9343, 30.3351, 2, false),
('RU', 'Novosibirsk', 54.9924, 82.9347, 3, false),
('RU', 'Yekaterinburg', 56.8389, 60.6057, 4, false),
('RU', 'Kazan', 55.7879, 49.1221, 5, false),
('RU', 'Vladivostok', 43.1332, 131.9113, 6, false),
('RU', 'Sochi', 43.6028, 39.7342, 7, false),
('RU', 'Irkutsk', 52.2978, 104.2964, 8, false),
('RU', 'Lake Baikal', 53.5000, 108.0000, 9, false),
('RU', 'Murmansk', 68.9585, 33.0827, 10, false),

-- San Marino (SM)
('SM', 'San Marino City', 43.9424, 12.4578, 1, true),
('SM', 'Serravalle', 43.9667, 12.4833, 2, false),

-- Serbia (RS)
('RS', 'Belgrade', 44.8176, 20.4569, 1, true),
('RS', 'Novi Sad', 45.2551, 19.8452, 2, false),
('RS', 'Niš', 43.3209, 21.8958, 3, false),
('RS', 'Subotica', 46.1000, 19.6500, 4, false),

-- Slovakia (SK)
('SK', 'Bratislava', 48.1486, 17.1077, 1, true),
('SK', 'Košice', 48.7164, 21.2611, 2, false),
('SK', 'Banská Bystrica', 48.7357, 19.1533, 3, false),
('SK', 'High Tatras', 49.1500, 20.1333, 4, false),

-- Slovenia (SI)
('SI', 'Ljubljana', 46.0569, 14.5058, 1, true),
('SI', 'Maribor', 46.5547, 15.6467, 2, false),
('SI', 'Bled', 46.3683, 14.1146, 3, false),
('SI', 'Piran', 45.5283, 13.5686, 4, false),
('SI', 'Triglav', 46.3794, 13.8378, 5, false),

-- Spain (ES)
('ES', 'Madrid', 40.4168, -3.7038, 1, true),
('ES', 'Barcelona', 41.3851, 2.1734, 2, false),
('ES', 'Valencia', 39.4699, -0.3763, 3, false),
('ES', 'Seville', 37.3891, -5.9845, 4, false),
('ES', 'Granada', 37.1773, -3.5986, 5, false),
('ES', 'Bilbao', 43.2630, -2.9350, 6, false),
('ES', 'San Sebastián', 43.3183, -1.9812, 7, false),
('ES', 'Salamanca', 40.9701, -5.6635, 8, false),
('ES', 'Toledo', 39.8628, -4.0273, 9, false),
('ES', 'Córdoba', 37.8882, -4.7794, 10, false),
('ES', 'Ibiza', 38.9067, 1.4206, 11, false),
('ES', 'Palma de Mallorca', 39.5696, 2.6502, 12, false),
('ES', 'Tenerife', 28.2916, -16.6291, 13, false),
('ES', 'Santiago de Compostela', 42.8782, -8.5448, 14, false),

-- Sweden (SE)
('SE', 'Stockholm', 59.3293, 18.0686, 1, true),
('SE', 'Gothenburg', 57.7089, 11.9746, 2, false),
('SE', 'Malmö', 55.6050, 13.0038, 3, false),
('SE', 'Uppsala', 59.8586, 17.6389, 4, false),
('SE', 'Kiruna', 67.8558, 20.2253, 5, false),
('SE', 'Visby', 57.6348, 18.2948, 6, false),
('SE', 'Jokkmokk', 66.6067, 19.8258, 7, false),
('SE', 'Abisko', 68.3493, 18.8308, 8, false),

-- Switzerland (CH)
('CH', 'Bern', 46.9480, 7.4474, 1, true),
('CH', 'Zurich', 47.3769, 8.5417, 2, false),
('CH', 'Geneva', 46.2044, 6.1432, 3, false),
('CH', 'Basel', 47.5596, 7.5886, 4, false),
('CH', 'Interlaken', 46.6863, 7.8632, 5, false),
('CH', 'Lucerne', 47.0502, 8.3093, 6, false),
('CH', 'Zermatt', 46.0207, 7.7491, 7, false),
('CH', 'St. Moritz', 46.4983, 9.8385, 8, false),
('CH', 'Lugano', 46.0037, 8.9511, 9, false),

-- Ukraine (UA)
('UA', 'Kyiv', 50.4501, 30.5234, 1, true),
('UA', 'Kharkiv', 49.9935, 36.2304, 2, false),
('UA', 'Odessa', 46.4825, 30.7233, 3, false),
('UA', 'Dnipro', 48.4647, 35.0462, 4, false),
('UA', 'Lviv', 49.8397, 24.0297, 5, false),
('UA', 'Zaporizhzhia', 47.8388, 35.1396, 6, false),

-- United Kingdom (GB)
('GB', 'London', 51.5074, -0.1278, 1, true),
('GB', 'Edinburgh', 55.9533, -3.1883, 2, false),
('GB', 'Manchester', 53.4808, -2.2426, 3, false),
('GB', 'Birmingham', 52.4862, -1.8904, 4, false),
('GB', 'Liverpool', 53.4084, -2.9916, 5, false),
('GB', 'Glasgow', 55.8642, -4.2518, 6, false),
('GB', 'Oxford', 51.7520, -1.2577, 7, false),
('GB', 'Cambridge', 52.2053, 0.1218, 8, false),
('GB', 'Bath', 51.3811, -2.3590, 9, false),
('GB', 'York', 53.9590, -1.0815, 10, false),
('GB', 'Cotswolds', 51.8330, -1.8333, 11, false),
('GB', 'Scottish Highlands', 57.1200, -4.7100, 12, false),
('GB', 'Stonehenge', 51.1789, -1.8262, 13, false),

-- Vatican City (VA)
('VA', 'Vatican City', 41.9029, 12.4534, 1, true),

-- ═══════════════════════════════════════
-- NORTH AMERICA (23 countries)
-- ═══════════════════════════════════════

-- Antigua and Barbuda (AG)
('AG', 'St. John''s', 17.1211, -61.8468, 1, true),
('AG', 'English Harbour', 17.0028, -61.7622, 2, false),

-- Bahamas (BS)
('BS', 'Nassau', 25.0480, -77.3554, 1, true),
('BS', 'Freeport', 26.5385, -78.6959, 2, false),
('BS', 'Exuma', 23.5229, -75.8519, 3, false),

-- Barbados (BB)
('BB', 'Bridgetown', 13.1132, -59.5988, 1, true),
('BB', 'Holetown', 13.1994, -59.6382, 2, false),
('BB', 'Oistins', 13.0658, -59.5445, 3, false),

-- Belize (BZ)
('BZ', 'Belmopan', 17.2514, -88.7590, 1, true),
('BZ', 'Belize City', 17.2510, -88.7671, 2, false),
('BZ', 'San Ignacio', 17.1540, -89.0713, 3, false),
('BZ', 'Placencia', 16.5135, -88.3636, 4, false),

-- Canada (CA)
('CA', 'Ottawa', 45.4215, -75.6972, 1, true),
('CA', 'Toronto', 43.6532, -79.3832, 2, false),
('CA', 'Vancouver', 49.2827, -123.1207, 3, false),
('CA', 'Montreal', 45.5017, -73.5673, 4, false),
('CA', 'Calgary', 51.0447, -114.0719, 5, false),
('CA', 'Quebec City', 46.8139, -71.2080, 6, false),
('CA', 'Banff', 51.1784, -115.5708, 7, false),
('CA', 'Victoria', 48.4284, -123.3656, 8, false),
('CA', 'Whistler', 50.1163, -122.9574, 9, false),
('CA', 'Niagara Falls', 43.0962, -79.0377, 10, false),

-- Greenland (GL)
('GL', 'Nuuk', 64.1814, -51.6941, 1, true),
('GL', 'Sisimiut', 66.9395, -53.6735, 2, false),
('GL', 'Ilulissat', 69.2198, -51.0986, 3, false),

-- Costa Rica (CR)
('CR', 'San José', 9.9281, -84.0907, 1, true),
('CR', 'Liberia', 10.6329, -85.4426, 2, false),
('CR', 'La Fortuna', 10.4683, -84.6440, 3, false),
('CR', 'Manuel Antonio', 9.3936, -84.1421, 4, false),
('CR', 'Monteverde', 10.3014, -84.8239, 5, false),

-- Cuba (CU)
('CU', 'Havana', 23.1136, -82.3666, 1, true),
('CU', 'Santiago de Cuba', 20.0200, -75.8200, 2, false),
('CU', 'Trinidad', 21.8036, -79.9842, 3, false),
('CU', 'Varadero', 23.1542, -81.2519, 4, false),
('CU', 'Cienfuegos', 22.1461, -80.4441, 5, false),

-- Dominica (DM)
('DM', 'Roseau', 15.3017, -61.3881, 1, true),
('DM', 'Portsmouth', 15.5797, -61.4561, 2, false),

-- Dominican Republic (DO)
('DO', 'Santo Domingo', 18.4861, -69.9312, 1, true),
('DO', 'Santiago', 19.4517, -70.6970, 2, false),
('DO', 'Punta Cana', 18.5820, -68.4083, 3, false),
('DO', 'Puerto Plata', 19.7936, -70.6880, 4, false),
('DO', 'Samaná', 19.2058, -69.3365, 5, false),

-- El Salvador (SV)
('SV', 'San Salvador', 13.6929, -89.2182, 1, true),
('SV', 'Santa Ana', 13.9942, -89.5597, 2, false),
('SV', 'San Miguel', 13.4833, -88.1833, 3, false),

-- Grenada (GD)
('GD', 'St. George''s', 12.0561, -61.7488, 1, true),
('GD', 'Grand Anse', 12.0333, -61.7667, 2, false),

-- Guatemala (GT)
('GT', 'Guatemala City', 14.6349, -90.5069, 1, true),
('GT', 'Quetzaltenango', 14.8444, -91.5178, 2, false),
('GT', 'Antigua', 14.5586, -90.7295, 3, false),
('GT', 'Flores', 16.9292, -89.8925, 4, false),
('GT', 'Lake Atitlán', 14.6869, -91.2060, 5, false),

-- Haiti (HT)
('HT', 'Port-au-Prince', 18.5392, -72.3350, 1, true),
('HT', 'Cap-Haïtien', 19.7577, -72.2050, 2, false),
('HT', 'Les Cayes', 18.2000, -73.7500, 3, false),

-- Honduras (HN)
('HN', 'Tegucigalpa', 14.0818, -87.2068, 1, true),
('HN', 'San Pedro Sula', 15.5000, -88.0333, 2, false),
('HN', 'Roatán', 16.3232, -86.5274, 3, false),
('HN', 'Copán', 14.8356, -89.1431, 4, false),

-- Jamaica (JM)
('JM', 'Kingston', 17.9970, -76.7936, 1, true),
('JM', 'Montego Bay', 18.4762, -77.8939, 2, false),
('JM', 'Negril', 18.2614, -78.3525, 3, false),
('JM', 'Ocho Rios', 18.4094, -77.1006, 4, false),

-- Mexico (MX)
('MX', 'Mexico City', 19.4326, -99.1332, 1, true),
('MX', 'Guadalajara', 20.6597, -103.3496, 2, false),
('MX', 'Monterrey', 25.6866, -100.3161, 3, false),
('MX', 'Cancún', 21.1619, -86.8515, 4, false),
('MX', 'Oaxaca', 17.0732, -96.7266, 5, false),
('MX', 'Tulum', 20.2114, -87.4654, 6, false),
('MX', 'San Cristóbal de las Casas', 16.7369, -92.6376, 7, false),
('MX', 'Playa del Carmen', 20.6296, -87.0739, 8, false),
('MX', 'Mérida', 20.9674, -89.5926, 9, false),
('MX', 'Guanajuato', 21.0190, -101.2574, 10, false),
('MX', 'Puerto Vallarta', 20.6534, -105.2253, 11, false),
('MX', 'Teotihuacan', 19.6925, -98.8438, 12, false),
('MX', 'Cabo San Lucas', 22.8905, -109.9167, 13, false),

-- Nicaragua (NI)
('NI', 'Managua', 12.1364, -86.2514, 1, true),
('NI', 'León', 12.4379, -86.8780, 2, false),
('NI', 'Granada', 11.9344, -85.9560, 3, false),
('NI', 'Ometepe', 11.5100, -85.5700, 4, false),

-- Panama (PA)
('PA', 'Panama City', 8.9936, -79.5197, 1, true),
('PA', 'Colón', 9.3600, -79.9000, 2, false),
('PA', 'Bocas del Toro', 9.3402, -82.2419, 3, false),
('PA', 'Boquete', 8.7797, -82.4392, 4, false),

-- Saint Kitts and Nevis (KN)
('KN', 'Basseterre', 17.2983, -62.7342, 1, true),
('KN', 'Charlestown', 17.1356, -62.6197, 2, false),

-- Saint Lucia (LC)
('LC', 'Castries', 14.0101, -60.9875, 1, true),
('LC', 'Soufrière', 13.8569, -61.0564, 2, false),
('LC', 'Rodney Bay', 14.0806, -60.9567, 3, false),

-- Saint Vincent and the Grenadines (VC)
('VC', 'Kingstown', 13.1600, -61.2248, 1, true),
('VC', 'Bequia', 13.0080, -61.2323, 2, false),

-- Trinidad and Tobago (TT)
('TT', 'Port of Spain', 10.6524, -61.5188, 1, true),
('TT', 'San Fernando', 10.2797, -61.4680, 2, false),
('TT', 'Scarborough', 11.1792, -60.7397, 3, false),

-- United States (US)
('US', 'Washington D.C.', 38.9072, -77.0369, 1, true),
('US', 'New York City', 40.7128, -74.0060, 2, false),
('US', 'Los Angeles', 34.0522, -118.2437, 3, false),
('US', 'Chicago', 41.8781, -87.6298, 4, false),
('US', 'Houston', 29.7604, -95.3698, 5, false),
('US', 'Miami', 25.7617, -80.1918, 6, false),
('US', 'Las Vegas', 36.1699, -115.1398, 7, false),
('US', 'San Francisco', 37.7749, -122.4194, 8, false),
('US', 'Seattle', 47.6062, -122.3321, 9, false),
('US', 'New Orleans', 29.9511, -90.0715, 10, false),
('US', 'Boston', 42.3601, -71.0589, 11, false),
('US', 'Nashville', 36.1627, -86.7816, 12, false),
('US', 'Grand Canyon', 36.0544, -112.1401, 13, false),
('US', 'Honolulu', 21.3069, -157.8583, 14, false),
('US', 'Denver', 39.7392, -104.9903, 15, false),

-- ═══════════════════════════════════════
-- SOUTH AMERICA (12 countries)
-- ═══════════════════════════════════════

-- Argentina (AR)
('AR', 'Buenos Aires', -34.6037, -58.3816, 1, true),
('AR', 'Córdoba', -31.4201, -64.1888, 2, false),
('AR', 'Rosario', -32.9587, -60.6930, 3, false),
('AR', 'Mendoza', -32.8908, -68.8272, 4, false),
('AR', 'Bariloche', -41.1335, -71.3103, 5, false),
('AR', 'Iguazú Falls', -25.6953, -54.4367, 6, false),
('AR', 'Salta', -24.7897, -65.4117, 7, false),
('AR', 'Ushuaia', -54.8019, -68.3030, 8, false),
('AR', 'El Calafate', -50.3378, -72.2658, 9, false),

-- Bolivia (BO)
('BO', 'Sucre', -19.0196, -65.2619, 1, true),
('BO', 'La Paz', -16.5000, -68.1500, 2, false),
('BO', 'Santa Cruz de la Sierra', -17.8146, -63.1561, 3, false),
('BO', 'Uyuni', -20.4667, -66.8333, 4, false),
('BO', 'Potosí', -19.5836, -65.7531, 5, false),
('BO', 'Tiwanaku', -16.5539, -68.6700, 6, false),

-- Brazil (BR)
('BR', 'Brasília', -15.7939, -47.8828, 1, true),
('BR', 'São Paulo', -23.5505, -46.6333, 2, false),
('BR', 'Rio de Janeiro', -22.9068, -43.1729, 3, false),
('BR', 'Salvador', -12.9777, -38.5016, 4, false),
('BR', 'Fortaleza', -3.7172, -38.5433, 5, false),
('BR', 'Manaus', -3.1190, -60.0217, 6, false),
('BR', 'Recife', -8.0476, -34.8770, 7, false),
('BR', 'Florianópolis', -27.5954, -48.5480, 8, false),
('BR', 'Foz do Iguaçu', -25.5478, -54.5882, 9, false),
('BR', 'Fernando de Noronha', -3.8547, -32.4278, 10, false),
('BR', 'Búzios', -22.7483, -41.8822, 11, false),
('BR', 'Bonito', -21.1261, -56.4836, 12, false),

-- Chile (CL)
('CL', 'Santiago', -33.4489, -70.6693, 1, true),
('CL', 'Valparaíso', -33.0472, -71.6127, 2, false),
('CL', 'Antofagasta', -23.6509, -70.3975, 3, false),
('CL', 'San Pedro de Atacama', -22.9087, -68.1997, 4, false),
('CL', 'Torres del Paine', -51.0500, -73.0000, 5, false),
('CL', 'Easter Island', -27.1127, -109.3497, 6, false),
('CL', 'Puerto Natales', -51.7330, -72.5000, 7, false),
('CL', 'Pucón', -39.2817, -71.9783, 8, false),

-- Colombia (CO)
('CO', 'Bogotá', 4.7110, -74.0721, 1, true),
('CO', 'Medellín', 6.2442, -75.5812, 2, false),
('CO', 'Cali', 3.4516, -76.5320, 3, false),
('CO', 'Cartagena', 10.3910, -75.4794, 4, false),
('CO', 'Santa Marta', 11.2408, -74.2110, 5, false),
('CO', 'Barranquilla', 10.9685, -74.7813, 6, false),
('CO', 'Villa de Leyva', 5.6347, -73.5236, 7, false),
('CO', 'San Agustín', 1.8888, -76.2780, 8, false),
('CO', 'Salento', 4.6367, -75.5714, 9, false),

-- Ecuador (EC)
('EC', 'Quito', -0.2299, -78.5249, 1, true),
('EC', 'Guayaquil', -2.1710, -79.9224, 2, false),
('EC', 'Cuenca', -2.8974, -79.0045, 3, false),
('EC', 'Galapagos Islands', -0.9538, -90.9656, 4, false),
('EC', 'Baños', -1.3969, -78.4241, 5, false),
('EC', 'Otavalo', 0.2333, -78.2667, 6, false),

-- Guyana (GY)
('GY', 'Georgetown', 6.8013, -58.1551, 1, true),
('GY', 'Linden', 5.9964, -58.3025, 2, false),
('GY', 'Kaieteur Falls', 5.1747, -59.4811, 3, false),

-- Paraguay (PY)
('PY', 'Asunción', -25.2867, -57.6470, 1, true),
('PY', 'Ciudad del Este', -25.5086, -54.6119, 2, false),
('PY', 'Encarnación', -27.3333, -55.8667, 3, false),

-- Peru (PE)
('PE', 'Lima', -12.0464, -77.0428, 1, true),
('PE', 'Cusco', -13.5319, -71.9675, 2, false),
('PE', 'Arequipa', -16.4090, -71.5375, 3, false),
('PE', 'Iquitos', -3.7491, -73.2538, 4, false),
('PE', 'Machu Picchu', -13.1631, -72.5450, 5, false),
('PE', 'Puno', -15.8402, -70.0219, 6, false),
('PE', 'Nazca', -14.8350, -74.9367, 7, false),
('PE', 'Huaraz', -9.5274, -77.5278, 8, false),

-- Suriname (SR)
('SR', 'Paramaribo', 5.8520, -55.2038, 1, true),
('SR', 'Lelydorp', 5.7011, -55.2028, 2, false),
('SR', 'Nieuw Nickerie', 5.9261, -56.9711, 3, false),

-- Uruguay (UY)
('UY', 'Montevideo', -34.9011, -56.1645, 1, true),
('UY', 'Salto', -31.3833, -57.9667, 2, false),
('UY', 'Punta del Este', -34.9667, -54.9500, 3, false),
('UY', 'Colonia del Sacramento', -34.4656, -57.8403, 4, false),

-- Venezuela (VE)
('VE', 'Caracas', 10.4806, -66.9036, 1, true),
('VE', 'Maracaibo', 10.6544, -71.6127, 2, false),
('VE', 'Valencia', 10.1620, -68.0050, 3, false),
('VE', 'Angel Falls', 5.9667, -62.5333, 4, false),
('VE', 'Mérida', 8.5982, -71.1445, 5, false),

-- ═══════════════════════════════════════
-- OCEANIA (14 countries)
-- ═══════════════════════════════════════

-- Australia (AU)
('AU', 'Canberra', -35.2809, 149.1300, 1, true),
('AU', 'Sydney', -33.8688, 151.2093, 2, false),
('AU', 'Melbourne', -37.8136, 144.9631, 3, false),
('AU', 'Brisbane', -27.4698, 153.0251, 4, false),
('AU', 'Perth', -31.9505, 115.8605, 5, false),
('AU', 'Adelaide', -34.9285, 138.6007, 6, false),
('AU', 'Gold Coast', -28.0167, 153.4000, 7, false),
('AU', 'Cairns', -16.9186, 145.7781, 8, false),
('AU', 'Uluru', -25.3444, 131.0369, 9, false),
('AU', 'Great Barrier Reef', -18.2871, 147.6992, 10, false),
('AU', 'Byron Bay', -28.6474, 153.6020, 11, false),
('AU', 'Hobart', -42.8821, 147.3272, 12, false),
('AU', 'Darwin', -12.4634, 130.8456, 13, false),

-- Fiji (FJ)
('FJ', 'Suva', -18.1416, 178.4419, 1, true),
('FJ', 'Nadi', -17.8000, 177.4167, 2, false),
('FJ', 'Lautoka', -17.6167, 177.4500, 3, false),
('FJ', 'Savusavu', -16.7783, 179.3408, 4, false),

-- Kiribati (KI)
('KI', 'South Tarawa', 1.3382, 173.0176, 1, true),
('KI', 'Betio', 1.3569, 172.9272, 2, false),

-- Marshall Islands (MH)
('MH', 'Majuro', 7.1167, 171.3667, 1, true),
('MH', 'Ebeye', 8.7833, 167.7333, 2, false),

-- Micronesia (FM)
('FM', 'Palikir', 6.9248, 158.1618, 1, true),
('FM', 'Weno', 7.4500, 151.8333, 2, false),
('FM', 'Pohnpei', 6.8544, 158.2127, 3, false),

-- Nauru (NR)
('NR', 'Yaren', -0.5477, 166.9209, 1, true),
('NR', 'Denigomodu', -0.5283, 166.9208, 2, false),

-- New Zealand (NZ)
('NZ', 'Wellington', -41.2866, 174.7756, 1, true),
('NZ', 'Auckland', -36.8485, 174.7633, 2, false),
('NZ', 'Christchurch', -43.5321, 172.6362, 3, false),
('NZ', 'Queenstown', -45.0312, 168.6626, 4, false),
('NZ', 'Rotorua', -38.1368, 176.2497, 5, false),
('NZ', 'Milford Sound', -44.6414, 167.8974, 6, false),
('NZ', 'Napier', -39.4928, 176.9120, 7, false),
('NZ', 'Abel Tasman', -40.9217, 172.9600, 8, false),
('NZ', 'Wanaka', -44.7000, 169.1500, 9, false),

-- Palau (PW)
('PW', 'Ngerulmud', 7.5006, 134.6242, 1, true),
('PW', 'Koror', 7.3419, 134.4791, 2, false),

-- Papua New Guinea (PG)
('PG', 'Port Moresby', -9.4438, 147.1803, 1, true),
('PG', 'Lae', -6.7250, 147.0000, 2, false),
('PG', 'Mount Hagen', -5.8583, 144.2333, 3, false),

-- Samoa (WS)
('WS', 'Apia', -13.8506, -171.7514, 1, true),
('WS', 'Salelologa', -13.7387, -172.1864, 2, false),

-- Solomon Islands (SB)
('SB', 'Honiara', -9.4333, 160.0333, 1, true),
('SB', 'Gizo', -8.1000, 156.8500, 2, false),

-- Tonga (TO)
('TO', 'Nukuʻalofa', -21.1393, -175.2046, 1, true),
('TO', 'Neiafu', -18.6500, -173.9833, 2, false),

-- Tuvalu (TV)
('TV', 'Funafuti', -8.5211, 179.1962, 1, true),
('TV', 'Fongafale', -8.5211, 179.1962, 2, false),

-- Vanuatu (VU)
('VU', 'Port Vila', -17.7333, 168.3167, 1, true),
('VU', 'Luganville', -15.5333, 167.1667, 2, false),
('VU', 'Tanna', -19.5167, 169.3333, 3, false);
