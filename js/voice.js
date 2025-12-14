const Voice = {
  recognition: null,
  isListening: false,
  currentTranscript: '',
  onResult: () => {},
  onError: () => {},

  init() {
    if (!('webkitSpeechRecognition' in window)) {
      UI.toast('זיהוי קולי זמין רק ב-Chrome/Edge', 'error');
      return false;
    }
    this.recognition = new webkitSpeechRecognition();
    this.recognition.lang = 'he-IL';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.currentTranscript = transcript;
      if (event.results[event.results.length - 1].isFinal && this.currentTranscript) {
        this.onResult(this.currentTranscript);
      }
    };

    this.recognition.onerror = (event) => this.onError(event.error);
    this.recognition.onend = () => { this.isListening = false; UI.hide('#listening-indicator'); };

    return true;
  },

  start() {
    if (this.isListening) return;
    this.isListening = true;
    UI.show('#listening-indicator');
    this.recognition.start();
  },

  stop() {
    this.isListening = false;
    this.recognition.stop();
    UI.hide('#listening-indicator');
  },

  parse(text) {
    const settings = Storage.getSettings();
    const parsed = { drink: '', size: '', milk: '', extras: [] };
    const words = text.toLowerCase().split(/\s+/);

    // Match keywords with confidence (simple word count match)
    Object.keys(settings.drinks).forEach(key => {
      if (words.includes(key.toLowerCase())) parsed.drink = settings.drinks[key];
    });
    Object.keys(settings.sizes).forEach(key => {
      if (words.includes(key.toLowerCase())) parsed.size = settings.sizes[key];
    });
    Object.keys(settings.milks).forEach(key => {
      if (words.includes(key.toLowerCase())) parsed.milk = settings.milks[key];
    });
    Object.keys(settings.extras).forEach(key => {
      if (words.includes(key.toLowerCase())) parsed.extras.push(settings.extras[key]);
    });

    // Confidence: % of matched words
    const confidence = (Object.values(parsed).filter(v => v).length / 4) * 100;
    if (confidence < 50) return null; // Low confidence, prompt manual

    return { ...parsed, text: text, confidence };
  },

  formatParsed(parsed) {
    let display = `${parsed.drink || ''} ${parsed.size || ''} ${parsed.milk || ''} ${parsed.extras.join(' ')}`;
    return display.trim() || 'לא זוהה';
  }
};