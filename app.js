// ==========================================================================
// 1. NAVIGATION TAB CONTROL LOGIC
// ==========================================================================
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        button.classList.add('active');
        const targetTab = button.getAttribute('data-target');
        document.getElementById(targetTab).classList.add('active');
    });
});

// ==========================================================================
// 2. IN-MEMORY DATA STORAGE & SAMPLE SEEDS
// ==========================================================================
let schedules = [
    {
        uid: "seed-1",
        id: "CUST-412",
        name: "Alice Vance",
        email: "alice@example.com",
        phone: "0411 222 333",
        service: "Indoor & Outdoor Cleaning",
        workers: 1,
        date: getOffsetDateString(2),
        time: "09:30",
        duration: 2.0,
        total: 110.00,
        status: "incomplete"
    },
    {
        uid: "seed-2",
        id: "CUST-902",
        name: "Marcus Brody",
        email: "marcus@domain.au",
        phone: "0499 888 777",
        service: "Garden Maintenance",
        workers: 2,
        date: getOffsetDateString(5),
        time: "14:00",
        duration: 3.0,
        total: 330.00,
        status: "incomplete"
    }
];

function getOffsetDateString(daysAhead) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    return targetDate.toISOString().split('T')[0];
}

// ==========================================================================
// 3. DYNAMIC DROPDOWN CONFIGURATION GENERATORS
// ==========================================================================
function initializeDurationDropdown() {
    const durationSelect = document.getElementById('bookingDuration');
    if (!durationSelect) return;
    durationSelect.innerHTML = '';
    for (let min = 30; min <= 480; min += 30) {
        const hrs = min / 60;
        durationSelect.appendChild(new Option(hrs === 1 ? '1 hour' : `${hrs} hours`, hrs));
    }
}

// Utility: Converts "HH:MM" timestamp strings into a fractional decimal number
function timeStringToDecimal(timeStr) {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs + (mins / 60);
}

// ==========================================================================
// 4. SMART AVAILABILITY ENGINE (CONFLICT LOCKOUT W/ 1-HOUR PADDING)
// ==========================================================================
function updateAvailableTimeSlots() {
    const timeSelect = document.getElementById('bookingTime');
    const dateInput = document.getElementById('bookingDate');
    const durationSelect = document.getElementById('bookingDuration');
    const warningLabel = document.getElementById('timeWarning');
    const currentEditingUid = document.getElementById('editBookingId').value;

    if (!timeSelect || !dateInput || !durationSelect) return;

    const selectedDate = dateInput.value;
    const selectedDuration = parseFloat(durationSelect.value || 0.5);
    timeSelect.innerHTML = '';
    warningLabel.textContent = '';

    if (!selectedDate) return;

    // Isolate active records for the target calendar date (excluding self if editing)
    const dayBookings = schedules.filter(b => b.date === selectedDate && b.uid !== currentEditingUid);

    let standardSlotsAdded = 0;
    let blockedSlotsCount = 0;

    // Loop through 30-minute steps across the allowable 6:00 AM to 6:00 PM operational spectrum
    for (let hour = 6; hour <= 18; hour += 0.5) {
        if (hour === 18) break; // Terminate exactly at upper service threshold boundary

        const hh = Math.floor(hour);
        const mm = (hour % 1) === 0 ? '00' : '30';
        const timeStr = `${hh < 10 ? '0' + hh : hh}:${mm}`;

        const currentSlotStart = hour;
        const currentSlotEnd = hour + selectedDuration;

        let isBlocked = false;

        // Perform overlapping safety vector evaluation matrix checks
        for (const booking of dayBookings) {
            const bookedStart = timeStringToDecimal(booking.time);
            const bookedEnd = bookedStart + booking.duration;

            // Expand baseline tracking horizons outward symmetrically by 1.0 hour to act as buffers
            const safeBlockStart = bookedStart - 1.0;
            const safeBlockEnd = bookedEnd + 1.0;

            if (currentSlotStart < safeBlockEnd && currentSlotEnd > safeBlockStart) {
                isBlocked = true;
                break;
            }
        }

        // Build option element
        const option = new Option(timeStr, timeStr);
        if (isBlocked) {
            option.disabled = true;
            option.text += ' (Unavailable / Buffer)';
            blockedSlotsCount++;
        } else {
            standardSlotsAdded++;
        }
        timeSelect.appendChild(option);
    }

    if (standardSlotsAdded === 0 && blockedSlotsCount > 0) {
        warningLabel.textContent = 'Notice: No clear slots meet the 1-hour safety buffer configurations for this date.';
    }
}

// Re-evaluate system slots cleanly if changes occur on dependencies
['bookingDate', 'bookingDuration'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateAvailableTimeSlots);
});

