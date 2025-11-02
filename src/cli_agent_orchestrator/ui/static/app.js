const summaryContainer = document.getElementById("session-summary");
const refreshSummaryBtn = document.getElementById("refresh-summary");
const createSessionForm = document.getElementById("create-session-form");
const createSessionFeedback = document.getElementById("create-session-feedback");
const terminalTemplate = document.getElementById("terminal-template");
const sessionTemplate = document.getElementById("session-template");
const terminalMetadata = document.getElementById("terminal-metadata");
const terminalOutput = document.getElementById("terminal-output");
const terminalInput = document.getElementById("terminal-input");
const terminalInputForm = document.getElementById("terminal-input-form");
const terminalSendBtn = document.getElementById("terminal-send");
const terminalFeedback = document.getElementById("terminal-feedback");
const refreshTerminalBtn = document.getElementById("refresh-terminal");
const fetchFullOutputBtn = document.getElementById("fetch-full-output");
const exitTerminalBtn = document.getElementById("exit-terminal");

let selectedTerminalId = null;
let pollingHandle = null;

const formatTimestamp = (isoString) => {
    if (!isoString) {
        return "—";
    }
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const showFeedback = (element, message, type = "info") => {
    element.textContent = message;
    element.dataset.type = type;
    if (message) {
        setTimeout(() => {
            if (element.textContent === message) {
                element.textContent = "";
            }
        }, 5000);
    }
};

const renderTerminalCard = (terminal) => {
    const fragment = terminalTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".terminal-card");
    card.dataset.terminalId = terminal.id;

    fragment.querySelector("h3").textContent = `${terminal.name} (${terminal.id})`;

    const statusEl = fragment.querySelector(".status");
    statusEl.textContent = terminal.status ?? "unknown";
    statusEl.dataset.status = terminal.status ?? "unknown";

    fragment.querySelector(".provider").textContent = terminal.provider;
    fragment.querySelector(".agent-profile").textContent = terminal.agent_profile ?? "—";
    fragment.querySelector(".last-active").textContent = formatTimestamp(terminal.last_active);
    fragment.querySelector(".last-message").textContent = terminal.last_message || "—";

    fragment.querySelector(".view-terminal").addEventListener("click", () => {
        loadTerminalDetails(terminal.id);
    });

    return fragment;
};

const renderSessionCard = (session) => {
    const fragment = sessionTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".session-card");
    fragment.querySelector("h3").textContent = session.session_name;
    fragment.querySelector(".counts").textContent = `${session.terminals.length} terminals`;

    const terminalsContainer = fragment.querySelector(".terminals");
    session.terminals.forEach((terminal) => {
        terminalsContainer.appendChild(renderTerminalCard(terminal));
    });

    return fragment;
};

const fetchSummary = async () => {
    summaryContainer.innerHTML = "<p class=\"loading\">Loading summary…</p>";
    try {
        const response = await fetch("/summary");
        if (!response.ok) {
            throw new Error(`Failed to load summary: ${response.status}`);
        }
        const data = await response.json();
        summaryContainer.innerHTML = "";

        if (data.sessions.length === 0) {
            summaryContainer.innerHTML = "<p>No active sessions yet. Create one to get started.</p>";
            return;
        }

        data.sessions.forEach((session) => {
            summaryContainer.appendChild(renderSessionCard(session));
        });
    } catch (error) {
        summaryContainer.innerHTML = `<p class="error">${error.message}</p>`;
    }
};

const loadTerminalDetails = async (terminalId) => {
    selectedTerminalId = terminalId;
    clearInterval(pollingHandle);

    terminalMetadata.innerHTML = "<p>Loading terminal…</p>";
    terminalOutput.textContent = "";
    terminalInput.disabled = true;
    terminalSendBtn.disabled = true;
    refreshTerminalBtn.disabled = true;
    fetchFullOutputBtn.disabled = true;
    exitTerminalBtn.disabled = true;

    try {
        const [metadataRes, outputRes] = await Promise.all([
            fetch(`/terminals/${terminalId}`),
            fetch(`/terminals/${terminalId}/output?mode=last`)
        ]);

        if (!metadataRes.ok) {
            throw new Error(`Failed to load terminal metadata: ${metadataRes.status}`);
        }

        const metadata = await metadataRes.json();
        terminalMetadata.innerHTML = `
            <ul class="metadata-list">
                <li><strong>ID:</strong> ${metadata.id}</li>
                <li><strong>Name:</strong> ${metadata.name}</li>
                <li><strong>Provider:</strong> ${metadata.provider}</li>
                <li><strong>Agent Profile:</strong> ${metadata.agent_profile ?? "—"}</li>
                <li><strong>Status:</strong> ${metadata.status}</li>
                <li><strong>Session:</strong> ${metadata.session_name}</li>
            </ul>`;

        const outputData = outputRes.ok ? await outputRes.json() : { output: "" };
        terminalOutput.textContent = outputData.output || "No output yet.";
        terminalOutput.scrollTop = terminalOutput.scrollHeight;

        terminalInput.disabled = false;
        terminalSendBtn.disabled = false;
        refreshTerminalBtn.disabled = false;
        fetchFullOutputBtn.disabled = false;
        exitTerminalBtn.disabled = false;

        pollingHandle = setInterval(async () => {
            if (!selectedTerminalId) {
                return;
            }
            const res = await fetch(`/terminals/${selectedTerminalId}/output?mode=last`);
            if (res.ok) {
                const { output } = await res.json();
                if (output) {
                    terminalOutput.textContent = output;
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                }
            }
        }, 5000);
    } catch (error) {
        terminalMetadata.innerHTML = `<p class="error">${error.message}</p>`;
    }
};

