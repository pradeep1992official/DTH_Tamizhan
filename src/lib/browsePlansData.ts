import { BrowsePlan, DthOperatorId, PlanFilters } from '../types';

export const INITIAL_BROWSE_PLANS: BrowsePlan[] = [
  // ==========================================
  // SUN DIRECT
  // ==========================================
  {
    id: 'sun_hd_1m_prime',
    operator: 'sun_direct',
    name: 'Sun Direct Prime HD',
    tamilName: 'சன் பிரைம் எச்டி',
    type: 'HD',
    duration_months: 1,
    price: 299,
    monthly_equivalent_rate: 299,
    channel_count: 210,
    hd_channel_count: 32,
    channels: [
      'Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 
      'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 
      'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 
      'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    is_recommended: true,
    description: 'Premier Tamil HD family bouquet with 32 crystal clear HD channels and complete sports package.',
  },
  {
    id: 'sun_hd_3m_prime',
    operator: 'sun_direct',
    name: 'Sun Direct Prime HD (Quarterly)',
    tamilName: 'சன் பிரைம் எச்டி (3 மாதங்கள்)',
    type: 'HD',
    duration_months: 3,
    price: 849,
    monthly_equivalent_rate: 299,
    channel_count: 210,
    hd_channel_count: 32,
    channels: [
      'Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 
      'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Discovery HD Tamil', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: false,
    description: 'Quarterly saver pack for Sun Direct Prime HD with high picture clarity.',
  },
  {
    id: 'sun_hd_6m_prime',
    operator: 'sun_direct',
    name: 'Sun Direct Prime HD (6 Months Saver)',
    tamilName: 'சன் பிரைம் எச்டி (6 மாதங்கள்)',
    type: 'HD',
    duration_months: 6,
    price: 1599,
    monthly_equivalent_rate: 299,
    channel_count: 210,
    hd_channel_count: 32,
    channels: [
      'Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 
      'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    is_recommended: true,
    description: 'Save big with 6 months upfront recharge. Zero interruptions for half a year.',
  },
  {
    id: 'sun_hd_12m_prime',
    operator: 'sun_direct',
    name: 'Sun Direct Prime HD (Annual Dhamaka)',
    tamilName: 'சன் பிரைம் எச்டி (வருடாந்திர தமக்கா)',
    type: 'HD',
    duration_months: 12,
    price: 2999,
    monthly_equivalent_rate: 299,
    channel_count: 210,
    hd_channel_count: 32,
    channels: [
      'Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 
      'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    is_recommended: true,
    description: 'Highest annual discount with unlimited Tamil HD entertainment and complete sports.',
  },
  {
    id: 'sun_sd_1m_super',
    operator: 'sun_direct',
    name: 'Sun Direct Tamil Super Pack',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் பேக்',
    type: 'SD',
    duration_months: 1,
    price: 219,
    monthly_equivalent_rate: 219,
    channel_count: 145,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 
      'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: true,
    description: 'The definitive budget pack for every Tamil household with all major entertainment and news.',
  },
  {
    id: 'sun_sd_6m_super',
    operator: 'sun_direct',
    name: 'Sun Direct Tamil Super Pack (6 Months)',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் (6 மாதங்கள்)',
    type: 'SD',
    duration_months: 6,
    price: 1199,
    monthly_equivalent_rate: 219,
    channel_count: 145,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    is_recommended: false,
    description: '6 months advance pack for the popular Tamil Super Pack at an economical rate.',
  },
  {
    id: 'sun_sd_12m_super',
    operator: 'sun_direct',
    name: 'Sun Direct Tamil Super Pack (Annual)',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் (வருடாந்திரம்)',
    type: 'SD',
    duration_months: 12,
    price: 2250,
    monthly_equivalent_rate: 219,
    channel_count: 145,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news', 'sports'],
    is_recommended: true,
    description: 'Full 365 days of nonstop Tamil family television at less than ₹188 per month.',
  },

  // ==========================================
  // TATA PLAY
  // ==========================================
  {
    id: 'tp_hd_1m_thalaiva',
    operator: 'tata_play',
    name: 'Tata Play Tamil Thalaiva HD',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி',
    type: 'HD',
    duration_months: 1,
    price: 360,
    monthly_equivalent_rate: 360,
    channel_count: 240,
    hd_channel_count: 38,
    channels: [
      'Star Vijay HD', 'Sun TV HD', 'Zee Tamil HD', 'KTV HD', 'Colors Tamil HD', 
      'Vijay Super HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Star Movies HD', 
      'National Geographic HD', 'Nick HD+', 'Thanthi TV', 'Puthiya Thalaimurai', 'Sun News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids', 'news'],
    is_recommended: true,
    description: 'Flagship Tata Play HD pack tailored for Tamil Nadu viewers with top serials and live cricket.',
  },
  {
    id: 'tp_hd_3m_thalaiva',
    operator: 'tata_play',
    name: 'Tata Play Tamil Thalaiva HD (3 Months)',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி (3 மாதங்கள்)',
    type: 'HD',
    duration_months: 3,
    price: 1020,
    monthly_equivalent_rate: 360,
    channel_count: 240,
    hd_channel_count: 38,
    channels: [
      'Star Vijay HD', 'Sun TV HD', 'Zee Tamil HD', 'KTV HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'National Geographic HD', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: false,
    description: '3-month quarter package with premium HD clarity on all Tamil channels.',
  },
  {
    id: 'tp_hd_6m_thalaiva',
    operator: 'tata_play',
    name: 'Tata Play Tamil Thalaiva HD (6 Months)',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி (6 மாதங்கள்)',
    type: 'HD',
    duration_months: 6,
    price: 1950,
    monthly_equivalent_rate: 360,
    channel_count: 240,
    hd_channel_count: 38,
    channels: [
      'Star Vijay HD', 'Sun TV HD', 'Zee Tamil HD', 'KTV HD', 'Colors Tamil HD', 
      'Vijay Super HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Star Movies HD', 
      'National Geographic HD', 'Nick HD+', 'Thanthi TV', 'Sun News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids', 'news'],
    is_recommended: true,
    description: 'Save ₹210 with the 6-month semi-annual plan. Ideal for high-definition smart TVs.',
  },
  {
    id: 'tp_hd_12m_thalaiva',
    operator: 'tata_play',
    name: 'Tata Play Tamil Thalaiva HD (Annual Mega)',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி (ஆண்டு)',
    type: 'HD',
    duration_months: 12,
    price: 3699,
    monthly_equivalent_rate: 360,
    channel_count: 240,
    hd_channel_count: 38,
    channels: [
      'Star Vijay HD', 'Sun TV HD', 'Zee Tamil HD', 'KTV HD', 'Colors Tamil HD', 
      'Vijay Super HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Star Movies HD', 
      'National Geographic HD', 'Nick HD+', 'Thanthi TV', 'Puthiya Thalaimurai', 'Sun News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids', 'news'],
    is_recommended: true,
    description: 'Best annual Tata Play subscription. Uninterrupted premium HD entertainment for 365 days.',
  },
  {
    id: 'tp_sd_1m_basic',
    operator: 'tata_play',
    name: 'Tata Play Tamil Classic SD',
    tamilName: 'டாடா பிளே தமிழ் கிளாசிக்',
    type: 'SD',
    duration_months: 1,
    price: 245,
    monthly_equivalent_rate: 245,
    channel_count: 160,
    hd_channel_count: 0,
    channels: [
      'Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Sun Music', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: false,
    description: 'Essential Tamil SD package with core entertainment, music, news, and regional cinema.',
  },
  {
    id: 'tp_sd_12m_basic',
    operator: 'tata_play',
    name: 'Tata Play Tamil Classic SD (Annual)',
    tamilName: 'டாடா பிளே தமிழ் கிளாசிக் (வருடாந்திரம்)',
    type: 'SD',
    duration_months: 12,
    price: 2499,
    monthly_equivalent_rate: 245,
    channel_count: 160,
    hd_channel_count: 0,
    channels: [
      'Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Sun Music', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: true,
    description: 'Year-long budget plan for Tata Play standard definition set-top boxes.',
  },

  // ==========================================
  // AIRTEL DIGITAL TV
  // ==========================================
  {
    id: 'airtel_hd_1m_dhamaka',
    operator: 'airtel_dth',
    name: 'Airtel Tamil Mega HD Dhamaka',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி தமக்கா',
    type: 'HD',
    duration_months: 1,
    price: 335,
    monthly_equivalent_rate: 335,
    channel_count: 225,
    hd_channel_count: 35,
    channels: [
      'Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 2 HD', 'National Geographic HD', 
      'Animal Planet HD', 'Nick HD+', 'Sun News', 'Puthiya Thalaimurai', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    is_recommended: true,
    description: 'Airtel comprehensive Tamil HD pack with high-speed audio and 35 crystal clear HD feeds.',
  },
  {
    id: 'airtel_hd_3m_dhamaka',
    operator: 'airtel_dth',
    name: 'Airtel Tamil Mega HD (3 Months)',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி (3 மாதங்கள்)',
    type: 'HD',
    duration_months: 3,
    price: 949,
    monthly_equivalent_rate: 335,
    channel_count: 225,
    hd_channel_count: 35,
    channels: [
      'Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 2 HD', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: false,
    description: 'Quarterly entertainment booster pack with sports and movies in HD.',
  },
  {
    id: 'airtel_hd_6m_dhamaka',
    operator: 'airtel_dth',
    name: 'Airtel Tamil Mega HD (6 Months)',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி (6 மாதங்கள்)',
    type: 'HD',
    duration_months: 6,
    price: 1799,
    monthly_equivalent_rate: 335,
    channel_count: 225,
    hd_channel_count: 35,
    channels: [
      'Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 2 HD', 'National Geographic HD', 
      'Animal Planet HD', 'Nick HD+', 'Sun News', 'Puthiya Thalaimurai', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    is_recommended: true,
    description: 'Half-yearly saver pack with discounts on monthly recharge commitment.',
  },
  {
    id: 'airtel_hd_12m_dhamaka',
    operator: 'airtel_dth',
    name: 'Airtel Tamil Mega HD (Annual)',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி (வருடாந்திரம்)',
    type: 'HD',
    duration_months: 12,
    price: 3399,
    monthly_equivalent_rate: 335,
    channel_count: 225,
    hd_channel_count: 35,
    channels: [
      'Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 2 HD', 'National Geographic HD', 
      'Animal Planet HD', 'Nick HD+', 'Sun News', 'Puthiya Thalaimurai', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    is_recommended: true,
    description: 'Best-in-class annual pack for Airtel DTH customers across Tamil Nadu.',
  },
  {
    id: 'airtel_sd_1m_super',
    operator: 'airtel_dth',
    name: 'Airtel Tamil Super SD',
    tamilName: 'ஏர்டெல் தமிழ் சூப்பர் எஸ்.டி',
    type: 'SD',
    duration_months: 1,
    price: 230,
    monthly_equivalent_rate: 230,
    channel_count: 150,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Sun Music', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Polimer News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: false,
    description: 'Affordable SD plan for Airtel digital subscribers with all top Tamil channels.',
  },
  {
    id: 'airtel_sd_12m_super',
    operator: 'airtel_dth',
    name: 'Airtel Tamil Super SD (Annual)',
    tamilName: 'ஏர்டெல் தமிழ் சூப்பர் எஸ்.டி (ஆண்டு)',
    type: 'SD',
    duration_months: 12,
    price: 2350,
    monthly_equivalent_rate: 230,
    channel_count: 150,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Sun Music', 
      'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Polimer News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: true,
    description: 'Annual budget-friendly pack with 12 months validity and zero monthly recharge worries.',
  },

  // ==========================================
  // DISH TV
  // ==========================================
  {
    id: 'dishtv_hd_1m_swag',
    operator: 'dish_tv',
    name: 'Dish TV Tamil Swag HD',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக் எச்டி',
    type: 'HD',
    duration_months: 1,
    price: 289,
    monthly_equivalent_rate: 289,
    channel_count: 205,
    hd_channel_count: 30,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: true,
    description: 'High value HD package for Dish TV viewers with prime Tamil television & sports.',
  },
  {
    id: 'dishtv_hd_3m_swag',
    operator: 'dish_tv',
    name: 'Dish TV Tamil Swag HD (3 Months)',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக் எச்டி (3 மாதங்கள்)',
    type: 'HD',
    duration_months: 3,
    price: 819,
    monthly_equivalent_rate: 289,
    channel_count: 205,
    hd_channel_count: 30,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: false,
    description: 'Quarterly HD pack with clear digital picture quality and Tamil movies.',
  },
  {
    id: 'dishtv_hd_6m_swag',
    operator: 'dish_tv',
    name: 'Dish TV Tamil Swag HD (6 Months)',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக் எச்டி (6 மாதங்கள்)',
    type: 'HD',
    duration_months: 6,
    price: 1549,
    monthly_equivalent_rate: 289,
    channel_count: 205,
    hd_channel_count: 30,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Sun News', 'Thanthi TV', 'Polimer News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: true,
    description: 'Half-yearly saver plan for Dish TV set-top boxes with attractive rate.',
  },
  {
    id: 'dishtv_hd_12m_swag',
    operator: 'dish_tv',
    name: 'Dish TV Tamil Swag HD (Annual)',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக் எச்டி (ஆண்டு)',
    type: 'HD',
    duration_months: 12,
    price: 2899,
    monthly_equivalent_rate: 289,
    channel_count: 205,
    hd_channel_count: 30,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: true,
    description: 'Full year Dish TV HD plan with maximum savings and all premier channels.',
  },
  {
    id: 'dishtv_sd_1m_lite',
    operator: 'dish_tv',
    name: 'Dish TV Tamil Swag SD',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக் எஸ்.டி',
    type: 'SD',
    duration_months: 1,
    price: 215,
    monthly_equivalent_rate: 215,
    channel_count: 140,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Sun Music', 
      'Star Sports 1 Tamil', 'Sun News', 'Thanthi TV', 'Polimer News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    is_recommended: false,
    description: 'Budget-friendly Tamil entertainment covering top serials, comedy, and music.',
  },
  {
    id: 'dishtv_sd_12m_lite',
    operator: 'dish_tv',
    name: 'Dish TV Tamil Swag SD (Annual)',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக் எஸ்.டி (வருடாந்திரம்)',
    type: 'SD',
    duration_months: 12,
    price: 2199,
    monthly_equivalent_rate: 215,
    channel_count: 140,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Sun Music', 
      'Star Sports 1 Tamil', 'Sun News', 'Thanthi TV', 'Polimer News'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    is_recommended: true,
    description: 'Economical annual package for standard definition television viewers.',
  },

  // ==========================================
  // D2H VIDEOCON
  // ==========================================
  {
    id: 'd2h_hd_1m_joy',
    operator: 'd2h',
    name: 'D2H Tamil Joy HD',
    tamilName: 'டி2எச் தமிழ் ஜாய் எச்டி',
    type: 'HD',
    duration_months: 1,
    price: 295,
    monthly_equivalent_rate: 295,
    channel_count: 208,
    hd_channel_count: 31,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: true,
    description: 'Premium Tamil entertainment pack on D2H with HD picture and crystal clear sound.',
  },
  {
    id: 'd2h_hd_3m_joy',
    operator: 'd2h',
    name: 'D2H Tamil Joy HD (3 Months)',
    tamilName: 'டி2எச் தமிழ் ஜாய் எச்டி (3 மாதங்கள்)',
    type: 'HD',
    duration_months: 3,
    price: 835,
    monthly_equivalent_rate: 295,
    channel_count: 208,
    hd_channel_count: 31,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: false,
    description: '3 months D2H HD recharge option for regular Tamil television subscribers.',
  },
  {
    id: 'd2h_hd_6m_joy',
    operator: 'd2h',
    name: 'D2H Tamil Joy HD (6 Months)',
    tamilName: 'டி2எச் தமிழ் ஜாய் எச்டி (6 மாதங்கள்)',
    type: 'HD',
    duration_months: 6,
    price: 1575,
    monthly_equivalent_rate: 295,
    channel_count: 208,
    hd_channel_count: 31,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: true,
    description: '6 months advance subscription for D2H Videocon smart HD receivers.',
  },
  {
    id: 'd2h_hd_12m_joy',
    operator: 'd2h',
    name: 'D2H Tamil Joy HD (Annual)',
    tamilName: 'டி2எச் தமிழ் ஜாய் எச்டி (ஆண்டு)',
    type: 'HD',
    duration_months: 12,
    price: 2950,
    monthly_equivalent_rate: 295,
    channel_count: 208,
    hd_channel_count: 31,
    channels: [
      'Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 
      'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil', 
      'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    is_recommended: true,
    description: 'Best annual package for D2H Videocon users with high savings.',
  },
  {
    id: 'd2h_sd_1m_joy',
    operator: 'd2h',
    name: 'D2H Tamil Joy SD',
    tamilName: 'டி2எச் தமிழ் ஜாய் எஸ்.டி',
    type: 'SD',
    duration_months: 1,
    price: 220,
    monthly_equivalent_rate: 220,
    channel_count: 142,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music', 'Star Sports 1 Tamil', 
      'Discovery Tamil', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: false,
    description: 'Economical SD plan with all leading regional Tamil channels.',
  },
  {
    id: 'd2h_sd_12m_joy',
    operator: 'd2h',
    name: 'D2H Tamil Joy SD (Annual)',
    tamilName: 'டி2எச் தமிழ் ஜாய் எஸ்.டி (வருடாந்திரம்)',
    type: 'SD',
    duration_months: 12,
    price: 2250,
    monthly_equivalent_rate: 220,
    channel_count: 142,
    hd_channel_count: 0,
    channels: [
      'Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music', 'Star Sports 1 Tamil', 
      'Discovery Tamil', 'Sun News', 'Thanthi TV'
    ],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    is_recommended: true,
    description: 'Yearly standard definition package with zero monthly recharge friction.',
  },
];

/**
 * Computes ranking metrics for a list of plans:
 * 1. price_per_channel = price / channel_count
 * 2. savings_pct = ((monthly_equivalent_rate * duration_months) - price) / (monthly_equivalent_rate * duration_months)
 * 3. Best Value badge: lowest price_per_channel in the set
 * 4. Best Savings badge: highest savings_pct (> 0) in the set
 */
export function computePlanMetrics(plans: BrowsePlan[]): BrowsePlan[] {
  if (!plans.length) return [];

  // 1. Calculate basic metrics
  const enriched = plans.map((plan) => {
    const channelCount = Math.max(1, plan.channel_count || 1);
    const pricePerChannel = Math.round((plan.price / channelCount) * 100) / 100;

    const baseCost = (plan.monthly_equivalent_rate || plan.price) * (plan.duration_months || 1);
    const savingsPct = baseCost > plan.price
      ? Math.round(((baseCost - plan.price) / baseCost) * 100)
      : 0;

    return {
      ...plan,
      price_per_channel: pricePerChannel,
      savings_pct: savingsPct,
    };
  });

  // 2. Identify Best Value (lowest price_per_channel)
  let lowestPpc = Infinity;
  let highestSavings = 0;

  for (const p of enriched) {
    if (p.price_per_channel !== undefined && p.price_per_channel < lowestPpc) {
      lowestPpc = p.price_per_channel;
    }
    if (p.savings_pct !== undefined && p.savings_pct > highestSavings) {
      highestSavings = p.savings_pct;
    }
  }

  // 3. Mark computed badges
  return enriched.map((p) => ({
    ...p,
    is_best_value: lowestPpc < Infinity && p.price_per_channel === lowestPpc,
    is_best_savings: highestSavings > 0 && p.savings_pct === highestSavings,
  }));
}

/**
 * Filters and sorts plans based on user selection
 */
export function filterAndSortPlans(plans: BrowsePlan[], filters: PlanFilters): BrowsePlan[] {
  let filtered = plans.filter((p) => {
    // Operator multi-select
    if (filters.operators.length > 0 && !filters.operators.includes(p.operator)) {
      return false;
    }

    // Type filter
    if (filters.type !== 'all' && p.type !== filters.type) {
      return false;
    }

    // Duration filter
    if (filters.durations.length > 0 && !filters.durations.includes(p.duration_months)) {
      return false;
    }

    // Price range
    if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) {
      return false;
    }

    // Channel count range
    if (p.channel_count < filters.channelRange[0] || p.channel_count > filters.channelRange[1]) {
      return false;
    }

    // Genre tags (if any selected, plan must contain at least one)
    if (filters.genreTags.length > 0) {
      const hasGenre = filters.genreTags.some((g) => p.genre_tags.includes(g.toLowerCase()));
      if (!hasGenre) return false;
    }

    // Search query (combines as strict AND with genre tags and other filters)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchTamil = (p.tamilName || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchChannel = p.channels.some((c) => c.toLowerCase().includes(q));
      const matchGenreTag = p.genre_tags.some((g) => g.toLowerCase().includes(q));
      if (!matchName && !matchTamil && !matchDesc && !matchChannel && !matchGenreTag) {
        return false;
      }
    }

    return true;
  });

  // Re-compute badges for the filtered subset
  const computed = computePlanMetrics(filtered);

  // Sorting
  computed.sort((a, b) => {
    switch (filters.sortBy) {
      case 'recommended':
        if (a.is_recommended !== b.is_recommended) {
          return a.is_recommended ? -1 : 1;
        }
        return a.price - b.price;

      case 'price_asc':
        return a.price - b.price;

      case 'price_desc':
        return b.price - a.price;

      case 'price_per_channel_asc':
        return (a.price_per_channel || 0) - (b.price_per_channel || 0);

      case 'savings_pct_desc':
        return (b.savings_pct || 0) - (a.savings_pct || 0);

      case 'channels_desc':
        return b.channel_count - a.channel_count;

      default:
        return 0;
    }
  });

  return computed;
}