// ==========================================================================
// 5. LIVE APPLICATION COST CALCULATION CORE
// ==========================================================================
const hourlyRate = 50;
function calculateCurrentCosts() {
    const workers = parseInt(document.getElementById('workerCount')?.value || 1);
    const hours = parseFloat(document.getElementById('bookingDuration')?.value || 0.5);
    const materials = parseFloat(document.getElementById('materialsCost')?.value || 0);
    const useGst = document.getElementById('includeGst')?.checked;

    const baseCost = workers * hours * hourlyRate;
    const gstValue = useGst ? (baseCost + materials) * 0.10 : 0;
    const totalCost = baseCost + materials + gstValue;

    document.getElementById('summaryBase').textContent = `$${baseCost.toFixed(2)}`;
    document.getElementById('summaryMaterials').textContent = `$${materials.toFixed(2)}`;
    document.getElementById('summaryGst').textContent = `$${gstValue.toFixed(2)}`;
    document.getElementById('summaryTotal').textContent = `$${totalCost.toFixed(2)}`;

    return { totalCost };
}

['workerCount', 'bookingDuration', 'materialsCost', 'includeGst'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateCurrentCosts);
});

// ==========================================================================
// 6. SCHEDULE INTERACTIVE RENDER ENGINE (FORTNIGHT MATRICES)
// ==========================================================================
function renderFortnightSchedule() {
    const tableBody = document.getElementById('scheduleBody');
    if (!tableBody) return;

    const today = new Date();
    today.setHours(0,0,0,0);
    const endFortnight = new Date();
    endFortnight.setDate(today.getDate() + 14);
    endFortnight.setHours(23,59,59,999);

    const activeFortnightBookings = schedules.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= today && itemDate <= endFortnight;
    }).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    if (activeFortnightBookings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No bookings scheduled for the upcoming 14 days.</td></tr>`;
        return;
    }

    tableBody.innerHTML = activeFortnightBookings.map(item => `
        <tr id="row-${item.uid}">
            <td>
                <span class="status-badge ${item.status}">${item.status}</span>
            </td>
            <td>
                <div style="font-weight:600;">${formatDisplayDate(item.date)}</div>
                <div style="font-size:0.85rem; color:var(--color-primary);">${item.time} (${item.duration} hrs)</div>
            </td>
            <td>
                <div style="font-weight:600;">${item.name}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">ID: ${item.id} | ${item.phone}</div>
            </td>
            <td>
                <div style="font-weight:500;">${item.service}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">${item.workers} Worker(s)</div>
            </td>
            <td>
                <div style="font-weight:600; color:var(--color-teal);">$${item.total.toFixed(2)}</div>
            </td>
            <td class="no-pdf">
                <div class="action-cell">
                    ${item.status === 'incomplete' ? `<button class="btn-table complete-trigger" onclick="toggleStatus('${item.uid}')">Complete</button>` : ''}
                    <button class="btn-table edit-trigger" onclick="initiateEditWorkflow('${item.uid}')">Reschedule</button>
                    <button class="btn-table cancel-trigger" onclick="deleteJobRecord('${item.uid}')">Cancel</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatDisplayDate(dateStr) {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ==========================================================================
// 7. INLINE STATE AND ACTION WRITERS
// ==========================================================================
window.toggleStatus = function(uid) {
    const index = schedules.findIndex(b => b.uid === uid);
    if(index !== -1) {
        schedules[index].status = 'completed';
        renderFortnightSchedule();
    }
};

window.deleteJobRecord = function(uid) {
    if(confirm('Are you sure you want to cancel this booking assignment?')) {
        schedules = schedules.filter(b => b.uid !== uid);
        renderFortnightSchedule();
        updateAvailableTimeSlots();
    }
};

window.initiateEditWorkflow = function(uid) {
    const job = schedules.find(b => b.uid === uid);
    if(!job) return;

    document.getElementById('editBookingId').value = job.uid;
    document.getElementById('clientId').value = job.id;
    document.getElementById('clientName').value = job.name;
    document.getElementById('clientEmail').value = job.email;
    document.getElementById('clientPhone').value = job.phone;
    document.getElementById('serviceType').value = job.service;
    document.getElementById('workerCount').value = job.workers;
    document.getElementById('bookingDate').value = job.date;
    document.getElementById('bookingDuration').value = job.duration;

    // Regenerate daily time vectors safely before assigning the current value
    updateAvailableTimeSlots();
    document.getElementById('bookingTime').value = job.time;
    calculateCurrentCosts();

    document.getElementById('submitBookingBtn').textContent = 'Update Booking Assignment';
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    document.querySelector('[data-target="booking"]').click();
};

document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
    resetBookingFormState();
});

