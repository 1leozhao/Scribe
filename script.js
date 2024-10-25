// Grab elements from the DOM
const recordBtn = document.getElementById('record-btn');
const resetBtn = document.getElementById('reset-btn');
const undoBtn = document.getElementById('undo-btn');
const generateNoteBtn = document.getElementById('generate-note-btn');
const transcriptionText = document.getElementById('transcription');
const outputText = document.getElementById('output');
const loadingIndicator = document.getElementById('loading-indicator'); // Grab the loading indicator

// Create a SpeechRecognition object
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configure recognition settings
recognition.lang = 'en-US';
recognition.interimResults = true;

// Array to store each recording session
let recordings = [];
let isRecording = false;
let currentRecording = '';
let lastFinalTranscript = '';

// Toggle recording when the button is clicked
recordBtn.addEventListener('click', () => {
  if (isRecording) {
    recognition.stop();
    recordBtn.textContent = 'Start Recording';
    recordBtn.style.backgroundColor = '';
    recordBtn.style.border = '';
    recordBtn.classList.remove('pulse');
    isRecording = false;

    if (currentRecording.trim()) {
      recordings.push(currentRecording.trim() + '\n');
      currentRecording = '';
    }
    updateTranscriptionText();
    updateUndoButton();
  } else {
    currentRecording = '';
    lastFinalTranscript = '';
    recognition.start();
    recordBtn.textContent = 'Stop Recording';
    recordBtn.style.backgroundColor = 'red';
    recordBtn.style.border = '2px solid darkred';
    recordBtn.classList.add('pulse');
    isRecording = true;
  }
});

// Capture speech and update the textarea with the result
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
  if (isRecording) {
    recognition.start();
  }
});

resetBtn.addEventListener('click', () => {
  transcriptionText.value = '';
  recordings = [];
  currentRecording = '';
  updateUndoButton();
});

undoBtn.addEventListener('click', () => {
  if (recordings.length > 0) {
    recordings.pop();
    updateTranscriptionText();
  }
  updateUndoButton();
});

function updateTranscriptionText() {
  transcriptionText.value = recordings.join('\n') + (currentRecording ? '\n' + currentRecording : '');
}

function updateUndoButton() {
  undoBtn.disabled = recordings.length === 0;
}

updateUndoButton();

// New function to handle clinical note generation
generateNoteBtn.addEventListener('click', async () => {
  const fullTranscript = recordings.join('\n') + (currentRecording ? '\n' + currentRecording : '');
  const prompt = `This is a transcript from a provider and patient conversation:\n\n"${fullTranscript}"\n\nPlease generate a clinical note including HPI, review of systems, physical exam, and assessment and plan. Do not include anything that was not discussed in the conversation. If the recording does not appear to be a provider/patient conversation, state that.`;

  loadingIndicator.style.display = 'block';
  generateNoteBtn.disabled = true;
  outputText.value = '';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });
    
    const data = await response.json();

    // Set the new output
    outputText.value = data.choices[0].message.content || "No output received.";
  } catch (error) {
    outputText.value = "Error generating clinical note. Please try again.";
  } finally {
    // Hide loading indicator and re-enable the button after processing
    loadingIndicator.style.display = 'none';
    generateNoteBtn.disabled = false;
  }
});