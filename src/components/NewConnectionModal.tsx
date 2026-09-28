import React, { useState } from 'react';
import { 
  X, 
  Tv, 
  CheckCircle2, 
  Sparkles, 
  Truck, 
  Wrench, 
  ShieldCheck, 
  Calendar, 
  Phone
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../lib/translations';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e1935] border border-[#1e3058] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c5a059]/15 text-[#dfb86c] flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif-royal font-bold text-[#f5f2eb] leading-tight">
                {currentLang === 'ta' ? 'புதிய டிடிஎச் டிஷ் இணைப்பு முன்பதிவு' : 'Book New DTH Connection'}
              </h2>
              <p className="text-xs text-[#8e9cb4]">
                Set-Top Box + Dish Antenna + Doorstep Installation in Tamil Nadu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e9cb4] hover:text-[#f5f2eb] hover:bg-[#142345] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!isBooked ? (
            <form onSubmit={handleBooking} className="space-y-4 text-xs">
              {/* Operator Cards */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8e9cb4] uppercase tracking-wider block">
                  Select Preferred DTH Brand
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sun_direct', name: 'Sun Direct HD', price: '₹1,399', highlight: '1 Month Included Tamil Pack' },
                    { id: 'tata_play', name: 'Tata Play HD', price: '₹1,499', highlight: 'Free Binge App Access' },
                    { id: 'airtel_dth', name: 'Airtel HD', price: '₹1,449', highlight: 'Dolby Sound Box' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setOperator(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${
                        operator === item.id
                          ? 'bg-[#c5a059]/15 border-[#c5a059] text-[#f5f2eb] shadow'
                          : 'bg-[#070e1e] border-[#172545] text-[#8e9cb4] hover:bg-[#101c3d]'
                      }`}
                    >
                      <p className="font-bold text-[#f5f2eb] text-xs">{item.name}</p>
                      <p className="font-mono font-bold text-[#dfb86c] text-sm mt-0.5">{item.price}</p>
                      <p className="text-[10px] text-[#8e9cb4] mt-1 line-clamp-1">{item.highlight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inclusions */}
              <div className="bg-[#070e1e] p-3 rounded-xl border border-[#172545] grid grid-cols-3 gap-2 text-center text-[#c7d2e5]">
                <div className="space-y-1">
                  <Tv className="w-4 h-4 text-[#dfb86c] mx-auto" />
                  <span className="text-[10px] block font-medium">Full HD STB + Remote</span>
                </div>
                <div className="space-y-1">
                  <Wrench className="w-4 h-4 text-emerald-400 mx-auto" />
                  <span className="text-[10px] block font-medium">10m Cable + Dish</span>
                </div>
                <div className="space-y-1">
                  <Truck className="w-4 h-4 text-[#a4b8db] mx-auto" />
                  <span className="text-[10px] block font-medium">TN Technician Setup</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8e9cb4] block font-medium mb-1">
                    Customer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Senthil Kumar"
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-lg px-3 py-2 text-[#f5f2eb] focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
                <div>
                  <label className="text-[#8e9cb4] block font-medium mb-1">
                    Contact Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="98401 23456"
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-lg px-3 py-2 text-[#f5f2eb] font-mono focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8e9cb4] block font-medium mb-1">
                    District in Tamil Nadu
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-lg px-3 py-2 text-[#f5f2eb] focus:outline-none focus:border-[#c5a059]"
                  >
                    {tnDistricts.map((d) => (
                      <option key={d} value={d} className="bg-[#0e1935] text-[#f5f2eb]">{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#8e9cb4] block font-medium mb-1">
                    Installation Street / Area Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Door No, Street Name, Landmark"
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-lg px-3 py-2 text-[#f5f2eb] focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#c5a059] hover:bg-[#b89248] text-[#080d1a] font-bold text-xs transition-colors shadow-lg shadow-black/30 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#080d1a]" />
                <span>Confirm Booking (Pay on Installation)</span>
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-serif-royal font-bold text-[#f5f2eb]">
                  Booking Confirmed
                </h3>
                <p className="text-xs text-[#8e9cb4] mt-1">
                  Booking Reference: <span className="font-mono text-[#dfb86c] font-bold">{bookingId}</span>
                </p>
              </div>

              <div className="bg-[#070e1e] p-4 rounded-xl border border-[#172545] text-xs text-[#c7d2e5] space-y-2 text-left">
                <p className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#dfb86c] shrink-0" />
                  <span>Authorized Tamil Nadu DTH technician will arrive within 24 hours.</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Confirmation SMS has been queued to <strong>+91 {mobile}</strong>.</span>
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#142345] hover:bg-[#1c305e] text-[#f5f2eb] font-bold text-xs transition-colors border border-[#1e3058]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