const sendTerminalInput = async (event) => {
    event.preventDefault();
    if (!selectedTerminalId || !terminalInput.value.trim()) {
        return;
    }

    const message = terminalInput.value;
    terminalSendBtn.disabled = true;

    try {
        const response = await fetch(`/terminals/${selectedTerminalId}/input?message=${encodeURIComponent(message)}`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(`Failed to send input: ${response.status}`);
        }

        showFeedback(terminalFeedback, "Command sent successfully", "success");
        terminalInput.value = "";
        await refreshTerminalOutput();
    } catch (error) {
        showFeedback(terminalFeedback, error.message, "error");
    } finally {
        terminalSendBtn.disabled = false;
    }
};

const refreshTerminalOutput = async () => {
    if (!selectedTerminalId) {
        return;
    }
    refreshTerminalBtn.disabled = true;
    try {
        const response = await fetch(`/terminals/${selectedTerminalId}/output?mode=full`);
        if (!response.ok) {
            throw new Error(`Failed to refresh output: ${response.status}`);
        }
        const data = await response.json();
        terminalOutput.textContent = data.output;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    } catch (error) {
        showFeedback(terminalFeedback, error.message, "error");
    } finally {
        refreshTerminalBtn.disabled = false;
    }
};

const downloadFullOutput = async () => {
    if (!selectedTerminalId) {
        return;
    }
    try {
        const response = await fetch(`/terminals/${selectedTerminalId}/output?mode=full`);
        if (!response.ok) {
            throw new Error(`Failed to download output: ${response.status}`);
        }
        const data = await response.json();
        const blob = new Blob([data.output], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedTerminalId}-output.txt`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showFeedback(terminalFeedback, error.message, "error");
    }
};

const exitTerminal = async () => {
    if (!selectedTerminalId) {
        return;
    }
    try {
        const response = await fetch(`/terminals/${selectedTerminalId}/exit`, { method: "POST" });
        if (!response.ok) {
            throw new Error(`Failed to send exit command: ${response.status}`);
        }
        showFeedback(terminalFeedback, "Exit command sent", "success");
    } catch (error) {
        showFeedback(terminalFeedback, error.message, "error");
    }
};

const createSession = async (event) => {
    event.preventDefault();
    const formData = new FormData(createSessionForm);
    const payload = {
        provider: formData.get("provider"),
        agent_profile: formData.get("agentProfile"),
        session_name: formData.get("sessionName") || undefined
    };

    createSessionFeedback.textContent = "Creating session…";

    try {
        const response = await fetch(`/sessions?provider=${encodeURIComponent(payload.provider)}&agent_profile=${encodeURIComponent(payload.agent_profile)}${payload.session_name ? `&session_name=${encodeURIComponent(payload.session_name)}` : ""}`, {
            method: "POST"
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const detail = errorBody.detail ? `: ${errorBody.detail}` : "";
            throw new Error(`Failed to create session${detail}`);
        }

        showFeedback(createSessionFeedback, "Session created successfully", "success");
        createSessionForm.reset();
        await fetchSummary();
    } catch (error) {
        showFeedback(createSessionFeedback, error.message, "error");
    }
};

refreshSummaryBtn.addEventListener("click", fetchSummary);
createSessionForm.addEventListener("submit", createSession);
terminalInputForm.addEventListener("submit", sendTerminalInput);
refreshTerminalBtn.addEventListener("click", refreshTerminalOutput);
fetchFullOutputBtn.addEventListener("click", downloadFullOutput);
exitTerminalBtn.addEventListener("click", exitTerminal);

fetchSummary();
