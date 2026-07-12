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
        
        if(targetTab !== 'calendar') {
            lockScheduleTabSecureData();
        }
    });
});

// Global state tracking variable to bind active generated quote strings cleanly
let activeQuoteReferenceNumber = "";

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

    const dayBookings = schedules.filter(b => b.date === selectedDate && b.uid !== currentEditingUid);
    let standardSlotsAdded = 0;
    let blockedSlotsCount = 0;

    for (let hour = 6; hour <= 18; hour += 0.5) {
        if (hour === 18) break;

        const hh = Math.floor(hour);
        const mm = (hour % 1) === 0 ? '00' : '30';
        const timeStr = `${hh < 10 ? '0' + hh : hh}:${mm}`;

        const currentSlotStart = hour;
        const currentSlotEnd = hour + selectedDuration;

        let isBlocked = false;

        for (const booking of dayBookings) {
            const bookedStart = timeStringToDecimal(booking.time);
            const bookedEnd = bookedStart + booking.duration;

            const safeBlockStart = bookedStart - 1.0;
            const safeBlockEnd = bookedEnd + 1.0;

            if (currentSlotStart < safeBlockEnd && currentSlotEnd > safeBlockStart) {
                isBlocked = true;
                break;
            }
        }

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

    return { totalCost, baseCost, gstValue, materials };
}

['workerCount', 'bookingDuration', 'materialsCost', 'includeGst'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateCurrentCosts);
});

// ==========================================================================
// 6. SCHEDULE INTERACTIVE RENDER ENGINE & PUBLIC BLOCKED TIMELINE
// ==========================================================================
function renderPublicTimelineBlocks() {
    const publicTimelineBody = document.getElementById('publicTimelineBody');
    if (!publicTimelineBody) return;

    publicTimelineBody.innerHTML = '';

    for (let i = 0; i < 14; i++) {
        const targetDateStr = getOffsetDateString(i);
        const dailyJobs = schedules.filter(b => b.date === targetDateStr);

        const row = document.createElement('div');
        row.className = 'timeline-day-row';

        const label = document.createElement('div');
        label.className = 'timeline-day-label';
        label.textContent = formatDisplayDate(targetDateStr);
        row.appendChild(label);

        const blocksStrip = document.createElement('div');
        blocksStrip.className = 'timeline-blocks-strip';

        if (dailyJobs.length === 0) {
            blocksStrip.innerHTML = `<span class="timeline-block-tag clear">Entire Day Available</span>`;
        } else {
            dailyJobs.sort((a,b) => timeStringToDecimal(a.time) - timeStringToDecimal(b.time));
            dailyJobs.forEach(job => {
                const startTimeDec = timeStringToDecimal(job.time);
                const endTimeDec = startTimeDec + job.duration;

                const endHh = Math.floor(endTimeDec);
                const endMm = (endTimeDec % 1) === 0 ? '00' : '30';
                const calculatedEndTimeStr = `${endHh < 10 ? '0' + endHh : endHh}:${endMm}`;

                blocksStrip.innerHTML += `<span class="timeline-block-tag">🔒 Blocked: ${job.time} - ${calculatedEndTimeStr}</span>`;
            });
        }

        row.appendChild(blocksStrip);
        publicTimelineBody.appendChild(row);
    }
}

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
            <td><span class="status-badge ${item.status}">${item.status}</span></td>
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
            <td><div style="font-weight:600; color:var(--color-teal);">$${item.total.toFixed(2)}</div></td>
            <td>
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
// 7. PRIVACY LOCK/UNLOCK HANDLERS FOR THE SCHEDULE VIEW
// ==========================================================================
document.getElementById('unlockScheduleBtn')?.addEventListener('click', () => {
    const passcodeField = document.getElementById('schedulePasscode');
    const warningLabel = document.getElementById('schedulePasscodeWarning');
    const secureContent = document.getElementById('secureScheduleContent');
    const scheduleGate = document.getElementById('scheduleGate');

    if(warningLabel) warningLabel.textContent = '';

    if(passcodeField && passcodeField.value.trim() === 'MAST123') {
        secureContent.classList.remove('hidden');
        scheduleGate.classList.add('hidden');
        passcodeField.value = '';
        renderFortnightSchedule();
    } else {
        if(warningLabel) warningLabel.textContent = 'Invalid Passcode. Access to private details denied.';
    }
});

function lockScheduleTabSecureData() {
    document.getElementById('secureScheduleContent')?.classList.add('hidden');
    document.getElementById('scheduleGate')?.classList.remove('hidden');
    const warning = document.getElementById('schedulePasscodeWarning');
    if(warning) warning.textContent = '';
    const input = document.getElementById('schedulePasscode');
    if(input) input.value = '';
}

