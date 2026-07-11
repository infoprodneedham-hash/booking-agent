// --- Navigation Tab Control Logic ---
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class states
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Assign active configurations
        button.classList.add('active');
        const targetTab = button.getAttribute('data-target');
        document.getElementById(targetTab).classList.add('active');
    });
});

// --- Dynamic Dropdown Configuration Options Setup ---
function initializeFormSelectOptions() {
    const timeSelect = document.getElementById('bookingTime');
    const durationSelect = document.getElementById('bookingDuration');
    
    if (!timeSelect || !durationSelect) return;

    // Generate 30-minute intervals between 6 AM and 6 PM
    timeSelect.innerHTML = '';
    for (let hour = 6; hour <= 18; hour++) {
        const hourString = hour < 10 ? `0${hour}` : hour;
        
        // Exact Hour Option
        timeSelect.appendChild(new Option(`${hourString}:00`, `${hourString}:00`));
        
        // Skip last half hour past 6 PM window limit
        if (hour !== 18) {
            timeSelect.appendChild(new Option(`${hourString}:30`, `${hourString}:30`));
        }
    }

    // Generate Durations in increments of 30 mins up to 8 hours max
    durationSelect.innerHTML = '';
    for (let min = 30; min <= 480; min += 30) {
        const hrs = min / 60;
        const label = hrs === 1 ? '1 hour' : `${hrs} hours`;
        durationSelect.appendChild(new Option(label, hrs));
    }
}

// --- Live Application Reactive Cost Calculator Core ---
const bookingForm = document.getElementById('bookingForm');
const hourlyRate = 50;

function calculateCurrentCosts() {
    const workers = parseInt(document.getElementById('workerCount')?.value || 1);
    const hours = parseFloat(document.getElementById('bookingDuration')?.value || 0.5);
    const materials = parseFloat(document.getElementById('materialsCost')?.value || 0);
    const useGst = document.getElementById('includeGst')?.checked;

    const baseCost = workers * hours * hourlyRate;
    const gstValue = useGst ? (baseCost + materials) * 0.10 : 0;
    const totalCost = baseCost + materials + gstValue;

    // Direct UI assignment update pipeline
    document.getElementById('summaryBase').textContent = `$${baseCost.toFixed(2)}`;
    document.getElementById('summaryMaterials').textContent = `$${materials.toFixed(2)}`;
    document.getElementById('summaryGst').textContent = `$${gstValue.toFixed(2)}`;
    document.getElementById('summaryTotal').textContent = `$${totalCost.toFixed(2)}`;

    return { baseCost, materials, gstValue, totalCost };
}

// Attach Live Computation Listeners
['workerCount', 'bookingDuration', 'materialsCost', 'includeGst'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateCurrentCosts);
});

// --- Memory Data Management (Mock In-Memory Storage Engine) ---
// Populated initial sample records matching requirement arrays
let schedules = [
    {
        id: "CUST-412",
        name: "Alice Vance",
        email: "alice@example.com",
        phone: "0411 222 333",
        service: "Indoor & Outdoor Cleaning",
        workers: 1,
        date: getOffsetDateString(2),
        time: "09:30",
        duration: 2,
        total: 110.00
    },
    {
        id: "CUST-902",
        name: "Marcus Brody",
        email: "marcus@domain.au",
        phone: "0499 888 777",
        service: "Garden Maintenance",
        workers: 2,
        date: getOffsetDateString(5),
        time: "14:00",
        duration: 3,
        total: 330.00
    }
];

function getOffsetDateString(daysAhead) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    return targetDate.toISOString().split('T')[0];
}

// --- Render Schedule Matrix Rows ---
function renderFortnightSchedule() {
    const tableBody = document.getElementById('scheduleBody');
    if (!tableBody) return;

    // Filter to retain bookings only within the local upcoming fortnight frame
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
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No bookings scheduled for the upcoming 14 days.</td></tr>`;
        return;
    }

    tableBody.innerHTML = activeFortnightBookings.map(item => `
        <tr>
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
                <div style="font-size:0.85rem; color:var(--text-muted);">${item.workers} Worker(s) assigned</div>
            </td>
            <td>
                <div style="font-weight:600; color:var(--color-teal);">$${item.total.toFixed(2)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">7-day Terms</div>
            </td>
        </tr>
    `).join('');
}

function formatDisplayDate(dateStr) {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Handle New Booking Post Actions
bookingForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const costs = calculateCurrentCosts();
    
    const newBooking = {
        id: document.getElementById('clientId').value,
        name: document.getElementById('clientName').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        service: document.getElementById('serviceType').value,
        workers: parseInt(document.getElementById('workerCount').value),
        date: document.getElementById('bookingDate').value,
        time: document.getElementById('bookingTime').value,
        duration: parseFloat(document.getElementById('bookingDuration').value),
        total: costs.totalCost
    };

    schedules.push(newBooking);
    bookingForm.reset();
    initializeFormSelectOptions();
    calculateCurrentCosts();
    renderFortnightSchedule();
    
    // Switch UI context view target dynamically to the schedule view
    document.querySelector('[data-target="calendar"]').click();
});

// --- Document Generation Logic (html2pdf Integration Pipeline) ---
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
        html2canvas:  { scale: 2, backgroundColor: '#161F30', useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Temporarily structural inject visibility states specifically for the PDF compiler engine instance
    const pdfHeader = document.querySelector('.pdf-header-only');
    if (pdfHeader) pdfHeader.style.display = 'block';

    html2pdf().set(opt).from(element).save().then(() => {
        if (pdfHeader) pdfHeader.style.display = 'none';
    });
});

// --- Fixed-Price Quote & Agreement Engine ---
document.getElementById('quoteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('quoteName').value;
    const email = document.getElementById('quoteEmail').value;
    const service = document.getElementById('quoteService').value;
    const hours = parseFloat(document.getElementById('quoteHours').value);
    const notes = document.getElementById('quoteNotes').value;

    // Base calculation algorithm matching internal standard definitions ($50 flat base hourly scale)
    const baseCalculatedQuote = hours * 50;
    const calculatedGst = baseCalculatedQuote * 0.10;
    const finalBindingQuotePrice = baseCalculatedQuote + calculatedGst;

    // Map UI Output DOM elements
    document.getElementById('quoteOutputName').textContent = name;
    document.getElementById('quoteOutputEmail').textContent = email;
    document.getElementById('quoteOutputService').textContent = service;
    document.getElementById('quoteOutputNotes').textContent = notes;
    document.getElementById('quoteOutputPrice').textContent = `$${finalBindingQuotePrice.toFixed(2)} (GST Inclusive)`;
    document.getElementById('quoteOutputDate').textContent = new Date().toLocaleString();

    document.getElementById('quoteOutput').classList.remove('hidden');
});

// --- Application Core Bootstrap Hook ---
window.addEventListener('DOMContentLoaded', () => {
    // Set modern standard HTML5 min date boundary defaults to today's timestamp
    const dateInput = document.getElementById('bookingDate');
    if(dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    initializeFormSelectOptions();
    calculateCurrentCosts();
    renderFortnightSchedule();
});
