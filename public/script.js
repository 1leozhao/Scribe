document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('record-btn');
  const resetBtn = document.getElementById('reset-btn');
  const undoBtn = document.getElementById('undo-btn');
  const generateNoteBtn = document.getElementById('generate-note-btn');
  const transcriptionText = document.getElementById('transcription');
  const outputText = document.getElementById('output');
  const loadingIndicator = document.getElementById('loading-indicator');
  const saveTranscriptBtn = document.getElementById('save-transcript-btn');
  const saveNoteBtn = document.getElementById('save-note-btn');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;

  let recordings = [];
  let isRecording = false;
  let currentRecording = '';
  let lastFinalTranscript = '';

  recordBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  function startRecording() {
    currentRecording = '';
    lastFinalTranscript = '';
    recognition.start();
    updateButtonState(recordBtn, 'Stop Recording', true);
    recordBtn.classList.add('pulse');
    isRecording = true;
  }

  function stopRecording() {
    recognition.stop();
    updateButtonState(recordBtn, 'Start Recording', false);
    recordBtn.classList.remove('pulse');
    isRecording = false;

    if (currentRecording.trim()) {
      recordings.push(currentRecording.trim() + '\n');
      currentRecording = '';
    }
    updateTranscriptionText();
    updateUndoButton();
  }

  recognition.addEventListener('result', (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        lastFinalTranscript += result;
      } else {
        interimTranscript += result;
      }
    }
    currentRecording = lastFinalTranscript + interimTranscript;
    updateTranscriptionText();
  });

  recognition.addEventListener('end', () => {
    if (isRecording) recognition.start();
  });

  resetBtn.addEventListener('click', resetRecording);

  function resetRecording() {
    transcriptionText.value = '';
    recordings = [];
    currentRecording = '';
    updateUndoButton();
  }

  undoBtn.addEventListener('click', () => {
    if (recordings.length > 0) {
      recordings.pop();
      updateTranscriptionText();
    }
    updateUndoButton();
  });

  async function generateClinicalNote() {
    const fullTranscript = recordings.join('\n') + (currentRecording ? '\n' + currentRecording : '');
    const prompt = `This is a transcript from a provider and patient conversation:\n\n"${fullTranscript}"\n\nPlease generate a clinical note including HPI, review of systems, physical exam, and assessment and plan. Do not include anything that was not discussed in the conversation. 
    After the assessment and plan please add a section called “Additional Considerations” and provide additional considerations and actions the doctor could have taken into account for their assessment and plan.
    If the recording does not appear to be a provider/patient conversation, then simply write out a general summary of the conversation and list out any action items from the conversation.
    Please provide the output in plain text without any Markdown formatting.`;

    loadingIndicator.style.display = 'block';
    generateNoteBtn.disabled = true;
    outputText.value = '';

    try {
      const response = await fetch('/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      outputText.value = data.choices[0].message.content || "No output received.";
    } catch (error) {
      outputText.value = "Error generating clinical note. Please try again.";
    } finally {
      loadingIndicator.style.display = 'none';
      generateNoteBtn.disabled = false;
    }
  }

  generateNoteBtn.addEventListener('click', generateClinicalNote);

  function updateTranscriptionText() {
    transcriptionText.value = recordings.join('\n') + (currentRecording ? '\n' + currentRecording : '');
  }

  saveTranscriptBtn.addEventListener('click', saveTranscript);

  function saveTranscript() {
    const fullTranscript = recordings.join('\n') + (currentRecording ? '\n' + currentRecording : '');
    const blob = new Blob([fullTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  saveNoteBtn.addEventListener('click', saveClinicalNote);

  function saveClinicalNote() {
    const clinicalNote = outputText.value;
    const blob = new Blob([clinicalNote], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinical_note.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function updateUndoButton() {
    undoBtn.disabled = recordings.length === 0;
  }

  function updateButtonState(button, text, isActive) {
    button.textContent = text;
    button.style.backgroundColor = isActive ? 'red' : '';
    button.style.border = isActive ? '2px solid darkred' : '';
  }

  updateUndoButton();
});