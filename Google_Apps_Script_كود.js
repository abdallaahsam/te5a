/**
 * =========================================================================
 * كود Google Apps Script للطباعة الحرارية 80mm مباشرة من داخل شيت جوجل
 * =========================================================================
 * 
 * طريقة التركيب في شيت جوجل:
 * 1. افتح شيت جوجل الخاص بك.
 * 2. من القائمة العلوية اضغط على: الإضافات (Extensions) > Apps Script.
 * 3. احذف أي كود موجود هناك، والصق هذا الكود بالكامل.
 * 4. اضغط على أيقونة الحفظ (💾 Save).
 * 5. أعد تحميل صفحة شيت جوجل (F5).
 * 6. ستجد قائمة جديدة ظهرت في الأعلى باسم: "🖨️ فواتير المحل".
 * 7. حدد أي سطر بيع تريد طباعته واضغط: "🖨️ طباعة الفاتورة للسطر المحدد".
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🖨️ فواتير المحل')
    .addItem('طباعة السطر المحدد (80mm)', 'printSelectedRowInvoice')
    .addToUi();
}

function printSelectedRowInvoice() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var activeRange = sheet.getActiveRange();
  
  if (!activeRange) {
    SpreadsheetApp.getUi().alert('تنبيه', 'يرجى تحديد سطر البيع أولاً!', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var row = activeRange.getRow();
  // قراءة الأعمدة من 1 إلى 13 (شامل رقم العميل وطريقة الدفع)
  var data = sheet.getRange(row, 1, 1, 13).getValues()[0];
  
  // التحقق من وجود بيانات
  if (!data[2]) { // اسم الصنف
    SpreadsheetApp.getUi().alert('تنبيه', 'السطر المحدد فارغ أو لا يحتوي على اسم صنف!', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var serial = data[0] || '1';
  var dateStr = data[1] ? Utilities.formatDate(new Date(data[1]), Session.getScriptTimeZone(), "dd/MM/yyyy") : '';
  var itemName = data[2] || '';
  var itemCode = data[3] || '';
  var qty = parseFloat(String(data[4]).replace(/[٫,]/g, '.')) || 1;
  var unitPrice = parseFloat(String(data[7]).replace(/[٫,]/g, '.')) || parseFloat(String(data[5]).replace(/[٫,]/g, '.')) || 0;
  var total = parseFloat(String(data[8]).replace(/[٫,٬]/g, '')) || (qty * unitPrice);
  
  var customerName = data[10] ? String(data[10]).trim() : 'عميل نقدي';
  var customerPhone = data[11] ? String(data[11]).trim() : '';
  var payment = data[12] ? String(data[12]).trim() : (data[11] ? String(data[11]).trim() : 'كاش');
  
  // دمج اسم العميل مع رقمه بفاصلة -
  var customer = customerName;
  if (customerPhone && !/^(كاش|فيزا|إنستاباي|انستاباي|فودافون كاش|محفظة|آجل)/.test(customerPhone)) {
    customer = customerName + ' - ' + customerPhone;
  } else if (!data[12] && customerPhone) {
    payment = customerPhone;
  }
  
  var htmlContent = `
  <!DOCTYPE html>
  <html dir="rtl">
  <head>
    <meta charset="utf-8">
    <title>فاتورة 80mm</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      body {
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.35;
        margin: 0 auto;
        padding: 3mm 3.5mm;
        width: 67mm;
        box-sizing: border-box;
        color: #000;
        text-align: right;
      }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .store-title { font-size: 17px; font-weight: 900; margin-bottom: 2px; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .divider-double { border-top: 2px solid #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11.5px; }
      table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11.5px; table-layout: fixed; box-sizing: border-box; }
      th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 2px; font-weight: 800; font-size: 11.5px; }
      td { padding: 3px 2px; font-size: 11.5px; word-break: break-word; }
      .grand-total {
        font-size: 17px;
        font-weight: 900;
        border-top: 1.5px solid #000;
        border-bottom: 1.5px solid #000;
        padding: 5px 0;
      }
      @media print {
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="no-print" style="margin-bottom: 10px; text-align: center;">
      <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
        🖨️ اضغط للطباعة الآن
      </button>
    </div>
    
    <div class="center">
      <div class="store-title">محل قطع غيار الزين</div>
      <div style="font-size: 11px; font-weight: bold;">لقطع الغيار والاكسسوارات</div>
      <div style="font-size: 10px;">هاتف: 01094262698 - 01125428081</div>
      <div style="font-size: 10px;">10 شـ خيري الجندي من شـ 30 مارس</div>
    </div>
    
    <div class="divider-double"></div>
    
    <div class="row"><span>التاريخ:</span> <span>${dateStr}</span></div>
    <div class="row"><span>العميل:</span> <span class="bold">${customer}</span></div>
    <div class="row"><span>طريقة الدفع:</span> <span>${payment}</span></div>
    
    <div class="divider"></div>
    
    <table>
      <thead>
        <tr>
          <th style="text-align: right; width: 44%;">الصنف</th>
          <th style="text-align: center; width: 14%;">الكمية</th>
          <th style="text-align: center; width: 19%;">السعر</th>
          <th style="text-align: left; width: 23%; padding-left: 3px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: right;">
            <div class="bold">${itemName}</div>
            ${itemCode ? `<div style="font-size: 9px;">كود: ${itemCode}</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: bold;">${qty}</td>
          <td style="text-align: center;">${unitPrice.toFixed(2)}</td>
          <td style="text-align: left; font-weight: bold;">${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="divider"></div>
    
    <div class="row grand-total">
      <span>الصافي المطلوب:</span>
      <span>${total.toFixed(2)} ج.م</span>
    </div>
    
    <div class="center" style="font-size: 9.5px; margin-top: 10px;">
      البضاعة المباعة ترد وتستبدل خلال 14 يوماً بالفاتورة<br>
      شكراً لتعاملكم معنا!
    </div>
    
    <script>
      // فتح نافذة الطباعة تلقائياً عند تحميل الصفحة
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
  </html>
  `;
  
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(340)
    .setHeight(480);
    
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'معاينة طباعة الفاتورة 80mm');
}

