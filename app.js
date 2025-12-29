document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    lucide.createIcons();

    // 2. State Management
    let records = JSON.parse(localStorage.getItem('chronos_records')) || [];
    let activeSession = JSON.parse(localStorage.getItem('chronos_active_session')) || null;
    let timerInterval = null;

    // DOM Elements
    const punchBtn = document.getElementById('punch-btn');
    const punchText = document.getElementById('punch-text');
    const punchIcon = document.getElementById('punch-icon');
    const timerDisplay = document.getElementById('timer');
    const statusBadge = document.getElementById('status-badge');
    const historyBody = document.getElementById('history-body');
    const lastRecordDisplay = document.getElementById('last-record');
    const currentDateDisplay = document.getElementById('current-date');
    const downloadPdfBtn = document.getElementById('download-pdf');

    // Update Date
    const updateDate = () => {
        const now = new Date();
        currentDateDisplay.textContent = now.toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };
    updateDate();

    // 3. Timer Logic
    const startTimer = () => {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            const now = new Date();
            const start = new Date(activeSession.startTime);
            const diff = now - start;

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            timerDisplay.textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    };

    const stopTimer = () => {
        clearInterval(timerInterval);
        timerDisplay.textContent = "00:00:00";
    };

    // 4. Update UI State
    const updateUI = () => {
        if (activeSession) {
            punchBtn.classList.add('active', 'pulsing');
            punchText.textContent = "SALIR";
            punchIcon.setAttribute('data-lucide', 'square');
            statusBadge.textContent = "En el Trabajo";
            statusBadge.classList.replace('offline', 'online');
            startTimer();
        } else {
            punchBtn.classList.remove('active', 'pulsing');
            punchText.textContent = "FICHAR";
            punchIcon.setAttribute('data-lucide', 'play');
            statusBadge.textContent = "Fuera de Servicio";
            statusBadge.classList.replace('online', 'offline');
            stopTimer();
        }
        lucide.createIcons();
        renderHistory();

        // Show last record
        if (records.length > 0) {
            const last = records[0];
            lastRecordDisplay.textContent = `${last.date} | ${last.in} - ${last.out || '--:--'}`;
        }
    };

    // 5. Punch Logic
    punchBtn.addEventListener('click', () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('es-ES');

        if (!activeSession) {
            // Punch IN
            activeSession = {
                date: dateStr,
                startTime: now.toISOString(),
                in: timeStr
            };
            localStorage.setItem('chronos_active_session', JSON.stringify(activeSession));
        } else {
            // Punch OUT
            const sessionEnd = {
                ...activeSession,
                out: timeStr,
                endTime: now.toISOString(),
                total: calculateDuration(activeSession.startTime, now.toISOString())
            };

            records.unshift(sessionEnd); // Add to start of list
            localStorage.setItem('chronos_records', JSON.stringify(records));
            activeSession = null;
            localStorage.removeItem('chronos_active_session');
        }
        updateUI();
    });

    const calculateDuration = (start, end) => {
        const diff = new Date(end) - new Date(start);
        const hours = (diff / 3600000).toFixed(2);
        return `${hours}h`;
    };

    // 6. Render History
    const renderHistory = () => {
        historyBody.innerHTML = records.map(reg => `
            <tr>
                <td>${reg.date}</td>
                <td>${reg.in}</td>
                <td>${reg.out || '-'}</td>
                <td style="font-weight: 600; color: var(--accent-primary)">${reg.total || '-'}</td>
            </tr>
        `).join('');
    };

    // 7. PDF Generation (Professional Report)
    downloadPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Styles
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(0, 150, 255);
        doc.text("REGISTRO MENSUAL DE JORNADA", 20, 30);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 20, 40);

        // Table
        const tableData = records.map(r => [r.date, r.in, r.out, r.total]);

        doc.autoTable({
            startY: 50,
            head: [['Fecha', 'Entrada', 'Salida', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [0, 150, 255] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        doc.save(`Registro_Jornada_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
    });

    // Initial Load
    updateUI();
});
