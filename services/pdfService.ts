
/**
 * Neural Worker Service
 * Offloads heavy computational tasks (PDF extraction, JSON parsing, schema normalization) 
 * to a background thread to maintain 60fps UI performance.
 */

export enum WorkerTask {
  EXTRACT_TEXT = 'EXTRACT_TEXT',
  NORMALIZE_QUESTIONS = 'NORMALIZE_QUESTIONS'
}

interface WorkerMessage {
  task: WorkerTask;
  payload: any;
}

interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  data?: any;
  message?: string;
  progress?: number;
}

export async function runNeuralTask(task: WorkerTask, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const workerCode = `
      // Mock DOM environment for PDF.js to prevent "document is not defined" error
      // when it falls back to a fake worker in the background thread.
      self.window = self;
      self.document = {
        createElement: (name) => {
          return {
            getContext: () => ({
              fillText: () => {},
              measureText: () => ({ width: 0 }),
            }),
            style: {},
          };
        },
        documentElement: { style: {} },
        getElementsByTagName: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
      };

      importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

      // Helper for normalization (Inlined from questionAnalyzer logic)
      const normalizeToQuestionSchema = (raw) => {
        const q = { ...raw };
        const questionText = q.questionText || q.question || '';
        let normalizedOptions = [];
        if (Array.isArray(q.options)) {
          normalizedOptions = q.options.map(String);
        } else if (typeof q.options === 'object' && q.options !== null) {
          normalizedOptions = Object.values(q.options).map(String);
        }

        if (q.type === 'assertion_reason' && normalizedOptions.length === 0) {
          normalizedOptions = [
            "Both Assertion and Reason are true and Reason is the correct explanation",
            "Both Assertion and Reason are true but Reason is NOT the correct explanation",
            "Assertion is true but Reason is false",
            "Assertion is false but Reason is true"
          ];
        }

        const columnA = Array.isArray(q.columnA) ? q.columnA.map(String) : [];
        const columnB = Array.isArray(q.columnB) ? q.columnB.map(String) : [];
        let correctMatches = q.correctMatches || {};

        return {
          id: q.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7)),
          type: q.type || 'mcq',
          questionText,
          options: normalizedOptions,
          correctAnswer: q.correctAnswer || '',
          columnA,
          columnB,
          correctMatches,
          topic: q.topic || 'General Science',
          subtopic: q.subtopic || '',
          difficulty: q.difficulty || 'medium',
          pattern: q.pattern || (q.type === 'assertion_reason' ? 'logical' : 'conceptual'),
          explanation: q.explanation || 'Consult Neural Engine for breakdown.',
          hint: q.hint || 'No hint provided.'
        };
      };

      self.onmessage = async (e) => {
        const { task, payload } = e.data;

        try {
          if (task === 'EXTRACT_TEXT') {
            const pdfjsLib = self['pdfjs-dist/build/pdf'];
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const loadingTask = pdfjsLib.getDocument({ data: payload });
            const pdf = await loadingTask.promise;
            
            let extractedText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageStrings = textContent.items.map((item) => item.str || '').join(' ');
              extractedText += pageStrings + '\\n';
              
              // Report progress to main thread
              self.postMessage({ type: 'PROGRESS', progress: Math.round((i / pdf.numPages) * 100) });
            }
            self.postMessage({ type: 'SUCCESS', data: extractedText });

          } else if (task === 'NORMALIZE_QUESTIONS') {
            const rawData = typeof payload === 'string' ? JSON.parse(payload) : payload;
            const normalized = Array.isArray(rawData) ? rawData.map(normalizeToQuestionSchema) : [];
            self.postMessage({ type: 'SUCCESS', data: normalized });
          }
        } catch (error) {
          self.postMessage({ type: 'ERROR', message: error.toString() });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (event) => {
      const { type, data, message, progress } = event.data as WorkerResponse;
      
      if (type === 'SUCCESS') {
        resolve(data);
        cleanup();
      } else if (type === 'ERROR') {
        reject(new Error(message));
        cleanup();
      } else if (type === 'PROGRESS') {
        // Optional: Could bubble up progress events if UI had a bar
        // console.log(`Neural Worker Progress: ${progress}%`);
      }
    };

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    if (payload instanceof ArrayBuffer) {
      worker.postMessage({ task, payload }, [payload]);
    } else {
      worker.postMessage({ task, payload });
    }
  });
}

/**
 * Legacy wrapper for compatibility
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return runNeuralTask(WorkerTask.EXTRACT_TEXT, arrayBuffer);
}
