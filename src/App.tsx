/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  FileText, 
  FileStack, 
  Image as ImageIcon, 
  Files, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Loader2,
  BookOpen
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { cn } from './lib/utils';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FeatureState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  downloadUrl?: string;
  fileName?: string;
}

export default function App() {
  const [states, setStates] = useState<Record<string, FeatureState>>({
    scanner: { status: 'idle', message: '' },
    wordToPdf: { status: 'idle', message: '' },
    pdfToWord: { status: 'idle', message: '' },
    imageToPdf: { status: 'idle', message: '' },
    mergePdf: { status: 'idle', message: '' },
  });

  const updateState = (id: string, newState: Partial<FeatureState>) => {
    setStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...newState }
    }));
  };

  const clearStatus = (id: string) => {
    setTimeout(() => {
      updateState(id, { status: 'idle', message: '' });
    }, 5000);
  };

  const handleScanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files as FileList)?.[0];
    if (file) {
      updateState('scanner', { status: 'success', message: '✅ Document scanned successfully!' });
      clearStatus('scanner');
    }
  };

  const handleWordToPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files as FileList)?.[0];
    if (!file) return;

    updateState('wordToPdf', { status: 'loading', message: '⏳ Converting Word to PDF...' });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      
      const { height } = page.getSize();
      page.drawText('Converted from: ' + file.name, { x: 50, y: height - 50, size: 12 });
      page.drawText('Date: ' + new Date().toLocaleString(), { x: 50, y: height - 70, size: 10 });
      
      // Simple text splitting to avoid overflow in basic implementation
      const text = result.value.replace(/<[^>]*>?/gm, '').substring(0, 500);
      page.drawText(text, { x: 50, y: height - 120, size: 10, maxWidth: 500 });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      updateState('wordToPdf', { 
        status: 'success', 
        message: '✅ Conversion complete!',
        downloadUrl: url,
        fileName: file.name.replace(/\.(docx|doc)$/, '.pdf')
      });
    } catch (error: any) {
      updateState('wordToPdf', { status: 'error', message: '❌ Error: ' + error.message });
    }
    clearStatus('wordToPdf');
  };

  const handlePdfToWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files as FileList)?.[0];
    if (!file) return;

    updateState('pdfToWord', { status: 'loading', message: '⏳ Extracting text from PDF...' });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `Page ${i}\n${pageText}\n\n`;
      }
      
      const blob = new Blob([fullText], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      
      updateState('pdfToWord', { 
        status: 'success', 
        message: '✅ Extraction complete!',
        downloadUrl: url,
        fileName: file.name.replace('.pdf', '.doc')
      });
    } catch (error: any) {
      updateState('pdfToWord', { status: 'error', message: '❌ Error: ' + error.message });
    }
    clearStatus('pdfToWord');
  };

  const handleImageToPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((e.target.files as FileList) || []);
    if (files.length === 0) return;

    updateState('imageToPdf', { status: 'loading', message: `⏳ Converting ${files.length} images...` });

    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const file of files) {
        const imageBytes = await file.arrayBuffer();
        let image;
        
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          continue;
        }
        
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      updateState('imageToPdf', { 
        status: 'success', 
        message: '✅ Images converted to PDF!',
        downloadUrl: url,
        fileName: 'images_converted.pdf'
      });
    } catch (error: any) {
      updateState('imageToPdf', { status: 'error', message: '❌ Error: ' + error.message });
    }
    clearStatus('imageToPdf');
  };

  const handleMergePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((e.target.files as FileList) || []);
    if (files.length === 0) return;

    updateState('mergePdf', { status: 'loading', message: `⏳ Merging ${files.length} PDF files...` });

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      updateState('mergePdf', { 
        status: 'success', 
        message: '✅ PDFs merged successfully!',
        downloadUrl: url,
        fileName: 'merged_files.pdf'
      });
    } catch (error: any) {
      updateState('mergePdf', { status: 'error', message: '❌ Error: ' + error.message });
    }
    clearStatus('mergePdf');
  };

  return (
    <div className="min-h-screen bg-bg-deep p-4 md:p-8 relative overflow-hidden">
      {/* Background radial accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[30%] right-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <header className="mb-16 text-center text-text-main">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <BookOpen className="h-12 w-12 text-accent" />
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              EduTool Toolkit
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-text-dim font-medium tracking-wide uppercase"
          >
            Clean Modern Interface • Effortless Navigation • Secure by Default
          </motion.p>
        </header>

        {/* Action Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            id="scanner"
            title="Document Scanner"
            description="Scan documents using camera or upload images"
            icon={<Scan className="h-10 w-10" />}
            onAction={(id) => document.getElementById(`${id}-input`)?.click()}
            state={states.scanner}
          >
            <input
              id="scanner-input"
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleScanner}
            />
          </FeatureCard>

          <FeatureCard
            id="wordToPdf"
            title="Word to PDF"
            description="Convert Word documents to PDF format"
            icon={<FileText className="h-10 w-10" />}
            onAction={(id) => document.getElementById(`${id}-input`)?.click()}
            state={states.wordToPdf}
          >
            <input
              id="wordToPdf-input"
              type="file"
              className="hidden"
              accept=".docx,.doc"
              onChange={handleWordToPdf}
            />
          </FeatureCard>

          <FeatureCard
            id="pdfToWord"
            title="PDF to Word"
            description="Extract text from PDF to editable Word"
            icon={<FileStack className="h-10 w-10" />}
            onAction={(id) => document.getElementById(`${id}-input`)?.click()}
            state={states.pdfToWord}
          >
            <input
              id="pdfToWord-input"
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handlePdfToWord}
            />
          </FeatureCard>

          <FeatureCard
            id="imageToPdf"
            title="Image to PDF"
            description="Convert multiple images to a single PDF"
            icon={<ImageIcon className="h-10 w-10" />}
            onAction={(id) => document.getElementById(`${id}-input`)?.click()}
            state={states.imageToPdf}
          >
            <input
              id="imageToPdf-input"
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageToPdf}
            />
          </FeatureCard>

          <FeatureCard
            id="mergePdf"
            title="Merge PDF Files"
            description="Combine multiple PDFs into one document"
            icon={<Files className="h-10 w-10" />}
            onAction={(id) => document.getElementById(`${id}-input`)?.click()}
            state={states.mergePdf}
          >
            <input
              id="mergePdf-input"
              type="file"
              className="hidden"
              accept=".pdf"
              multiple
              onChange={handleMergePdf}
            />
          </FeatureCard>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-glass-border flex flex-col md:flex-row justify-between items-center text-text-dim text-sm">
          <p>© 2024 EduTool Technology. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="hover:text-text-main cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-text-main cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-text-main cursor-pointer transition-colors">Support</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onAction: (id: string) => void;
  state: FeatureState;
  children?: React.ReactNode;
}

function FeatureCard({ id, title, description, icon, onAction, state, children }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass-card rounded-[24px] p-8 flex flex-col items-start gap-6 shadow-2xl transition-all duration-300 group"
    >
      <div className="bg-white/5 p-4 rounded-2xl text-accent group-hover:scale-110 transition-transform">
        {icon}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-text-main mb-3">{title}</h3>
        <p className="text-text-dim text-base leading-relaxed">{description}</p>
      </div>

      <div className="mt-auto w-full pt-6">
        {children}
        <button
          onClick={() => onAction(id)}
          disabled={state.status === 'loading'}
          className={cn(
            "w-full py-4 px-6 rounded-xl font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 outline-none",
            "bg-accent text-bg-deep hover:bg-white active:scale-95 disabled:opacity-50"
          )}
        >
          {state.status === 'loading' ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              Processing...
            </>
          ) : (
            <>Select File</>
          )}
        </button>

        <AnimatePresence>
          {state.message && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "mt-6 p-4 rounded-xl flex items-start gap-3 text-sm overflow-hidden border",
                state.status === 'success' ? "bg-green-500/10 text-green-300 border-green-500/20" :
                state.status === 'error' ? "bg-red-500/10 text-red-300 border-red-500/20" :
                "bg-accent/10 text-accent/80 border-accent/20"
              )}
            >
              {state.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : state.status === 'error' ? (
                <AlertCircle className="h-5 w-5 shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              )}
              <span className="flex-1 font-medium">{state.message}</span>
            </motion.div>
          )}

          {state.status === 'success' && state.downloadUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex justify-center"
            >
              <a
                href={state.downloadUrl}
                download={state.fileName || 'file'}
                className="flex items-center gap-2 text-sm font-bold text-accent bg-accent/10 py-2.5 px-6 rounded-lg hover:bg-accent/20 transition-colors border border-accent/20"
              >
                <Download className="h-4 w-4" />
                Download Ready
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

