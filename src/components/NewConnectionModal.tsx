import React, { useState } from 'react';
import { 
  X, 
  Tv, 
  CheckCircle2, 
  Truck, 
  Wrench
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../lib/translations';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
}

export const NewConnectionModal: React.FC<NewConnectionModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  const [operator, setOperator] = useState('sun_direct');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState('Chennai');
  const [address, setAddress] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [bookingId, setBookingId] = useState('');

  if (!isOpen) return null;

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `BOOK-TN-${Math.floor(100000 + Math.random() * 900000)}`;
    setBookingId(id);
    setIsBooked(true);
  };

  const tnDistricts = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 
    'Tirunelveli', 'Erode', 'Vellore', 'Thanjavur', 'Dindigul', 
    'Kanchipuram', 'Cuddalore', 'Tiruppur', 'Nagercoil / Kanyakumari'
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-dish-title"
        className="bg-[#0e1935] border border-[#1e3058] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 id="new-dish-title" className="text-base font-bold text-white leading-tight">
                {t.newDishTitle}
              </h2>
              <p className="text-xs text-gray-300">
                {currentLang === 'ta' ? 'தமிழ்நாடு முழுவதும் வீட்டு வாசலில் பொருத்தும் சேவை' : 'Doorstep Installation across Tamil Nadu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!isBooked ? (
            <form onSubmit={handleBooking} className="space-y-4 text-xs">
              {/* Operator Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  {t.selectDishOperator}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sun_direct', name: 'Sun Direct HD', price: '₹1,399', highlight: '1 Month Tamil Pack' },
                    { id: 'tata_play', name: 'Tata Play HD', price: '₹1,499', highlight: 'Free Binge App' },
                    { id: 'airtel_dth', name: 'Airtel HD', price: '₹1,449', highlight: 'Dolby Sound STB' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setOperator(item.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all text-left ${
                        operator === item.id
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                          : 'bg-[#070e1e] border-[#172545] text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <p className="font-bold text-white text-xs">{item.name}</p>
                      <p className="font-mono font-bold text-amber-400 text-sm mt-0.5">{item.price}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.highlight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inclusions */}
              <div className="bg-[#070e1e] p-3.5 rounded-2xl border border-[#172545] grid grid-cols-3 gap-2 text-center text-gray-200">
                <div className="space-y-1">
                  <Tv className="w-4 h-4 text-amber-400 mx-auto" />
                  <span className="text-xs block font-semibold">HD STB + Remote</span>
                </div>
                <div className="space-y-1">
                  <Wrench className="w-4 h-4 text-emerald-400 mx-auto" />
                  <span className="text-xs block font-semibold">10m Cable + Dish</span>
                </div>
                <div className="space-y-1">
                  <Truck className="w-4 h-4 text-blue-400 mx-auto" />
                  <span className="text-xs block font-semibold">Technician Setup</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    {t.fullNameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Senthil Kumar"
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    {t.contactNumberLabel} *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    {t.districtLabel}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {tnDistricts.map((d) => (
                      <option key={d} value={d} className="bg-[#070e1e]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    {t.installationAddressLabel}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Door no, Street, Area"
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim() || mobile.length < 10}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 font-bold text-sm transition-all shadow-md mt-2"
              >
                {t.bookConnectionBtn}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t.bookingSuccess}
                </h3>
                <p className="text-xs font-mono text-amber-400 font-bold mt-1">
                  Booking ID: {bookingId}
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  {currentLang === 'ta' ? 'எங்கள் உள்ளூர் தொழில்நுட்ப வல்லுநர் உங்களைத் தொடர்புகொள்வார்.' : 'Our technician will arrive at your address within 24 hours.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                {t.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
