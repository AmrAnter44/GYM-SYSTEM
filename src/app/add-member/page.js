"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberRegistrationForm() {
  const router = useRouter();

  // ═══════════════════════════════════════════════════════════
  // 📅 HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  // حساب تاريخ النهاية تلقائياً
  const calculateEndDate = (startDate, type) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    let months = 0;
    
    switch(type) {
      case 'شهري': months = 1; break;
      case '3شهور': months = 3; break;
      case '6شهور': months = 6; break;
      case 'سنوي': months = 12; break;
      default: months = 1;
    }
    
    start.setMonth(start.getMonth() + months);
    return start.toISOString().split('T')[0];
  };

  // تاريخ اليوم بصيغة YYYY-MM-DD
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const todayDate = getTodayDate();

  // ═══════════════════════════════════════════════════════════
  // 📝 STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  const [formData, setFormData] = useState({
    custom_id: '',
    name: '',
    phone: '',
    photo: null,
    subscriptionType: 'شهري',
    subscriptionStart: todayDate,
    subscriptionEnd: calculateEndDate(todayDate, 'شهري'),
    paymentType: 'كاش',
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    notes: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // 🎯 EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // تحديث تاريخ النهاية تلقائياً
      if (name === 'subscriptionStart' || name === 'subscriptionType') {
        updated.subscriptionEnd = calculateEndDate(
          name === 'subscriptionStart' ? value : prev.subscriptionStart,
          name === 'subscriptionType' ? value : prev.subscriptionType
        );
      }
      
      // حساب المتبقي تلقائياً
      if (name === 'totalAmount' || name === 'paidAmount') {
        const total = name === 'totalAmount' ? parseFloat(value) || 0 : prev.totalAmount;
        const paid = name === 'paidAmount' ? parseFloat(value) || 0 : prev.paidAmount;
        updated.remainingAmount = total - paid;
      }
      
      return updated;
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        alert('⚠️ من فضلك اختر صورة فقط');
        return;
      }

      // التحقق من حجم الملف (أقل من 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('⚠️ حجم الصورة كبير جداً (أقصى حجم 5MB)');
        return;
      }

      setFormData(prev => ({ ...prev, photo: file }));
      
      // عرض الصورة
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // التحقق من البيانات المطلوبة
    if (!formData.name || !formData.phone || !formData.subscriptionStart) {
      alert('⚠️ من فضلك أكمل البيانات المطلوبة (الاسم، التليفون، تاريخ البداية)');
      return;
    }

    // التحقق من رقم التليفون
    if (formData.phone.length < 11) {
      alert('⚠️ رقم التليفون غير صحيح');
      return;
    }

    setIsSubmitting(true);

    try {
      // تحويل الصورة إلى Base64 إذا كانت موجودة
      let photoBase64 = null;
      if (formData.photo) {
        const reader = new FileReader();
        photoBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(formData.photo);
        });
      }

      const memberData = {
        custom_id: formData.custom_id || null,
        name: formData.name,
        phone: formData.phone,
        photo: photoBase64,
        subscriptionType: formData.subscriptionType,
        subscriptionStart: formData.subscriptionStart,
        subscriptionEnd: formData.subscriptionEnd,
        paymentType: formData.paymentType,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        remainingAmount: parseFloat(formData.remainingAmount) || 0,
        notes: formData.notes || ''
      };

      console.log('📤 Sending member data:', memberData);

      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.addMember(memberData);

        if (result.success) {
          alert('✅ تم تسجيل العضو بنجاح!\n\nرقم العضو: ' + (formData.custom_id || result.id));
          
          // الانتقال إلى صفحة الأعضاء
          setTimeout(() => {
            router.push('/members');
          }, 1000);
        } else {
          alert('❌ خطأ في التسجيل: ' + result.error);
        }
      } else {
        // للتطوير بدون Electron
        console.log('💾 Member data (Development mode):', memberData);
        alert('✅ تم تسجيل العضو بنجاح (وضع التطوير)!');
        
        setTimeout(() => {
          router.push('/members');
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ حدث خطأ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('هل تريد مسح جميع البيانات المدخلة؟')) {
      setFormData({
        custom_id: '',
        name: '',
        phone: '',
        photo: null,
        subscriptionType: 'شهري',
        subscriptionStart: todayDate,
        subscriptionEnd: calculateEndDate(todayDate, 'شهري'),
        paymentType: 'كاش',
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        notes: ''
      });
      setPhotoPreview(null);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🏋️ تسجيل عضو جديد</h1>
            <p className="text-gray-400">أدخل بيانات العضو بالكامل</p>
          </div>

          <div className="space-y-6">
            {/* ═══ الصورة الشخصية ═══ */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-blue-500 overflow-hidden mb-4 shadow-lg">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">
                    👤
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition shadow-lg">
                <span>📷 اختر صورة</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">اختياري (أقصى حجم: 5MB)</p>
            </div>

            {/* ═══ رقم ID العضو ═══ */}
            <div className="bg-blue-900/20 border-2 border-blue-500 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                  🆔
                </div>
                <div className="flex-1">
                  <label className="block text-blue-300 mb-1 font-bold">
                    رقم ID العضو (للكارت)
                  </label>
                  <input
                    type="text"
                    name="custom_id"
                    value={formData.custom_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border-2 border-blue-500 rounded-lg text-white text-2xl font-bold text-center focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="0001"
                    maxLength="10"
                  />
                  <p className="text-xs text-blue-300 mt-1 text-center">
                    هذا الرقم سيُطبع على كارت العضو (اختياري)
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ البيانات الأساسية ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="مثال: أحمد محمد"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">
                  رقم التليفون *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="01xxxxxxxxx"
                  maxLength="11"
                  required
                />
              </div>
            </div>

            {/* ═══ بيانات الاشتراك ═══ */}
            <div className="bg-gray-750 p-6 rounded-xl border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">📋 بيانات الاشتراك</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* نوع الاشتراك */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    نوع الاشتراك
                  </label>
                  <select
                    name="subscriptionType"
                    value={formData.subscriptionType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="شهري">شهري (1 شهر)</option>
                    <option value="3شهور">3 شهور</option>
                    <option value="6شهور">6 شهور</option>
                    <option value="سنوي">سنوي (12 شهر)</option>
                  </select>
                </div>

                {/* نوع الدفع */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    نوع الدفع
                  </label>
                  <select
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="كاش">💵 كاش</option>
                    <option value="فيزا">💳 فيزا</option>
                    <option value="انستباي">📱 انستباي</option>
                    <option value="تحويل بنكي">🏦 تحويل بنكي</option>
                  </select>
                </div>

                {/* تاريخ البداية */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    تاريخ البداية *
                    <span className="text-sm text-gray-400 mr-2">
                      ({new Date().toLocaleDateString('ar-EG')})
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      name="subscriptionStart"
                      value={formData.subscriptionStart}
                      onChange={handleChange}
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayDate();
                        setFormData(prev => ({
                          ...prev,
                          subscriptionStart: today,
                          subscriptionEnd: calculateEndDate(today, prev.subscriptionType)
                        }));
                      }}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                      title="تعيين تاريخ اليوم"
                    >
                      📅 اليوم
                    </button>
                  </div>
                </div>

                {/* تاريخ النهاية */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    تاريخ النهاية
                    <span className="text-xs text-gray-400 mr-2">(تلقائي)</span>
                  </label>
                  <input
                    type="date"
                    name="subscriptionEnd"
                    value={formData.subscriptionEnd}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* إجمالي المبلغ */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    إجمالي المبلغ (جنيه)
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* المبلغ المدفوع */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    المبلغ المدفوع (جنيه)
                  </label>
                  <input
                    type="number"
                    name="paidAmount"
                    value={formData.paidAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* المبلغ المتبقي */}
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-2 font-semibold">
                    المبلغ المتبقي (جنيه)
                    <span className="text-xs text-gray-400 mr-2">(تلقائي)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="remainingAmount"
                      value={formData.remainingAmount}
                      readOnly
                      className={`w-full px-4 py-3 border border-gray-600 rounded-lg text-white cursor-not-allowed font-bold ${
                        formData.remainingAmount > 0 
                          ? 'bg-red-900/50 text-red-400' 
                          : formData.remainingAmount === 0 && formData.totalAmount > 0
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-600'
                      }`}
                      placeholder="0.00"
                    />
                    {formData.remainingAmount > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-xl">
                        ⚠️
                      </span>
                    )}
                    {formData.remainingAmount === 0 && formData.totalAmount > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-xl">
                        ✅
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    يتم الحساب تلقائياً (الإجمالي - المدفوع)
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ الملاحظات ═══ */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                ملاحظات
                <span className="text-xs text-gray-400 mr-2">(اختياري)</span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="أي ملاحظات إضافية عن العضو..."
              />
            </div>

            {/* ═══ أزرار الحفظ ═══ */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? '⏳ جاري الحفظ...' : '✅ حفظ العضو'}
              </button>
              
              <button
                onClick={handleReset}
                disabled={isSubmitting}
                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                🔄 مسح
              </button>
              
              <button
                onClick={() => router.push('/members')}
                disabled={isSubmitting}
                className="px-6 py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition"
              >
                ❌ إلغاء
              </button>
            </div>

            {/* تنبيه البيانات المطلوبة */}
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <p className="text-yellow-400 text-sm">
                <span className="font-bold">⚠️ ملاحظة:</span> الحقول المطلوبة (*): 
                الاسم، رقم التليفون، تاريخ البداية
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}