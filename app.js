/**
 * طابعة فواتير المحل 80mm - المحرك البرمجي الرئيسي
 * معالجة سطور جوجل شيت، توليد وتنسيق الفواتير الحرارية
 */

(function() {
    'use strict';

    // Application State
    const state = {
        invoiceNumber: 'INV-1001',
        date: '',
        time: '',
        customer: 'عميل نقدي',
        paymentMethod: 'كاش',
        items: [],
        discount: 0,
        paid: 0,
        settings: {
            storeName: 'محل قطع غيار الزين',
            storeSub: 'لقطع الغيار والاكسسوارات',
            storeContact: 'هاتف: 01094262698 - 01125428081',
            storeAddress: '10 شـ خيري الجندي من شـ 30 مارس',
            storeTax: '',
            currency: 'ج.م',
            receiptWidth: '70mm',
            showLogo: true,
            logoUrl: 'logo.png',
            footerText: 'البضاعة المباعة ترد وتستبدل خلال 14 يوماً بالفاتورة وبحالتها الأصلية\nشكراً لزيارتكم ونسعد بخدمتكم دائماً!',
            showItemCode: true,
            autoPrint: true
        },
        history: []
    };

    // DOM Elements
    const elements = {
        // Mode Switcher
        btnModeSimple: document.getElementById('btn-mode-simple'),
        btnModePro: document.getElementById('btn-mode-pro'),

        // Top action buttons
        btnTestPrint: document.getElementById('btn-test-print'),
        btnReadClipboard: document.getElementById('btn-read-clipboard'),
        btnReadClipboardMain: document.getElementById('btn-read-clipboard-main'),
        btnPrintSimple: document.getElementById('btn-print-simple'),
        btnNewInvoiceSimple: document.getElementById('btn-new-invoice-simple'),

        // Paste area
        pasteInput: document.getElementById('paste-input'),
        btnProcessPaste: document.getElementById('btn-process-paste'),
        btnClearPaste: document.getElementById('btn-clear-paste'),
        btnPasteSample: document.getElementById('btn-paste-sample'),

        // Form Fields
        invNumber: document.getElementById('inv-number'),
        invDate: document.getElementById('inv-date'),
        invTime: document.getElementById('inv-time'),
        invCustomer: document.getElementById('inv-customer'),
        invPayment: document.getElementById('inv-payment'),
        invDiscount: document.getElementById('inv-discount'),
        invPaid: document.getElementById('inv-paid'),
        invChange: document.getElementById('inv-change'),
        itemsTbody: document.getElementById('items-tbody'),
        itemsCountBadge: document.getElementById('items-count-badge'),
        btnAddItem: document.getElementById('btn-add-item'),
        btnPrintMain: document.getElementById('btn-print-main'),
        btnPrintSecondary: document.getElementById('btn-print-secondary'),
        btnNewInvoice: document.getElementById('btn-new-invoice'),

        // Receipt Live Elements
        rcToPrint: document.getElementById('receipt-to-print'),
        rcLogoBox: document.getElementById('rc-logo-box'),
        rcLogoImg: document.getElementById('rc-logo-img'),
        rcStoreName: document.getElementById('rc-store-name'),
        rcStoreSub: document.getElementById('rc-store-sub'),
        rcStoreContact: document.getElementById('rc-store-contact'),
        rcStoreAddress: document.getElementById('rc-store-address'),
        rcStoreTax: document.getElementById('rc-store-tax'),
        rcInvNumber: document.getElementById('rc-inv-number'),
        rcInvDate: document.getElementById('rc-inv-date'),
        rcInvTime: document.getElementById('rc-inv-time'),
        rcInvCustomer: document.getElementById('rc-inv-customer'),
        rcInvPayment: document.getElementById('rc-inv-payment'),
        rcItemsBody: document.getElementById('rc-items-body'),
        rcSubtotalRow: document.getElementById('rc-subtotal-row'),
        rcSubtotal: document.getElementById('rc-subtotal'),
        rcDiscountRow: document.getElementById('rc-discount-row'),
        rcDiscount: document.getElementById('rc-discount'),
        rcGrandTotal: document.getElementById('rc-grand-total'),
        rcPaidRow: document.getElementById('rc-paid-row'),
        rcPaid: document.getElementById('rc-paid'),
        rcChangeRow: document.getElementById('rc-change-row'),
        rcChange: document.getElementById('rc-change'),
        rcFooterText: document.getElementById('rc-footer-text'),

        // Modals
        modalSettings: document.getElementById('modal-settings'),
        btnOpenSettings: document.getElementById('btn-open-settings'),
        btnCloseSettings: document.getElementById('btn-close-settings'),
        btnSaveSettings: document.getElementById('btn-save-settings'),

        // Settings inputs
        setStoreName: document.getElementById('set-store-name'),
        setStoreSub: document.getElementById('set-store-sub'),
        setStoreContact: document.getElementById('set-store-contact'),
        setStoreAddress: document.getElementById('set-store-address'),
        setStoreTax: document.getElementById('set-store-tax'),
        setShowLogo: document.getElementById('set-show-logo'),
        setLogoInput: document.getElementById('set-logo-input'),
        setLogoPreview: document.getElementById('set-logo-preview'),
        setCurrency: document.getElementById('set-currency'),
        setFooterText: document.getElementById('set-footer-text'),
        setShowCode: document.getElementById('set-show-code'),
        setAutoPrint: document.getElementById('set-auto-print'),

        // History Modal
        modalHistory: document.getElementById('modal-history'),
        btnOpenHistory: document.getElementById('btn-open-history'),
        btnCloseHistory: document.getElementById('btn-close-history'),
        btnDismissHistory: document.getElementById('btn-dismiss-history'),
        btnClearHistory: document.getElementById('btn-clear-history'),
        historyContainer: document.getElementById('history-container'),

        // Sheets Guide Modal
        modalSheetsGuide: document.getElementById('modal-sheets-guide'),
        btnOpenSheetsGuide: document.getElementById('btn-open-sheets-guide'),
        btnCloseSheetsGuide: document.getElementById('btn-close-sheets-guide'),
        btnDismissGuide: document.getElementById('btn-dismiss-guide')
    };

    /**
     * Escape HTML entities to prevent XSS injection
     */
    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Clean and convert number strings (handling Arabic comma ٫, Eastern digits ٠-٩, and commas)
     */
    function parseArabicNumber(val) {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        
        let str = String(val).trim();
        // Convert Arabic-Indic digits to Latin
        const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        for (let i = 0; i < 10; i++) {
            str = str.replace(new RegExp(arabicDigits[i], 'g'), i);
        }
        // Replace Arabic decimal mark ٫ with .
        str = str.replace(/٫/g, '.');
        // Remove standard thousands commas, Arabic thousands separator ٬, and any extraneous currency symbols
        str = str.replace(/[٬,]/g, '');
        str = str.replace(/[^\d.-]/g, '');

        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Format number with 2 decimals
     */
    function formatMoney(num) {
        return (Math.round(num * 100) / 100).toFixed(2);
    }

    /**
     * Get Current Date & Time in Arabic locale
     */
    function getCurrentDateTime() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}/${month}/${year}`;

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = `${hours}:${minutes} ${ampm}`;

        return { dateStr, timeStr };
    }

    /**
     * Load settings from localStorage
     */
    function loadSettings() {
        try {
            const saved = localStorage.getItem('receipt_pos_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Upgrade from old placeholder numbers if present
                if (parsed.storeContact && parsed.storeContact.includes('01000000000')) {
                    delete parsed.storeName;
                    delete parsed.storeSub;
                    delete parsed.storeContact;
                    delete parsed.storeAddress;
                }
                state.settings = Object.assign(state.settings, parsed);
            }
            if (state.settings.autoPrint === undefined) {
                state.settings.autoPrint = true;
            }
            const savedLastInv = localStorage.getItem('receipt_pos_last_inv');
            if (savedLastInv) {
                state.invoiceNumber = savedLastInv;
            } else {
                state.invoiceNumber = 'INV-' + Math.floor(1000 + Math.random() * 9000);
            }
            const savedHistory = localStorage.getItem('receipt_pos_history');
            if (savedHistory) {
                state.history = JSON.parse(savedHistory);
            }
        } catch(e) {
            console.error('Failed to load settings:', e);
        }

        // Apply settings to form inputs
        elements.setStoreName.value = state.settings.storeName;
        elements.setStoreSub.value = state.settings.storeSub;
        elements.setStoreContact.value = state.settings.storeContact;
        elements.setStoreAddress.value = state.settings.storeAddress;
        elements.setStoreTax.value = state.settings.storeTax;
        elements.setCurrency.value = state.settings.currency;
        elements.setFooterText.value = state.settings.footerText;
        if (elements.setShowLogo) elements.setShowLogo.checked = (state.settings.showLogo !== false);
        if (elements.setLogoPreview && state.settings.logoUrl) elements.setLogoPreview.src = state.settings.logoUrl;
        elements.setShowCode.checked = state.settings.showItemCode;
        elements.setAutoPrint.checked = state.settings.autoPrint;

        elements.invNumber.value = state.invoiceNumber;
    }

    /**
     * Save settings to localStorage
     */
    function saveSettings() {
        state.settings.storeName = elements.setStoreName.value.trim() || 'محل قطع غيار الزين';
        state.settings.storeSub = elements.setStoreSub.value.trim();
        state.settings.storeContact = elements.setStoreContact.value.trim();
        state.settings.storeAddress = elements.setStoreAddress.value.trim();
        state.settings.storeTax = elements.setStoreTax.value.trim();
        state.settings.receiptWidth = '70mm'; // المقاس المعتمد 70mm
        state.settings.currency = elements.setCurrency.value.trim() || 'ج.م';
        state.settings.footerText = elements.setFooterText.value.trim();
        if (elements.setShowLogo) state.settings.showLogo = elements.setShowLogo.checked;
        state.settings.showItemCode = elements.setShowCode.checked;
        state.settings.autoPrint = elements.setAutoPrint.checked;

        try {
            localStorage.setItem('receipt_pos_settings', JSON.stringify(state.settings));
        } catch(e) {
            console.error('Could not save settings:', e);
        }

        updateReceiptPreview();
        elements.modalSettings.classList.remove('active');
    }

    /**
     * Parse text pasted from Google Sheets
     * 
     * Target columns:
     * م	التاريخ	اسم الصنف	كود الصنف	الكمية	سعر البيع الأساسي	سعر بيع مختلف	السعر المعتمد	إجمالي البيع	الربح	العميل	رقم العميل	طريقة الدفع
     */
    function parseGoogleSheetsText(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const lines = rawText.trim().split(/\r?\n/);
        const parsedItems = [];
        let detectedCustomer = null;
        let detectedDate = null;
        let detectedPayment = null;

        // Dynamic column index mapping in case header is provided
        let colMap = {
            name: 2,
            code: 3,
            qty: 4,
            price: 7, // السعر المعتمد
            total: 8,
            profit: 9, // ignore
            date: 1,
            customer: 10,
            phone: 11,
            payment: 12
        };

        lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Check if this line is a header row
            if (trimmedLine.includes('اسم الصنف') || trimmedLine.includes('كود الصنف') || trimmedLine.includes('السعر المعتمد')) {
                // Determine column positions dynamically from header
                const headers = trimmedLine.split('\t').map(h => h.trim());
                headers.forEach((h, idx) => {
                    if (h.includes('اسم الصنف') || h === 'الصنف') colMap.name = idx;
                    else if (h.includes('كود')) colMap.code = idx;
                    else if (h.includes('الكمية') || h === 'العدد') colMap.qty = idx;
                    else if (h.includes('السعر المعتمد')) colMap.price = idx;
                    else if (h.includes('إجمالي') || h.includes('اجمالي')) colMap.total = idx;
                    else if (h.includes('التاريخ')) colMap.date = idx;
                    else if (h.includes('هاتف') || h.includes('تليفون') || h.includes('موبايل') || h.includes('رقم العميل') || h.includes('رقم الهاتف')) colMap.phone = idx;
                    else if (h.includes('العميل')) colMap.customer = idx;
                    else if (h.includes('طريقة الدفع') || h.includes('الدفع')) colMap.payment = idx;
                });
                return; // Skip header line
            }

            // Split line by Tab
            let parts = trimmedLine.split('\t');

            // If not separated by tab, try multiple spaces or commas
            if (parts.length < 4) {
                parts = trimmedLine.split(/\s{2,}/);
            }
            if (parts.length < 4) {
                parts = trimmedLine.split(',');
            }

            // Must have at least name, code/qty/price
            if (parts.length < 3) return;

            // Clean each part
            parts = parts.map(p => p.trim());

            // Extract fields according to map or fallback indexes
            const itemName = parts[colMap.name] || parts[2] || parts[0] || 'صنف غير محدد';
            const itemCode = parts[colMap.code] || (parts.length > 3 ? parts[3] : '') || '';
            const qty = parseArabicNumber(parts[colMap.qty] !== undefined ? parts[colMap.qty] : parts[4]) || 1;
            
            // For price: use "السعر المعتمد", fallback to base price if not present
            let unitPrice = 0;
            if (parts[colMap.price] !== undefined && parts[colMap.price] !== '') {
                unitPrice = parseArabicNumber(parts[colMap.price]);
            } else if (parts[5] !== undefined) {
                unitPrice = parseArabicNumber(parts[5]);
            }

            const total = qty * unitPrice;

            // Extract metadata if available
            if (!detectedDate && parts[colMap.date]) {
                detectedDate = parts[colMap.date].trim();
            }

            // Extract customer, phone, and payment method
            let rawCustomer = parts[colMap.customer] !== undefined ? parts[colMap.customer].trim() : '';
            let rawPhone = (colMap.phone !== undefined && parts[colMap.phone] !== undefined) ? parts[colMap.phone].trim() : '';
            let rawPayment = (colMap.payment !== undefined && parts[colMap.payment] !== undefined) ? parts[colMap.payment].trim() : '';

            // Compatibility check: if only 12 columns were pasted without a header
            // (e.g. legacy row: col 10 = customer, col 11 = payment, no phone)
            if (parts.length === 12 && !rawPayment && rawPhone) {
                if (!/^[\d\s+\-()٠-٩]{6,}$/.test(rawPhone)) {
                    rawPayment = rawPhone;
                    rawPhone = '';
                }
            }

            // Format customer with phone: "اسم العميل - رقم العميل"
            if (rawCustomer) {
                let formattedCustomer = rawCustomer;
                if (rawPhone && !formattedCustomer.includes(rawPhone)) {
                    formattedCustomer = `${rawCustomer} - ${rawPhone}`;
                }
                if (!detectedCustomer || (!detectedCustomer.includes('-') && rawPhone)) {
                    detectedCustomer = formattedCustomer;
                }
            } else if (rawPhone && !detectedCustomer) {
                detectedCustomer = rawPhone;
            }

            if (!detectedPayment && rawPayment) {
                detectedPayment = rawPayment;
            }

            parsedItems.push({
                name: itemName,
                code: itemCode,
                qty: qty,
                price: unitPrice,
                total: total
            });
        });

        return {
            items: parsedItems,
            date: detectedDate,
            customer: detectedCustomer,
            payment: detectedPayment
        };
    }

    /**
     * Process Paste Action
     */
    function handlePasteProcess(forcePrint = false) {
        const rawText = elements.pasteInput.value;
        if (!rawText.trim()) {
            alert('الرجاء لصق سطر المبيعات أولاً!');
            elements.pasteInput.focus();
            return;
        }

        const result = parseGoogleSheetsText(rawText);

        if (result.items.length === 0) {
            alert('لم يتم التعرف على أسطر صالحة. يرجى التأكد من نسخ السطر كاملاً من شيت جوجل.');
            return;
        }

        // Apply metadata if found
        if (result.date) {
            elements.invDate.value = result.date;
            state.date = result.date;
        }
        if (result.customer) {
            elements.invCustomer.value = result.customer;
            state.customer = result.customer;
        }
        if (result.payment) {
            elements.invPayment.value = result.payment;
            state.paymentMethod = result.payment;
        }

        // Add items to state
        state.items = result.items;
        renderItemsTable();
        updateReceiptPreview();

        // Clear paste input after successful import
        elements.pasteInput.value = '';

        // Auto print if forced or enabled in settings
        if (forcePrint || state.settings.autoPrint) {
            setTimeout(triggerPrint, 200);
        }
    }

    /**
     * Render items in the editable table
     */
    function renderItemsTable() {
        elements.itemsTbody.innerHTML = '';

        state.items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-num">${index + 1}</td>
                <td>
                    <input type="text" value="${escapeHtml(item.name)}" data-index="${index}" data-field="name" class="item-input">
                </td>
                <td>
                    <input type="text" value="${escapeHtml(item.code)}" data-index="${index}" data-field="code" class="item-input">
                </td>
                <td>
                    <input type="number" step="1" min="1" value="${item.qty}" data-index="${index}" data-field="qty" class="item-input" style="text-align: center;">
                </td>
                <td>
                    <input type="number" step="0.5" min="0" value="${item.price}" data-index="${index}" data-field="price" class="item-input" style="text-align: center;">
                </td>
                <td style="text-align: center; font-weight: bold;">
                    ${formatMoney(item.qty * item.price)}
                </td>
                <td class="td-actions">
                    <button type="button" class="delete-btn" data-index="${index}" title="حذف الصنف">🗑️</button>
                </td>
            `;
            elements.itemsTbody.appendChild(tr);
        });

        elements.itemsCountBadge.textContent = `${state.items.length} أصناف`;

        // Note: event handling is done via delegation on tbody (set up once in setupEventListeners)
    }

    /**
     * Handle item inline edit in table
     */
    function handleItemEdit(e) {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        const field = e.target.getAttribute('data-field');
        let val = e.target.value;

        if (field === 'qty') {
            val = parseArabicNumber(val) || 0;
        } else if (field === 'price') {
            val = parseArabicNumber(val) || 0;
        }

        state.items[index][field] = val;
        state.items[index].total = (state.items[index].qty || 0) * (state.items[index].price || 0);

        // Update row total cell
        const row = e.target.closest('tr');
        if (row) {
            const totalCell = row.children[5];
            if (totalCell) {
                totalCell.textContent = formatMoney(state.items[index].total);
            }
        }

        updateReceiptPreview();
    }

    /**
     * Add empty manual item row
     */
    function addNewItemRow() {
        state.items.push({
            name: 'صنف جديد',
            code: '',
            qty: 1,
            price: 0,
            total: 0
        });
        renderItemsTable();
        updateReceiptPreview();

        // Focus the name input of the last row
        const inputs = elements.itemsTbody.querySelectorAll('input[data-field="name"]');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
            inputs[inputs.length - 1].select();
        }
    }

    /**
     * Update Live 80mm Receipt Preview
     */
    function updateReceiptPreview() {
        // Logo
        if (elements.rcLogoBox) {
            if (state.settings.showLogo !== false && state.settings.logoUrl) {
                elements.rcLogoBox.style.display = 'block';
                if (elements.rcLogoImg) elements.rcLogoImg.src = state.settings.logoUrl;
            } else {
                elements.rcLogoBox.style.display = 'none';
            }
        }

        // Store Details
        elements.rcStoreName.textContent = state.settings.storeName;
        elements.rcStoreSub.textContent = state.settings.storeSub;
        elements.rcStoreContact.textContent = state.settings.storeContact;
        elements.rcStoreAddress.textContent = state.settings.storeAddress;

        if (state.settings.storeTax) {
            elements.rcStoreTax.textContent = state.settings.storeTax;
            elements.rcStoreTax.style.display = 'block';
        } else {
            elements.rcStoreTax.style.display = 'none';
        }

        // Invoice Meta
        elements.rcInvNumber.textContent = state.invoiceNumber;
        elements.rcInvDate.textContent = state.date;
        elements.rcInvTime.textContent = state.time;
        elements.rcInvCustomer.textContent = state.customer;
        elements.rcInvPayment.textContent = state.paymentMethod;

        // Render receipt items
        elements.rcItemsBody.innerHTML = '';
        let subtotal = 0;

        state.items.forEach(item => {
            const itemTotal = (item.qty || 0) * (item.price || 0);
            subtotal += itemTotal;

            const tr = document.createElement('tr');
            tr.className = 'item-row';
            tr.innerHTML = `
                <td class="rc-right">
                    <span class="rc-item-name">${escapeHtml(item.name)}</span>
                    ${(state.settings.showItemCode && item.code) ? `<span class="rc-item-code">كود: ${escapeHtml(item.code)}</span>` : ''}
                </td>
                <td class="rc-center rc-bold">${item.qty}</td>
                <td class="rc-center">${formatMoney(item.price)}</td>
                <td class="rc-left rc-bold">${formatMoney(itemTotal)}</td>
            `;
            elements.rcItemsBody.appendChild(tr);
        });

        // Totals calculations
        const discount = parseArabicNumber(elements.invDiscount.value) || 0;
        const grandTotal = Math.max(0, subtotal - discount);
        const paid = parseArabicNumber(elements.invPaid.value) || 0;
        const change = paid > 0 ? (paid - grandTotal) : 0;

        const curr = state.settings.currency;

        // Hide subtotal row if no discount (subtotal = grand total, no point showing both)
        if (discount > 0) {
            elements.rcSubtotalRow.style.display = 'table-row';
        } else {
            elements.rcSubtotalRow.style.display = 'none';
        }

        elements.rcSubtotal.textContent = `${formatMoney(subtotal)} ${curr}`;

        if (discount > 0) {
            elements.rcDiscountRow.style.display = 'table-row';
            elements.rcDiscount.textContent = `-${formatMoney(discount)} ${curr}`;
        } else {
            elements.rcDiscountRow.style.display = 'none';
        }

        elements.rcGrandTotal.textContent = `${formatMoney(grandTotal)} ${curr}`;

        // Paid & Change Display
        if (paid > 0) {
            elements.rcPaidRow.style.display = 'table-row';
            elements.rcPaid.textContent = `${formatMoney(paid)} ${curr}`;

            elements.rcChangeRow.style.display = 'table-row';
            if (change >= 0) {
                elements.rcChange.textContent = `${formatMoney(change)} ${curr}`;
                elements.invChange.value = formatMoney(change);
            } else {
                // Customer still owes money
                elements.rcChange.textContent = `${formatMoney(Math.abs(change))} ${curr} (متبقي على العميل)`;
                elements.invChange.value = formatMoney(change);
            }
        } else {
            elements.rcPaidRow.style.display = 'none';
            elements.rcChangeRow.style.display = 'none';
            elements.invChange.value = '0.00';
        }

        // Footer policy
        elements.rcFooterText.innerHTML = (state.settings.footerText || '').replace(/\n/g, '<br>');
    }

    /**
     * Trigger Print Action
     */
    function triggerPrint() {
        if (state.items.length === 0) {
            alert('لا توجد أصناف في الفاتورة للطباعة! يرجى لصق سطر المبيعات أولاً.');
            return;
        }

        // Save current invoice to history
        saveToHistory();

        // Native instant printing (100% reliable on HTTPS, GitHub Pages, Chrome, Edge)
        window.print();

        // Increment invoice number for next sale
        setTimeout(() => {
            incrementInvoiceNumber();
        }, 1200);
    }

    /**
     * Run Test Print
     */
    function runTestPrint() {
        let printFrame = document.getElementById('pos-print-frame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'pos-print-frame';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '100px';
            printFrame.style.height = '100px';
            printFrame.style.border = '0';
            printFrame.style.opacity = '0.01';
            printFrame.style.pointerEvents = 'none';
            printFrame.style.zIndex = '-9999';
            document.body.appendChild(printFrame);
        }

        const dt = getCurrentDateTime();
        const printWidth = '70mm'; // المقاس المعتمد 70mm

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>فحص الطابعة</title>
    <style>
        @page { size: 80mm auto; margin: 0mm; }
        body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            width: ${printWidth};
            margin: 0 auto;
            padding: 3mm 2mm;
            color: #000;
            text-align: center;
            font-size: 12px;
            direction: rtl;
        }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .bold { font-weight: bold; }
    </style>
