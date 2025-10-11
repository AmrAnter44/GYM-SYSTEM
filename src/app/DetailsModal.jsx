// ═══════════════════════════════════════════════════════════
// src/components/DetailsModal.jsx
// ═══════════════════════════════════════════════════════════
export default function DetailsModal({ member, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-8 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">تفاصيل العضو</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">الاسم</p>
              <p className="text-white font-semibold">{member.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">رقم التليفون</p>
              <p className="text-white font-semibold">{member.phone}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">نوع الاشتراك</p>
              <p className="text-white font-semibold">{member.subscription_type || member.subscriptionType}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">نوع الدفع</p>
              <p className="text-white font-semibold">{member.payment_type || member.paymentType}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">تاريخ البداية</p>
              <p className="text-white font-semibold">{member.subscription_start || member.subscriptionStart}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">تاريخ النهاية</p>
              <p className="text-white font-semibold">{member.subscription_end || member.subscriptionEnd}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">إجمالي المبلغ</p>
              <p className="text-white font-semibold">{member.total_amount || member.totalAmount} ج.م</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">المبلغ المدفوع</p>
              <p className="text-green-400 font-semibold">{member.paid_amount || member.paidAmount} ج.م</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">المبلغ المتبقي</p>
              <p className={`font-semibold ${(member.remaining_amount || member.remainingAmount) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {member.remaining_amount || member.remainingAmount} ج.م
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">تاريخ التسجيل</p>
              <p className="text-white font-semibold">{member.created_at || member.createdAt}</p>
            </div>
          </div>

          {member.notes && (
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-2">ملاحظات</p>
              <p className="text-white bg-gray-750 p-3 rounded">{member.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
          >
            إغلاق
          </button>
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            تعديل البيانات
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// src/components/EditModal.jsx
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';

export default function EditModal({ member, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: member.name,
    phone: member.phone,
    subscription_type: member.subscription_type || member.subscriptionType,
    payment_type: member.payment_type || member.paymentType,
    subscription_start: member.subscription_start || member.subscriptionStart,
    subscription_end: member.subscription_end || member.subscriptionEnd,
    total_amount: member.total_amount || member.totalAmount,
    paid_amount: member.paid_amount || member.paidAmount,
    remaining_amount: member.remaining_amount || member.remainingAmount,
    notes: member.notes || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'total_amount' || name === 'paid_amount') {
        const total = name === 'total_amount' ? parseFloat(value) || 0 : prev.total_amount;
        const paid = name === 'paid_amount' ? parseFloat(value) || 0 : prev.paid_amount;
        updated.remaining_amount = total - paid;
      }
      
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-3xl w-full p-8 border border-gray-700 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">✏️ تعديل بيانات العضو</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">الاسم</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">رقم التليفون</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">نوع الاشتراك</label>
              <select
                name="subscription_type"
                value={formData.subscription_type}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="شهري">شهري</option>
                <option value="3شهور">3 شهور</option>
                <option value="6شهور">6 شهور</option>
                <option value="سنوي">سنوي</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">نوع الدفع</label>
              <select
                name="payment_type"
                value={formData.payment_type}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="كاش">كاش</option>
                <option value="فيزا">فيزا</option>
                <option value="انستباي">انستباي</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">تاريخ البداية</label>
              <input
                type="date"
                name="subscription_start"
                value={formData.subscription_start}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">تاريخ النهاية</label>
              <input
                type="date"
                name="subscription_end"
                value={formData.subscription_end}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">إجمالي المبلغ</label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">المبلغ المدفوع</label>
              <input
                type="number"
                name="paid_amount"
                value={formData.paid_amount}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2 font-semibold">المبلغ المتبقي</label>
              <input
                type="number"
                name="remaining_amount"
                value={formData.remaining_amount}
                readOnly
                className={`w-full px-4 py-3 border border-gray-600 rounded-lg text-white font-bold cursor-not-allowed ${
                  formData.remaining_amount > 0 ? 'bg-red-900/50' : 'bg-green-900/50'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2 font-semibold">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            💾 حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// src/components/RenewModal.jsx
// ═══════════════════════════════════════════════════════════
export default function RenewModal({ member, onClose, onRenew }) {
  const subType = member.subscription_type || member.subscriptionType;
  let months = 1;
  
  switch(subType) {
    case '3شهور': months = 3; break;
    case '6شهور': months = 6; break;
    case 'سنوي': months = 12; break;
  }
  
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);
  const newEndDate = endDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-8 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">🔄 تجديد الاشتراك</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-750 p-4 rounded-lg">
            <p className="text-gray-400 text-sm mb-2">العضو</p>
            <p className="text-white text-xl font-bold">{member.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-750 p-3 rounded-lg">
              <p className="text-gray-400 text-xs mb-1">نوع الاشتراك</p>
              <p className="text-white font-semibold">{subType}</p>
            </div>
            <div className="bg-gray-750 p-3 rounded-lg">
              <p className="text-gray-400 text-xs mb-1">الاشتراك القديم انتهى</p>
              <p className="text-red-400 font-semibold">{member.subscription_end || member.subscriptionEnd}</p>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-600 p-4 rounded-lg">
            <p className="text-green-400 text-sm mb-2">📅 الاشتراك الجديد</p>
            <p className="text-white">
              <span className="font-bold">من اليوم</span> حتى 
              <span className="font-bold text-green-400 mr-1">{newEndDate}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
          >
            إلغاء
          </button>
          <button
            onClick={onRenew}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
          >
            ✅ تأكيد التجديد
          </button>
        </div>
      </div>
    </div>
  );
}