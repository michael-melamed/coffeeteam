/**
 * CoffeeTeam Pro - Voice Recognition
 * Hebrew speech recognition and menu parsing
 */

const Voice = {
  recognition: null,
  isListening: false,
  currentTranscript: '',
  
  // Callbacks
  onResult: null,
  onError: null,
  onEnd: null,

  // Menu items for recognition
  menu: {
    drinks: {
      'הפוך': '☕ הפוך',
      'אספרסו': '☕ אספרסו',
      'אמריקנו': '☕ אמריקנו',
      'קפוצינו': '☕ קפוצ\'ינו',
      'קפוצ\'ינו': '☕ קפוצ\'ינו',
      'לאטה': '☕ לאטה',
      'מקיאטו': '☕ מקיאטו',
      'מוקה': '☕ מוקה',
      'שחור': '☕ קפה שחור',
      'קפה': '☕ קפה',
      'טורקי': '☕ קפה טורקי',
      'נס': '☕ נס קפה'
    },
    
    modifiers: {
      'דל': '📉 דל',
      'כפול': '📊 כפול',
      'פעמיים': '📊 פעמיים',
      'שלוש': '📊 שלוש',
      'טריפל': '📊 טריפל',
      'גדול': '📏 גדול',
      'בינוני': '📏 בינוני',
      'קטן': '📏 קטן',
      'רגיל': '📏 רגיל',
      'חזק': '💪 חזק',
      'חלש': '💧 חלש'
    },
    
    milk: {
      'שקדים': '🥛 חלב שקדים',
      'סויה': '🥛 חלב סויה',
      'מפורק': '🥛 חלב מפורק',
      'קוקוס': '🥛 חלב קוקוס',
      'שיבולת': '🥛 חלב שיבולת שועל',
      'חלב': '🥛 חלב',
      'ללא חלב': '🚫 ללא חלב',
      'בלי חלב': '🚫 ללא חלב'
    },
    
    extras: {
      'סירופ': '🍯 סירופ',
      'וניל': '🍯 וניל',
      'קרמל': '🍯 קרמל',
      'שוקולד': '🍫 שוקולד',
      'קצפת': '🍦 קצפת',
      'קינמון': '✨ קינמון',
      'קקאו': '🍫 קקאו',
      'דבש': '🍯 דבש',
      'סוכר': '🧂 סוכר',
      'ממתיק': '🧂 ממתיק',
      'סטיביה': '🌿 סטיביה'
    },
    
    temperature: {
      'קר': '🧊 קר',
      'קפוא': '🧊 קפוא',
      'פושר': '🌡️ פושר',
      'חם': '🔥 חם',
      'רותח': '🔥 רותח'
    }
  },

  /**
   * Initialize speech recognition
   */
  init() {
    // Check browser support
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.error('[Voice] Speech recognition not supported');
      return false;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configuration
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'he-IL';
      this.recognition.maxAlternatives = 1;

      // Event handlers
      this.recognition.onresult = (event) => this.handleResult(event);
      this.recognition.onerror = (event) => this.handleError(event);
      this.recognition.onend = () => this.handleEnd();
      this.recognition.onstart = () => console.log('[Voice] Started');

      console.log('[Voice] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Voice] Initialization failed:', error);
      return false;
    }
  },

  /**
   * Start listening
   */
  start() {
    if (!this.recognition) {
      console.error('[Voice] Recognition not initialized');
      return false;
    }

    if (this.isListening) {
      console.warn('[Voice] Already listening');
      return false;
    }

    try {
      this.isListening = true;
      this.currentTranscript = '';
      this.recognition.start();
      console.log('[Voice] Listening started');
      return true;
    } catch (error) {
      console.error('[Voice] Start failed:', error);
      this.isListening = false;
      return false;
    }
  },

  /**
   * Stop listening
   */
  stop() {
    if (!this.recognition) {
      return false;
    }

    try {
      this.isListening = false;
      this.recognition.stop();
      console.log('[Voice] Listening stopped');
      return true;
    } catch (error) {
      console.error('[Voice] Stop failed:', error);
      return false;
    }
  },

  /**
   * Handle recognition results
   */
  handleResult(event) {
    let transcript = '';
    
    // Combine all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      transcript += result[0].transcript;
    }

    this.currentTranscript = transcript.trim();
    
    // Callback
    if (this.onResult && transcript) {
      this.onResult(this.currentTranscript);
    }
  },

  /**
   * Handle recognition errors
   */
  handleError(event) {
    console.error('[Voice] Error:', event.error);
    
    this.isListening = false;
    
    if (this.onError) {
      this.onError(event.error);
    }
  },

  /**
   * Handle recognition end
   */
  handleEnd() {
    console.log('[Voice] Recognition ended');
    
    // Auto-restart if still listening
    if (this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('[Voice] Restart failed:', error);
        this.isListening = false;
      }
    }
    
    if (this.onEnd) {
      this.onEnd();
    }
  },

  /**
   * Parse transcript into structured order
   */
  parse(text) {
    const lower = text.toLowerCase().trim();
    
    const parsed = {
      drink: null,
      modifiers: [],
      milk: null,
      extras: [],
      temperature: null,
      raw: text
    };

    // Find drink
    for (const [keyword, value] of Object.entries(this.menu.drinks)) {
      if (lower.includes(keyword.toLowerCase())) {
        parsed.drink = value;
        break;
      }
    }

    // Find modifiers
    for (const [keyword, value] of Object.entries(this.menu.modifiers)) {
      if (lower.includes(keyword.toLowerCase())) {
        if (!parsed.modifiers.includes(value)) {
          parsed.modifiers.push(value);
        }
      }
    }

    // Find milk
    for (const [keyword, value] of Object.entries(this.menu.milk)) {
      if (lower.includes(keyword.toLowerCase())) {
        parsed.milk = value;
        break;
      }
    }

    // Find extras
    for (const [keyword, value] of Object.entries(this.menu.extras)) {
      if (lower.includes(keyword.toLowerCase())) {
        if (!parsed.extras.includes(value)) {
          parsed.extras.push(value);
        }
      }
    }

    // Find temperature
    for (const [keyword, value] of Object.entries(this.menu.temperature)) {
      if (lower.includes(keyword.toLowerCase())) {
        parsed.temperature = value;
        break;
      }
    }

    return parsed;
  },

  /**
   * Format parsed order into display items
   */
  formatParsed(parsed) {
    const items = [];

    if (parsed.drink) items.push(parsed.drink);
    if (parsed.modifiers.length) items.push(...parsed.modifiers);
    if (parsed.temperature) items.push(parsed.temperature);
    if (parsed.milk) items.push(parsed.milk);
    if (parsed.extras.length) items.push(...parsed.extras);

    return items;
  },

  /**
   * Check if recognition is supported
   */
  isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }
};

console.log('[Voice] Module loaded');