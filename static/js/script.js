let cachedMetrics = {};
let sampleProfiles = {};

document.addEventListener("DOMContentLoaded", function() {
    fetchMetrics();
    fetchSamples();
});

function updateUtilizationDisplay(val) {
    const percentage = Math.round(parseFloat(val) * 100);
    const label = document.getElementById("utilization-val");
    if (label) {
        label.textContent = percentage + "%";
    }
}

function fetchSamples() {
    fetch("/api/samples")
        .then(response => response.json())
        .then(data => {
            sampleProfiles = data;
        })
        .catch(err => {
            console.error("Failed to load sample profiles", err);
        });
}

function loadSample(sampleKey) {
    if (!sampleProfiles[sampleKey]) {
        return;
    }
    const sample = sampleProfiles[sampleKey];
    
    document.getElementById("age").value = sample.age;
    document.getElementById("annual_income").value = sample.annual_income;
    document.getElementById("loan_amount").value = sample.loan_amount;
    document.getElementById("loan_term_months").value = sample.loan_term_months;
    document.getElementById("credit_history_years").value = sample.credit_history_years;
    document.getElementById("num_open_accounts").value = sample.num_open_accounts;
    document.getElementById("num_late_payments").value = sample.num_late_payments;
    document.getElementById("total_debt").value = sample.total_debt;
    
    const utilInput = document.getElementById("credit_utilization_ratio");
    utilInput.value = sample.credit_utilization_ratio;
    updateUtilizationDisplay(sample.credit_utilization_ratio);
    
    const radios = document.getElementsByName("model_choice");
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].value === sample.model_choice) {
            radios[i].checked = true;
        }
    }
    
    submitCurrentFormData();
}

function resetForm() {
    document.getElementById("prediction-form").reset();
    updateUtilizationDisplay(0.25);
    document.getElementById("empty-state").style.display = "block";
    document.getElementById("active-results").style.display = "none";
    
    const badge = document.getElementById("result-status-badge");
    badge.className = "result-badge badge-pending";
    badge.textContent = "Awaiting Evaluation";
}

function handleFormSubmit(event) {
    event.preventDefault();
    submitCurrentFormData();
}

function submitCurrentFormData() {
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerText = "Evaluating...";

    const modelRadios = document.getElementsByName("model_choice");
    let selectedModel = "Random Forest";
    for (let i = 0; i < modelRadios.length; i++) {
        if (modelRadios[i].checked) {
            selectedModel = modelRadios[i].value;
            break;
        }
    }

    const payload = {
        age: parseFloat(document.getElementById("age").value),
        annual_income: parseFloat(document.getElementById("annual_income").value),
        loan_amount: parseFloat(document.getElementById("loan_amount").value),
        loan_term_months: parseInt(document.getElementById("loan_term_months").value),
        credit_history_years: parseFloat(document.getElementById("credit_history_years").value),
        num_open_accounts: parseInt(document.getElementById("num_open_accounts").value),
        num_late_payments: parseInt(document.getElementById("num_late_payments").value),
        credit_utilization_ratio: parseFloat(document.getElementById("credit_utilization_ratio").value),
        total_debt: parseFloat(document.getElementById("total_debt").value),
        model_choice: selectedModel
    };

    fetch("/api/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        displayResults(result);
    })
    .catch(error => {
        console.error("Prediction error:", error);
        alert("Failed to calculate prediction. Please ensure server is running.");
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = "Predict Creditworthiness";
    });
}

function displayResults(data) {
    document.getElementById("empty-state").style.display = "none";
    document.getElementById("active-results").style.display = "block";

    const badge = document.getElementById("result-status-badge");
    badge.className = "result-badge badge-" + data.decision_class;
    badge.textContent = data.decision;

    document.getElementById("score-number").textContent = data.credit_score;
    document.getElementById("decision-text").textContent = data.decision;
    document.getElementById("rating-text").textContent = "Tier: " + data.rating;
    
    const summaryText = document.getElementById("decision-summary");
    if (data.decision_class === "approved") {
        summaryText.textContent = "Applicant has a good credit profile with low risk of default.";
    } else if (data.decision_class === "review") {
        summaryText.textContent = "Applicant has moderate credit risk. Further review is recommended.";
    } else {
        summaryText.textContent = "Applicant has a high risk profile due to high debt or past late payments.";
    }

    document.getElementById("res-model-used").textContent = data.model_used;
    document.getElementById("res-probability").textContent = (data.probability * 100).toFixed(1) + "%";
    document.getElementById("res-default-risk").textContent = ((1 - data.probability) * 100).toFixed(1) + "%";

    const circumference = 427.25;
    const scoreFraction = Math.max(0, Math.min(1, (data.credit_score - 300) / 550));
    const offset = circumference * (1 - scoreFraction);
    
    const scoreRing = document.getElementById("score-ring");
    scoreRing.style.strokeDashoffset = offset;
    
    if (data.credit_score >= 740) {
        scoreRing.style.stroke = "#10b981";
    } else if (data.credit_score >= 670) {
        scoreRing.style.stroke = "#2563eb";
    } else if (data.credit_score >= 580) {
        scoreRing.style.stroke = "#f59e0b";
    } else {
        scoreRing.style.stroke = "#ef4444";
    }

    const dtiPct = (data.debt_to_income * 100).toFixed(1);
    const ltiPct = (data.loan_to_income * 100).toFixed(1);
    document.getElementById("res-dti").textContent = dtiPct + "%";
    document.getElementById("res-lti").textContent = ltiPct + "%";
    
    document.getElementById("dti-bar-fill").style.width = Math.min(100, dtiPct) + "%";
    document.getElementById("lti-bar-fill").style.width = Math.min(100, ltiPct) + "%";

    const posList = document.getElementById("positive-factors-list");
    posList.innerHTML = "";
    if (data.positive_factors && data.positive_factors.length > 0) {
        data.positive_factors.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            posList.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.textContent = "No positive factors recorded.";
        posList.appendChild(li);
    }

    const riskList = document.getElementById("risk-factors-list");
    riskList.innerHTML = "";
    if (data.risk_factors && data.risk_factors.length > 0) {
        data.risk_factors.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            riskList.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.textContent = "No major risk factors found.";
        riskList.appendChild(li);
    }
}

