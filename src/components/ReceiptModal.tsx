import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Printer, 
  Radio, 
  Share2,
  Tv
} from 'lucide-react';
import { RechargeOrder, Language } from '../types';
import { translations } from '../lib/translations';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface ReceiptModalProps {
  order: RechargeOrder | null;
  onClose: () => void;
  currentLang: Language;
  onTriggerRefresh: (operator: any, card: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  onClose,
  currentLang,
  onTriggerRefresh,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen: Boolean(order), onClose });

  if (!order) return null;

  const basePrice = (order.amount / 1.18).toFixed(2);
  const gstAmount = (order.amount - Number(basePrice)).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*DTH Tamizhan Recharge Receipt*\n` +
      `Operator: ${order.operatorName}\n` +
      `Viewing Card: ${order.smartCardNumber}\n` +
      `Pack: ${order.packName}\n` +
      `Amount Paid: ₹${order.amount}\n` +
      `Order ID: ${order.orderId}\n` +
      `Ref ID: ${order.operatorRefId}\n` +
      `Date: ${new Date(order.createdAt).toLocaleDateString()}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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
        aria-labelledby="receipt-modal-title"
        className="bg-[#0e1935] border border-[#1e3058] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-left"
      >
        {/* Receipt Header Badge */}
        <div className="bg-emerald-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="receipt-modal-title" className="text-base font-bold tracking-tight">
                {t.rechargeSuccess}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                {currentLang === 'ta' ? 'ரீசார்ஜ் வெற்றிகரமாக முடிந்தது' : 'Recharge Processed Successfully'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-700/50 transition-colors focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 space-y-5 bg-[#0e1935] printable-receipt">
          {/* Brand Watermark */}
          <div className="flex items-center justify-between border-b border-[#172545] pb-3">
            <div>
              <span className="font-bold text-base text-white">
                DTH <span className="text-amber-400">தமிழன்</span>
              </span>
              <p className="text-xs text-gray-400">
                {currentLang === 'ta' ? 'அதிகாரப்பூர்வ டிடிஎச் ரீசார்ஜ் ரசீது' : 'Official DTH Recharge Tax Invoice'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block">{t.dateLabel}</span>
              <span className="text-xs font-mono text-gray-200">
                {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Key Reference Numbers */}
          <div className="grid grid-cols-2 gap-3 bg-[#070e1e] p-3.5 rounded-2xl border border-[#172545] text-xs">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">
                {t.orderIdLabel}
              </span>
              <span className="font-mono font-bold text-white text-xs">
                {order.orderId}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">
                {t.operatorRefLabel}
              </span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {order.operatorRefId}
              </span>
            </div>
          </div>

          {/* Connection & Plan Details */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-gray-300">DTH Operator</span>
              <span className="font-bold text-white">{order.operatorName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-gray-300">{t.viewingCardLabel}</span>
              <span className="font-mono font-bold text-amber-300">
                {order.smartCardNumber}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-gray-300">{t.packAppliedLabel}</span>
              <span className="font-semibold text-white">{order.packName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-gray-300">{t.validity}</span>
              <span className="font-medium text-gray-200">{order.packValidity}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-gray-300">Payment Mode</span>
              <span className="font-medium text-gray-200 uppercase">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Price Calculation Breakdown */}
          <div className="bg-[#070e1e] p-3.5 rounded-2xl border border-[#172545] space-y-2 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Base Recharge Value</span>
              <span className="font-mono">₹{basePrice}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>GST (18%)</span>
              <span className="font-mono">₹{gstAmount}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#172545] font-bold text-sm text-white">
              <span>{t.totalPayable}</span>
              <span className="font-mono text-amber-400">₹{order.amount}</span>
            </div>
          </div>

          {/* Channel Activation Notice & Signal Refresh Helper */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
            <div className="flex items-start gap-2 text-amber-300 text-xs font-semibold">
              <Tv className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.channelsActiveNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerRefresh(order.operator, order.smartCardNumber);
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t.triggerRefresh}</span>
            </button>
          </div>

          {/* Receipt Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/10"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printReceipt}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.shareWhatsApp}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