</head>
<body>
    <div class="bold" style="font-size: 16px;">=== محل قطع غيار الزين - فحص الطابعة ===</div>
    <div style="margin: 4px 0; font-size: 12px;">المقاس المعتمد: 70mm</div>
    <div class="line"></div>
    <div style="font-size: 12px;">التاريخ: ${dt.dateStr} - الوقت: ${dt.timeStr}</div>
    <div style="font-size: 14px; margin: 6px 0; letter-spacing: 2px;">████████████████</div>
    <div class="bold" style="font-size: 14px; margin: 4px 0;">جاهز للطباعة بخط واضح وكبير!</div>
    <div class="line"></div>
    <div style="font-size: 11px;">محل قطع غيار الزين - طابعة فواتير 80mm</div>
</body>
</html>`);
        frameDoc.close();

        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (err) {
                console.warn('Iframe test print error', err);
            }
        }, 300);
    }

    /**
     * Increment Invoice Number (e.g. INV-1001 -> INV-1002)
     */
    function incrementInvoiceNumber() {
        const match = state.invoiceNumber.match(/^(.*?)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const num = parseInt(match[2], 10) + 1;
            state.invoiceNumber = prefix + num;
        } else {
            state.invoiceNumber = 'INV-' + (Math.floor(Math.random() * 9000) + 1000);
        }
        elements.invNumber.value = state.invoiceNumber;
        try {
            localStorage.setItem('receipt_pos_last_inv', state.invoiceNumber);
        } catch(e) {}
        updateReceiptPreview();
    }

    /**
     * Save Invoice to History
     */
    function saveToHistory() {
        const discount = parseArabicNumber(elements.invDiscount.value) || 0;
        let subtotal = 0;
        state.items.forEach(i => subtotal += (i.qty * i.price));
        const grandTotal = Math.max(0, subtotal - discount);

        const record = {
            id: Date.now(),
            invoiceNumber: state.invoiceNumber,
            date: state.date,
            time: state.time,
            customer: state.customer,
            itemsCount: state.items.length,
            total: grandTotal,
            currency: state.settings.currency,
            items: JSON.parse(JSON.stringify(state.items))
        };

        state.history.unshift(record);
        if (state.history.length > 50) state.history.pop(); // keep last 50

        try {
            localStorage.setItem('receipt_pos_history', JSON.stringify(state.history));
        } catch(e) {}
    }

    /**
     * Render History List in Modal
     */
    function renderHistory() {
        elements.historyContainer.innerHTML = '';
        if (state.history.length === 0) {
            elements.historyContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem;">لا توجد فواتير سابقة حتى الآن</div>';
            return;
        }

        state.history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: #0f172a;">${item.invoiceNumber} - ${item.customer}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${item.date} ${item.time || ''} | ${item.itemsCount} أصناف</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span style="font-weight: 800; color: #059669;">${formatMoney(item.total)} ${item.currency}</span>
                    <button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;" data-id="${item.id}">
                        إعادة تحميل
                    </button>
                </div>
            `;

            div.querySelector('button').addEventListener('click', () => {
                loadInvoiceFromHistory(item);
                elements.modalHistory.classList.remove('active');
            });

            elements.historyContainer.appendChild(div);
        });
    }

    /**
     * Restore invoice from history record
     */
    function loadInvoiceFromHistory(record) {
        state.invoiceNumber = record.invoiceNumber;
        elements.invNumber.value = record.invoiceNumber;
        state.date = record.date;
        elements.invDate.value = record.date;
        state.time = record.time || '';
        elements.invTime.value = record.time || '';
        state.customer = record.customer;
        elements.invCustomer.value = record.customer;
        state.items = JSON.parse(JSON.stringify(record.items));
        renderItemsTable();
        updateReceiptPreview();
    }

    /**
     * Start a new empty invoice
     */
    function startNewInvoice() {
        const dt = getCurrentDateTime();
        state.date = dt.dateStr;
        state.time = dt.timeStr;
        elements.invDate.value = state.date;
        elements.invTime.value = state.time;

        elements.invCustomer.value = 'عميل نقدي';
        state.customer = 'عميل نقدي';
        elements.invPayment.value = 'كاش';
        state.paymentMethod = 'كاش';

        elements.invDiscount.value = '0';
        elements.invPaid.value = '';
        elements.invChange.value = '0.00';

        state.items = [];
        renderItemsTable();
        updateReceiptPreview();
        elements.pasteInput.value = '';
        elements.pasteInput.focus();
    }

    /**
     * Sample Row for quick demonstration
     */
    function loadSampleData() {
        const sampleRow = "1\t01/11/2026\tبوجيه NGK\tM003\t5٫\t200\t200\t200\t1٬000\t250\tاحمد سامح\t01112302757\tإنستاباي";
        elements.pasteInput.value = sampleRow;
        handlePasteProcess();
    }

    /**
     * Setup Event Listeners
     */
    function setupEventListeners() {
        // Paste input actions
        elements.btnProcessPaste.addEventListener('click', handlePasteProcess);
        elements.btnClearPaste.addEventListener('click', () => {
            elements.pasteInput.value = '';
            elements.pasteInput.focus();
        });
        elements.btnPasteSample.addEventListener('click', loadSampleData);

        // Event delegation for items table (instead of re-attaching listeners on every render)
        elements.itemsTbody.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-input')) {
                handleItemEdit(e);
            }
        });
        elements.itemsTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-btn');
            if (btn) {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                state.items.splice(idx, 1);
                renderItemsTable();
                updateReceiptPreview();
            }
        });

        // Mode Switcher handlers
        function setUiMode(mode) {
            if (mode === 'pro') {
                document.body.classList.remove('mode-simple');
                document.body.classList.add('mode-pro');
                if (elements.btnModePro) elements.btnModePro.classList.add('active');
                if (elements.btnModeSimple) elements.btnModeSimple.classList.remove('active');
            } else {
                document.body.classList.remove('mode-pro');
                document.body.classList.add('mode-simple');
                if (elements.btnModeSimple) elements.btnModeSimple.classList.add('active');
                if (elements.btnModePro) elements.btnModePro.classList.remove('active');
            }
            try {
                localStorage.setItem('receipt_ui_mode', mode);
            } catch(e) {}
        }

        if (elements.btnModeSimple) {
            elements.btnModeSimple.addEventListener('click', () => setUiMode('simple'));
        }
        if (elements.btnModePro) {
            elements.btnModePro.addEventListener('click', () => setUiMode('pro'));
        }

        // Shared Clipboard Paste Function
        async function pasteFromClipboard() {
            try {
                const text = await navigator.clipboard.readText();
                if (!text || !text.trim()) {
                    alert('الحافظة فارغة! يرجى نسخ سطر البيع من شيت جوجل أولاً (Ctrl + C).');
                    return;
                }
                elements.pasteInput.value = text;
                handlePasteProcess(true);
            } catch(err) {
                alert('يرجى لصق السطر يدوياً بالضغط داخل المربع ثم Ctrl + V (أو السماح للمتصفح بالوصول للحافظة).');
                elements.pasteInput.focus();
            }
        }

        // Direct paste from clipboard buttons
        if (elements.btnReadClipboard) {
            elements.btnReadClipboard.addEventListener('click', pasteFromClipboard);
        }
        if (elements.btnReadClipboardMain) {
            elements.btnReadClipboardMain.addEventListener('click', pasteFromClipboard);
        }

        // Simple mode print and new invoice buttons
        if (elements.btnPrintSimple) {
            elements.btnPrintSimple.addEventListener('click', triggerPrint);
        }
        if (elements.btnNewInvoiceSimple) {
            elements.btnNewInvoiceSimple.addEventListener('click', startNewInvoice);
        }

        // Test Print
        if (elements.btnTestPrint) {
            elements.btnTestPrint.addEventListener('click', runTestPrint);
        }

        // Auto process on Paste in textarea
        elements.pasteInput.addEventListener('paste', () => {
            setTimeout(() => handlePasteProcess(true), 100);
        });

        // Enter key in paste input
        elements.pasteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handlePasteProcess(true);
            }
        });

        // Form Inputs Real-time Binding
        elements.invNumber.addEventListener('input', (e) => {
            state.invoiceNumber = e.target.value;
            updateReceiptPreview();
        });
        elements.invDate.addEventListener('input', (e) => {
            state.date = e.target.value;
            updateReceiptPreview();
        });
        elements.invTime.addEventListener('input', (e) => {
            state.time = e.target.value;
            updateReceiptPreview();
        });
        elements.invCustomer.addEventListener('input', (e) => {
            state.customer = e.target.value;
            updateReceiptPreview();
        });
        elements.invPayment.addEventListener('input', (e) => {
            state.paymentMethod = e.target.value;
            updateReceiptPreview();
        });
        elements.invPayment.addEventListener('change', (e) => {
            state.paymentMethod = e.target.value;
            updateReceiptPreview();
        });

        elements.invDiscount.addEventListener('input', updateReceiptPreview);
        elements.invPaid.addEventListener('input', updateReceiptPreview);

        // Buttons
        elements.btnAddItem.addEventListener('click', addNewItemRow);
        elements.btnPrintMain.addEventListener('click', triggerPrint);
        if (elements.btnPrintSecondary) {
            elements.btnPrintSecondary.addEventListener('click', triggerPrint);
        }
        elements.btnNewInvoice.addEventListener('click', startNewInvoice);

        // Click receipt to print in Simple Mode
        if (elements.rcToPrint) {
            elements.rcToPrint.addEventListener('click', () => {
                if (document.body.classList.contains('mode-simple') && state.items.length > 0) {
                    triggerPrint();
                }
            });
        }

        // Keyboard Shortcut: Ctrl + P for immediate printing
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                triggerPrint();
            }
        });

        // Settings Modal
        elements.btnOpenSettings.addEventListener('click', () => {
            elements.modalSettings.classList.add('active');
        });
        elements.btnCloseSettings.addEventListener('click', () => {
            elements.modalSettings.classList.remove('active');
        });
        elements.btnSaveSettings.addEventListener('click', saveSettings);

        // Logo upload and toggle
        if (elements.setLogoInput) {
            elements.setLogoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const dataUrl = evt.target.result;
                    state.settings.logoUrl = dataUrl;
                    if (elements.setLogoPreview) elements.setLogoPreview.src = dataUrl;
                    if (elements.rcLogoImg) elements.rcLogoImg.src = dataUrl;
                };
                reader.readAsDataURL(file);
            });
        }

        if (elements.setShowLogo) {
            elements.setShowLogo.addEventListener('change', (e) => {
                state.settings.showLogo = e.target.checked;
                updateReceiptPreview();
            });
        }

        // History Modal
        elements.btnOpenHistory.addEventListener('click', () => {
            renderHistory();
            elements.modalHistory.classList.add('active');
        });
        elements.btnCloseHistory.addEventListener('click', () => {
            elements.modalHistory.classList.remove('active');
        });
        elements.btnDismissHistory.addEventListener('click', () => {
            elements.modalHistory.classList.remove('active');
        });
        elements.btnClearHistory.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من رغبتك في مسح سجل الفواتير؟')) {
                state.history = [];
                localStorage.removeItem('receipt_pos_history');
                renderHistory();
            }
        });

        // Sheets Guide Modal
        elements.btnOpenSheetsGuide.addEventListener('click', () => {
            elements.modalSheetsGuide.classList.add('active');
        });
        elements.btnCloseSheetsGuide.addEventListener('click', () => {
            elements.modalSheetsGuide.classList.remove('active');
        });
        elements.btnDismissGuide.addEventListener('click', () => {
            elements.modalSheetsGuide.classList.remove('active');
        });

        // Close modals on outside click
        [elements.modalSettings, elements.modalHistory, elements.modalSheetsGuide].forEach(m => {
            m.addEventListener('click', (e) => {
                if (e.target === m) m.classList.remove('active');
            });
        });
    }

    /**
     * Initialization
     */
    function init() {
        loadSettings();
        const dt = getCurrentDateTime();
        state.date = dt.dateStr;
        state.time = dt.timeStr;
        elements.invDate.value = state.date;
        elements.invTime.value = state.time;

        setupEventListeners();
        updateReceiptPreview();

        // Apply saved UI Mode (defaults to simple mode)
        const savedMode = localStorage.getItem('receipt_ui_mode') || 'simple';
        if (savedMode === 'pro') {
            document.body.classList.remove('mode-simple');
            document.body.classList.add('mode-pro');
            if (elements.btnModePro) elements.btnModePro.classList.add('active');
            if (elements.btnModeSimple) elements.btnModeSimple.classList.remove('active');
        } else {
            document.body.classList.remove('mode-pro');
            document.body.classList.add('mode-simple');
            if (elements.btnModeSimple) elements.btnModeSimple.classList.add('active');
            if (elements.btnModePro) elements.btnModePro.classList.remove('active');
        }

        // Preload logo for instant synchronous printing
        const logoImg = new Image();
        logoImg.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.naturalWidth || logoImg.width;
                canvas.height = logoImg.naturalHeight || logoImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0);
                state.logoBase64 = canvas.toDataURL('image/png');
            } catch(e) {}
        };
        logoImg.src = state.settings.logoUrl || 'logo.png';

        // Check URL hash for direct data passing (e.g. from Google Sheets hyperlink)
        function checkUrlData() {
            if (window.location.hash && window.location.hash.startsWith('#data=')) {
                try {
                    const encodedData = window.location.hash.substring(6);
                    const decodedText = decodeURIComponent(encodedData);
                    if (decodedText.trim()) {
                        elements.pasteInput.value = decodedText;
                        handlePasteProcess();
                    }
                } catch(e) {
                    console.warn('Could not parse hash data:', e);
                }
            }
        }
        checkUrlData();
        window.addEventListener('hashchange', checkUrlData);
    }

    // Run on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

