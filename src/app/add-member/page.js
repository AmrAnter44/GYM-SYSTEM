'use client';
import { useState } from 'react';

export default function AddMemberPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    photo: null,
    subscriptionType: 'شهري',
    subscriptionStart: '',
    subscriptionEnd: '',
    paymentType: 'كاش',
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    notes: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);

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
  if (!formData.name || !formData.phone || !formData.subscriptionStart) {
    alert('من فضلك أكمل البيانات المطلوبة');
    return;
  }
  
  try {
    console.log('Saving member:', formData);
    
    if (window.electronAPI) {
      const result = await window.electronAPI.saveMember(formData);
      console.log('Save result:', result);
      
      if (result.success) {
        alert('✅ تم تسجيل العضو بنجاح!');
        // إعادة تعيين النموذج
        setFormData({
          name: '',
          phone: '',
          photo: null,
          subscriptionType: 'شهري',
          subscriptionStart: '',
          subscriptionEnd: '',
          paymentType: 'كاش',
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          notes: ''
        });
        setPhotoPreview(null);
      } else {
        alert('❌ خطأ في الحفظ: ' + result.error);
      }
    } else {
      alert('⚠️ electronAPI غير متوفر');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ خطأ: ' + error.message);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🏋️ تسجيل عضو جديد</h1>
            <p className="text-gray-400">أدخل بيانات العضو بالكامل</p>
          </div>

          <div className="space-y-6">
            {/* الصورة الشخصية */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-blue-500 overflow-hidden mb-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">
                    👤
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                <span>اختر صورة</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* البيانات الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">الاسم الكامل *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="مثال: أحمد محمد"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">رقم التليفون *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </div>

            {/* بيانات الاشتراك */}
            <div className="bg-gray-750 p-6 rounded-xl border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">📋 بيانات الاشتراك</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">نوع الاشتراك</label>
                  <select
                    name="subscriptionType"
                    value={formData.subscriptionType}
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
                    name="paymentType"
                    value={formData.paymentType}
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
                  <label className="block text-gray-300 mb-2 font-semibold">تاريخ البداية *</label>
                  <input
                    type="date"
                    name="subscriptionStart"
                    value={formData.subscriptionStart}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">تاريخ النهاية</label>
                  <input
                    type="date"
                    name="subscriptionEnd"
                    value={formData.subscriptionEnd}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">إجمالي المبلغ (جنيه)</label>
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

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">المبلغ المدفوع (جنيه)</label>
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

                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-2 font-semibold">المبلغ المتبقي (جنيه)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="remainingAmount"
                      value={formData.remainingAmount}
                      readOnly
                      className={`w-full px-4 py-3 border border-gray-600 rounded-lg text-white cursor-not-allowed font-bold ${
                        formData.remainingAmount > 0 
                          ? 'bg-red-900/50' 
                          : formData.remainingAmount === 0 && formData.totalAmount > 0
                          ? 'bg-green-900/50'
                          : 'bg-gray-600'
                      }`}
                      placeholder="0.00"
                    />
                    {formData.remainingAmount > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">⚠️</span>
                    )}
                    {formData.remainingAmount === 0 && formData.totalAmount > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400">✅</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">يتم الحساب تلقائياً (الإجمالي - المدفوع)</p>
                </div>
              </div>
            </div>

            {/* الملاحظات */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>

            {/* أزرار الحفظ */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg"
              >
                ✅ حفظ العضو
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                ❌ إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}