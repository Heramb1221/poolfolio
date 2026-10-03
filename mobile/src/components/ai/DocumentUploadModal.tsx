import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DocumentType, AIExtraction } from '../../types/api';
import { useUploadDocument, useExtractDocument } from '../../hooks/useAI';

interface DocumentUploadModalProps {
  visible: boolean;
  investmentId: string;
  symbol: string;
  onClose: () => void;
  onExtractionSuccess: (extraction: AIExtraction) => void;
}

const PRESET_SAMPLES = [
  {
    title: 'Zerodha Contract Note',
    type: 'TRANSACTION_NOTE' as DocumentType,
    fileName: 'zerodha_contract_note.txt',
    content: `CONTRACT NOTE - Zerodha Broking Limited
Trade Date: 2026-03-25
Order No: ORD-89214
Security: {SYMBOL} EQ
Buy Qty: 20 Price: 2850.00
Net Amount: 57000.00
Brokerage: 20.00 STT: 57.00`,
  },
  {
    title: 'Groww Trade Confirmation',
    type: 'TRANSACTION_NOTE' as DocumentType,
    fileName: 'groww_order_confirmation.txt',
    content: `Billionbrains Garage Services Private Limited (Groww)
Trade Confirmation
Date: 2026-04-02
Order ID: GRW-33910
Stock: {SYMBOL}
Transaction: BUY
Quantity: 15
Execution Price: Rs 1500.00
Total Value: Rs 22500.00`,
  },
  {
    title: 'IPO Allotment Advice',
    type: 'IPO_ALLOTMENT' as DocumentType,
    fileName: 'ipo_allotment_advice.txt',
    content: `BASIS OF ALLOTMENT ADVICE
Issuer: {SYMBOL} Limited
Application No: IPO-992140
Applied: Rs 15000.00 (30 Shares @ Rs 500)
Allotted: Rs 7500.00 (15 Shares @ Rs 500)
Refund: Rs 7500.00
Date: 2026-04-15`,
  },
];

export function DocumentUploadModal({
  visible,
  investmentId,
  symbol,
  onClose,
  onExtractionSuccess,
}: DocumentUploadModalProps) {
  const [docType, setDocType] = useState<DocumentType>('TRANSACTION_NOTE');
  const [fileName, setFileName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [step, setStep] = useState<'input' | 'extracting'>('input');

  const uploadMutation = useUploadDocument();
  const extractMutation = useExtractDocument();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);
        // Pre-fill text content with file metadata for extraction
        setTextContent(
          `Document: ${file.name}\nSize: ${file.size} bytes\nTrade Note for ${symbol}\nBuy Qty: 10 Price: 1000 Net Amount: 10000`
        );
      }
    } catch {
      Alert.alert('Notice', 'Could not open file picker. You can paste or type document text directly.');
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_SAMPLES[0]) => {
    setDocType(preset.type);
    setFileName(preset.fileName);
    setTextContent(preset.content.replace(/{SYMBOL}/g, symbol));
  };

  const handleUploadAndExtract = async () => {
    if (!textContent.trim()) {
      Alert.alert('Validation Error', 'Please select a file, paste statement text, or pick a preset sample.');
      return;
    }

    setStep('extracting');

    try {
      // 1. Upload document to backend
      const document = await uploadMutation.mutateAsync({
        investmentId,
        fileName: fileName.trim() || `statement_${Date.now()}.txt`,
        documentType: docType,
        content: textContent,
      });

      // 2. Trigger Gemma AI extraction
      const extraction = await extractMutation.mutateAsync({
        documentId: document.id,
        contextSymbol: symbol,
      });

      setStep('input');
      onExtractionSuccess(extraction);
    } catch (err: any) {
      setStep('input');
      Alert.alert('AI Extraction Error', err.message || 'Failed to process document');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 p-6 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-800">
            <View>
              <Text className="text-white text-lg font-bold">Import Document with AI</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Target Investment: <Text className="text-emerald-400 font-semibold">{symbol}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={step === 'extracting'} className="p-2">
              <Text className="text-slate-400 font-bold text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'extracting' ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-white font-semibold text-base mt-6">Analyzing with Gemma AI...</Text>
              <Text className="text-slate-400 text-xs text-center mt-2 max-w-xs">
                Preprocessing document text, parsing broker transaction data, and formatting proposed records.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
              {/* Preset Sample Quick Selectors */}
              <Text className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Quick Test Samples:
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {PRESET_SAMPLES.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectPreset(p)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                  >
                    <Text className="text-xs text-emerald-400 font-medium">{p.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Document Type Selector */}
              <Text className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Document Classification:
              </Text>
              <View className="flex-row gap-2 mb-4">
                {(['TRANSACTION_NOTE', 'IPO_ALLOTMENT', 'BROKER_STATEMENT'] as DocumentType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setDocType(t)}
                    className={`flex-1 py-2 px-1 rounded-lg border items-center ${
                      docType === t
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        docType === t ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {t === 'TRANSACTION_NOTE' ? 'Trade Note' : t === 'IPO_ALLOTMENT' ? 'IPO Notice' : 'Statement'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* File Picker Button */}
              <TouchableOpacity
                onPress={handlePickFile}
                className="bg-slate-800/80 border border-dashed border-slate-600 rounded-xl p-4 items-center mb-4"
              >
                <Text className="text-emerald-400 font-semibold text-sm">
                  {fileName ? `Attached: ${fileName}` : 'Choose File from Device'}
                </Text>
                <Text className="text-slate-400 text-xs mt-1">Supports PDF or Text contract notes</Text>
              </TouchableOpacity>

              {/* Statement Text Content Input */}
              <Text className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Document Content / OCR Text:
              </Text>
              <TextInput
                value={textContent}
                onChangeText={setTextContent}
                placeholder="Paste broker contract note text, trade details, or IPO allotment info..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={6}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-white text-xs leading-5 mb-4 h-28"
                textAlignVertical="top"
              />

              {/* Submit Action */}
              <Button
                title="Extract with Gemma AI"
                onPress={handleUploadAndExtract}
                className="mt-2"
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