function resetBookingFormState() {
    document.getElementById('bookingForm').reset();
    
    // Clear Passcode Verification Flags
    const passcodeWarning = document.getElementById('passcodeWarning');
    if (passcodeWarning) passcodeWarning.textContent = '';
    
    document.getElementById('editBookingId').value = '';
    document.getElementById('submitBookingBtn').textContent = 'Add to Schedule';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    
    document.getElementById('bookingDate').value = new Date().toISOString().split('T')[0];
    
    updateAvailableTimeSlots();
    calculateCurrentCosts();
}

// ==========================================================================
// 8. FORM SUBMIT CONTROL (PASSCODE INTERACTION GATE)
// ==========================================================================
document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const passcodeField = document.getElementById('formPasscode');
    const passcodeWarning = document.getElementById('passcodeWarning');
    
    if (passcodeWarning) passcodeWarning.textContent = '';

    // Passcode Validation Engine Check
    if (passcodeField && passcodeField.value.trim() !== 'MAST123') {
        if (passcodeWarning) {
            passcodeWarning.textContent = 'Invalid Authorization Passcode. Submission locked.';
        }
        passcodeField.focus();
        return; // Terminate execution immediately
    }

    const currentEditingUid = document.getElementById('editBookingId').value;
    const costs = calculateCurrentCosts();
    const targetTime = document.getElementById('bookingTime').value;

    if(!targetTime) {
        alert('Please pick a viable starting time window slot.');
        return;
    }

    const compiledData = {
        id: document.getElementById('clientId').value,
        name: document.getElementById('clientName').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        service: document.getElementById('serviceType').value,
        workers: parseInt(document.getElementById('workerCount').value),
        date: document.getElementById('bookingDate').value,
        time: targetTime,
        duration: parseFloat(document.getElementById('bookingDuration').value),
        total: costs.totalCost
    };

    if (currentEditingUid) {
        const idx = schedules.findIndex(b => b.uid === currentEditingUid);
        if(idx !== -1) {
            schedules[idx] = { ...schedules[idx], ...compiledData };
        }
    } else {
        compiledData.uid = 'uid-' + Date.now();
        compiledData.status = 'incomplete';
        schedules.push(compiledData);
    }

    resetBookingFormState();
    renderFortnightSchedule();
    document.querySelector('[data-target="calendar"]').click();
});

// ==========================================================================
// 9. CLIENT SIDE CLIENT DOCUMENT COMPILE (html2pdf PIPELINE)
// ==========================================================================
document.getElementById('downloadPdfBtn')?.addEventListener('click', () => {
    const element = document.getElementById('pdfContent');
    const timestampElement = document.getElementById('pdfTimestamp');
    
    if (timestampElement) {
        const now = new Date();
        timestampElement.textContent = `Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    }

    const opt = {
        margin:       10,
        filename:     'Fortnight_Service_Schedule.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, backgroundColor: '#161F30', useCORS: true, ignoreElements: (el) => el.classList.contains('no-pdf') },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const pdfHeader = document.querySelector('.pdf-header-only');
    if (pdfHeader) pdfHeader.style.display = 'block';

    html2pdf().set(opt).from(element).save().then(() => {
        if (pdfHeader) pdfHeader.style.display = 'none';
    });
});

// ==========================================================================
// 10. FIXED-PRICE QUOTE ENGINE
// ==========================================================================
document.getElementById('quoteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('quoteName').value;
    const email = document.getElementById('quoteEmail').value;
    const service = document.getElementById('quoteService').value;
    const hours = parseFloat(document.getElementById('quoteHours').value);
    const notes = document.getElementById('quoteNotes').value;

    const baseCalculatedQuote = hours * 50;
    const calculatedGst = baseCalculatedQuote * 0.10;
    const finalBindingQuotePrice = baseCalculatedQuote + calculatedGst;

    document.getElementById('quoteOutputName').textContent = name;
    document.getElementById('quoteOutputEmail').textContent = email;
    document.getElementById('quoteOutputService').textContent = service;
    document.getElementById('quoteOutputNotes').textContent = notes;
    document.getElementById('quoteOutputPrice').textContent = `$${finalBindingQuotePrice.toFixed(2)} (GST Inclusive)`;
    document.getElementById('quoteOutputDate').textContent = new Date().toLocaleString();

    document.getElementById('quoteOutput').classList.remove('hidden');
});

// ==========================================================================
// 11. BOOTSTRAP INITIALIZATION HOOK
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('bookingDate');
    if(dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    initializeDurationDropdown();
    updateAvailableTimeSlots();
    calculateCurrentCosts();
    renderFortnightSchedule();
});
