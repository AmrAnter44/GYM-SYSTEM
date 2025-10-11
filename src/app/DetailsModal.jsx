// ═══════════════════════════════════════════════════════════
// ملف: src/components/DetailsModal.jsx
// Modal لعرض تفاصيل العضو
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