// ==========================================================================
// 8. INLINE STATE AND ACTION WRITERS
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
        renderPublicTimelineBlocks();
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
// 9. FORM SUBMIT CONTROL (WITH NATIVE FORMSPREE POST DISPATCH)
// ==========================================================================
document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const passcodeField = document.getElementById('formPasscode');
    const passcodeWarning = document.getElementById('passcodeWarning');
    
    if (passcodeWarning) passcodeWarning.textContent = '';

    if (passcodeField && passcodeField.value.trim() !== 'MAST123') {
        if (passcodeWarning) passcodeWarning.textContent = 'Invalid Authorization Passcode. Submission locked.';
        passcodeField.focus();
        return;
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
        baseCost: costs.baseCost,
        materialsCost: costs.materials,
        gstComponent: costs.gstValue,
        total: costs.totalCost
    };

    // --- Formspree POST Delivery Pipeline ---
    fetch("https://formspree.io/f/https://formspree.io/f/meeyjpqb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ formType: "New Service Booking Assignment", ...compiledData })
    })
    .then(response => {
        if (response.ok) {
            console.log("Formspree collection delivery successful.");
        } else {
            console.error("Formspree transmission warning encountered.");
        }
    })
    .catch(error => console.error("Network structural transmission failure:", error));

    // Persist to UI application memory structure natively
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
    renderPublicTimelineBlocks();
    
    document.getElementById('secureScheduleContent').classList.remove('hidden');
    document.getElementById('scheduleGate').classList.add('hidden');
    renderFortnightSchedule();

    document.querySelector('[data-target="calendar"]').click();
});

// ==========================================================================
// 10. CALLBACK SUBMIT HANDLING HOOKS (WITH FORMSPREE POST DISPATCH)
// ==========================================================================
document.getElementById('scheduleCallbackForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phoneNum = document.getElementById('scheduleCallbackPhone').value;
    
    fetch("https://formspree.io/f/https://formspree.io/f/meeyjpqb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ formType: "Urgent Schedule Change Callback Request", contactPhone: phoneNum, contextualTimestamp: new Date().toISOString() })
    });

    alert(`Priority Callback Registered!\nAn agent will call ${phoneNum} shortly to resolve schedule changes.`);
    e.target.reset();
});

document.getElementById('quoteCallbackForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phoneNum = document.getElementById('quoteCallbackPhone').value;
    const clientName = document.getElementById('quoteOutputName').textContent || 'Provisional Client';
    const quoteValue = document.getElementById('quoteOutputPrice').textContent;

    fetch("https://formspree.io/f/https://formspree.io/f/meeyjpqb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ 
            formType: "Quote Finalization Callback Request", 
            contactPhone: phoneNum, 
            clientName: clientName, 
            quoteReference: activeQuoteReferenceNumber, 
            agreedValue: quoteValue 
        })
    });

    alert(`Callback Requested Successfully!\nOur business development team will call ${phoneNum} to finalize the contract for ${clientName}.\n\nLinked Reference: ${activeQuoteReferenceNumber}\nEvaluated at: ${quoteValue}`);
    e.target.reset();
});

// ==========================================================================
// 11. FIXED-PRICE QUOTE ENGINE (WITH FORMSPREE POST DISPATCH)
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

    const standardRandomDigits = Math.floor(10000 + Math.random() * 90000);
    activeQuoteReferenceNumber = `AA-${standardRandomDigits}`;

    const quotePayload = {
        formType: "Fixed-Price Agreement Lead Form",
        quoteReference: activeQuoteReferenceNumber,
        clientName: name,
        clientEmail: email,
        requestedScope: service,
        estimatedProjectHours: hours,
        requirementsNotes: notes,
        totalQuotedPrice: finalBindingQuotePrice
    };

    fetch("https://formspree.io/f/https://formspree.io/f/meeyjpqb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(quotePayload)
    });

    // Map UI Output DOM elements
    document.getElementById('quoteOutputRef').textContent = `Ref: ${activeQuoteReferenceNumber}`;
    document.getElementById('quoteOutputName').textContent = name;
    document.getElementById('quoteOutputEmail').textContent = email;
    document.getElementById('quoteOutputService').textContent = service;
    document.getElementById('quoteOutputNotes').textContent = notes;
    document.getElementById('quoteOutputPrice').textContent = `$${finalBindingQuotePrice.toFixed(2)} (GST Inclusive)`;
    document.getElementById('quoteOutputDate').textContent = new Date().toLocaleString();

    document.getElementById('quoteOutput').classList.remove('hidden');
});

// ==========================================================================
// 12. BOOTSTRAP INITIALIZATION HOOK
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
    renderPublicTimelineBlocks();
});