function fetchMetrics() {
    fetch("/api/metrics")
        .then(response => response.json())
        .then(data => {
            cachedMetrics = data;
            renderMetricsTable(data);
            renderMetricsChart(data);
            renderActiveConfusionMatrix();
        })
        .catch(err => {
            console.error("Failed to load metrics", err);
        });
}

function renderMetricsTable(metrics) {
    const tbody = document.getElementById("metrics-table-body");
    tbody.innerHTML = "";

    const useCases = {
        "Logistic Regression": "Linear classification model",
        "Decision Tree": "Tree based classifier",
        "Random Forest": "Ensemble classifier"
    };

    for (const [modelName, m] of Object.entries(metrics)) {
        const tr = document.createElement("tr");
        
        const tdName = document.createElement("td");
        tdName.innerHTML = `<strong>${modelName}</strong>`;
        tr.appendChild(tdName);

        const tdAcc = document.createElement("td");
        tdAcc.className = "metric-highlight";
        tdAcc.textContent = (m.accuracy * 100).toFixed(1) + "%";
        tr.appendChild(tdAcc);

        const tdPrec = document.createElement("td");
        tdPrec.className = "metric-highlight";
        tdPrec.textContent = (m.precision * 100).toFixed(1) + "%";
        tr.appendChild(tdPrec);

        const tdRec = document.createElement("td");
        tdRec.className = "metric-highlight";
        tdRec.textContent = (m.recall * 100).toFixed(1) + "%";
        tr.appendChild(tdRec);

        const tdF1 = document.createElement("td");
        tdF1.className = "metric-highlight";
        tdF1.textContent = (m.f1_score * 100).toFixed(1) + "%";
        tr.appendChild(tdF1);

        const tdRoc = document.createElement("td");
        tdRoc.className = "metric-highlight";
        tdRoc.textContent = (m.roc_auc).toFixed(4);
        tr.appendChild(tdRoc);

        const tdCase = document.createElement("td");
        tdCase.textContent = useCases[modelName] || "General Assessment";
        tr.appendChild(tdCase);

        tbody.appendChild(tr);
    }
}

function renderMetricsChart(metrics) {
    const canvas = document.getElementById("metricsChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.parentElement.clientWidth || 600;
    const displayHeight = 280;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const models = Object.keys(metrics);
    if (models.length === 0) return;

    const metricKeys = ["precision", "recall", "f1_score", "roc_auc"];
    const colors = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6"];

    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;
    const chartW = displayWidth - paddingLeft - paddingRight;
    const chartH = displayHeight - paddingTop - paddingBottom;

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p = 0; p <= 100; p += 25) {
        const y = paddingTop + chartH - (p / 100) * chartH;
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(displayWidth - paddingRight, y);
        
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(p + "%", paddingLeft - 8, y + 4);
    }
    ctx.stroke();

    const groupWidth = chartW / models.length;
    const barWidth = 14;
    const totalBarsWidth = metricKeys.length * barWidth + (metricKeys.length - 1) * 4;

    models.forEach((modelName, mIdx) => {
        const groupCenterX = paddingLeft + (mIdx * groupWidth) + (groupWidth / 2);
        const startX = groupCenterX - (totalBarsWidth / 2);

        metricKeys.forEach((key, kIdx) => {
            const rawVal = metrics[modelName][key];
            const valRatio = Math.min(1.0, rawVal);
            const bH = valRatio * chartH;
            const bX = startX + kIdx * (barWidth + 4);
            const bY = paddingTop + chartH - bH;

            ctx.fillStyle = colors[kIdx];
            ctx.beginPath();
            ctx.roundRect(bX, bY, barWidth, bH, [3, 3, 0, 0]);
            ctx.fill();
        });

        ctx.fillStyle = "#0f172a";
        ctx.font = "600 12px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(modelName, groupCenterX, displayHeight - 12);
    });
}

function renderActiveConfusionMatrix() {
    const selector = document.getElementById("matrix-model-selector");
    const selectedModel = selector.value;
    
    if (!cachedMetrics[selectedModel]) return;
    
    const cm = cachedMetrics[selectedModel].confusion_matrix;
    const tn = cm[0][0];
    const fp = cm[0][1];
    const fn = cm[1][0];
    const tp = cm[1][1];

    document.getElementById("tn-count").textContent = tn;
    document.getElementById("fp-count").textContent = fp;
    document.getElementById("fn-count").textContent = fn;
    document.getElementById("tp-count").textContent = tp;

    const totalNegatives = tn + fp;
    const totalPositives = fn + tp;

    const fpr = totalNegatives > 0 ? ((fp / totalNegatives) * 100).toFixed(1) : "0.0";
    const fnr = totalPositives > 0 ? ((fn / totalPositives) * 100).toFixed(1) : "0.0";

    document.getElementById("cm-fpr").textContent = fpr + "%";
    document.getElementById("cm-fnr").textContent = fnr + "%";
}
